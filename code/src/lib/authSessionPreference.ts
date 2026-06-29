import { env } from "./env";

const KEEP_SIGNED_IN_STORAGE_KEY = "artblock-keep-signed-in";
const AUTH_STORAGE_SUFFIXES = ["", "-user", "-code-verifier"] as const;

const getBrowserStorage = (kind: "localStorage" | "sessionStorage") => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window[kind];
  } catch {
    return null;
  }
};

const getAuthStorageKey = () => {
  if (!env.supabaseUrl) {
    return "supabase-auth-token";
  }

  try {
    const hostname = new URL(env.supabaseUrl).hostname;
    return `sb-${hostname.split(".")[0]}-auth-token`;
  } catch {
    return "supabase-auth-token";
  }
};

export const readKeepSignedInPreference = () => {
  const storage = getBrowserStorage("localStorage");

  if (!storage) {
    return true;
  }

  try {
    const stored = storage.getItem(KEEP_SIGNED_IN_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
};

const writeKeepSignedInPreference = (value: boolean) => {
  const storage = getBrowserStorage("localStorage");

  if (!storage) {
    return;
  }

  try {
    storage.setItem(KEEP_SIGNED_IN_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage write failures and keep auth functional.
  }
};

const getPreferredStorage = () =>
  readKeepSignedInPreference()
    ? getBrowserStorage("localStorage")
    : getBrowserStorage("sessionStorage");

const getSecondaryStorage = () =>
  readKeepSignedInPreference()
    ? getBrowserStorage("sessionStorage")
    : getBrowserStorage("localStorage");

export const applyKeepSignedInPreference = (value: boolean) => {
  const targetStorage = value
    ? getBrowserStorage("localStorage")
    : getBrowserStorage("sessionStorage");
  const sourceStorage = value
    ? getBrowserStorage("sessionStorage")
    : getBrowserStorage("localStorage");
  const authStorageKey = getAuthStorageKey();

  if (targetStorage && sourceStorage) {
    AUTH_STORAGE_SUFFIXES.forEach((suffix) => {
      const key = `${authStorageKey}${suffix}`;

      try {
        const payload = sourceStorage.getItem(key);

        if (payload !== null) {
          targetStorage.setItem(key, payload);
          sourceStorage.removeItem(key);
        }
      } catch {
        // Ignore migration failures and keep the current runtime session alive.
      }
    });
  }

  writeKeepSignedInPreference(value);
};

export const authSessionStorage = {
  getItem(key: string) {
    const storage = getPreferredStorage();

    if (!storage) {
      return null;
    }

    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    const storage = getPreferredStorage();
    const secondaryStorage = getSecondaryStorage();

    try {
      storage?.setItem(key, value);
      secondaryStorage?.removeItem(key);
    } catch {
      // Ignore storage write failures and rely on the in-memory session.
    }
  },
  removeItem(key: string) {
    const storage = getPreferredStorage();
    const secondaryStorage = getSecondaryStorage();

    try {
      storage?.removeItem(key);
      secondaryStorage?.removeItem(key);
    } catch {
      // Ignore storage removal failures.
    }
  }
};
