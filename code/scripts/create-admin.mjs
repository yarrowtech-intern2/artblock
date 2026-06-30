import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const parseEnvFile = (filepath) => {
  if (!fs.existsSync(filepath)) {
    return {};
  }

  return fs
    .readFileSync(filepath, "utf8")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return acc;
      }

      const equalsIndex = trimmed.indexOf("=");

      if (equalsIndex < 0) {
        return acc;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      const rawValue = trimmed.slice(equalsIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      acc[key] = value;
      return acc;
    }, {});
};

const fileEnv = parseEnvFile(path.resolve(process.cwd(), ".env"));
const env = { ...fileEnv, ...process.env };

const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@gmail.com";
const adminPassword = env.ADMIN_BOOTSTRAP_PASSWORD ?? "12345678";
const adminName = env.ADMIN_BOOTSTRAP_NAME ?? "ArtBlock Admin";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to the environment before running this script."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const waitForProfile = async (profileId, retries = 10) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", profileId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data?.id) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return false;
};

const promoteProfileToAdmin = async (profileId) => {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: adminName,
      role: "admin"
    })
    .eq("id", profileId);

  if (error) {
    throw new Error(error.message);
  }
};

const { count: existingAdminCount, error: adminCountError } = await supabase
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .eq("role", "admin");

if (adminCountError) {
  throw new Error(adminCountError.message);
}

const { data: existingProfile, error: profileLookupError } = await supabase
  .from("profiles")
  .select("id, role")
  .eq("email", adminEmail)
  .maybeSingle();

if (profileLookupError) {
  throw new Error(profileLookupError.message);
}

if ((existingAdminCount ?? 0) > 0 && existingProfile?.role !== "admin") {
  throw new Error("An admin already exists. Refusing to create or promote another admin automatically.");
}

let adminUserId = existingProfile?.id ?? null;

if (adminUserId) {
  const { error: updateUserError } = await supabase.auth.admin.updateUserById(adminUserId, {
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminName
    }
  });

  if (updateUserError) {
    throw new Error(updateUserError.message);
  }
} else {
  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      full_name: adminName
    }
  });

  if (createUserError || !createdUser.user?.id) {
    throw new Error(createUserError?.message ?? "Admin user creation failed.");
  }

  adminUserId = createdUser.user.id;
  const profileReady = await waitForProfile(adminUserId);

  if (!profileReady) {
    throw new Error("Admin auth user was created, but the matching profile row did not appear in time.");
  }
}

await promoteProfileToAdmin(adminUserId);

console.log("Admin account ready.");
console.log(`Email: ${adminEmail}`);
console.log(`Password: ${adminPassword}`);
