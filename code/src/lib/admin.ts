import { getSupabaseClient } from "./supabase";
import type { Database } from "./supabase.types";
import type { AdminPostRecord, AdminStats, AdminUserRecord, Campaign } from "../types/admin";

const SYSTEM_VERIFY_CAMPAIGN_ID = "system-verify-account";

const mapCampaign = (row: Database["public"]["Tables"]["campaigns"]["Row"]): Campaign => ({
  id: row.id,
  name: row.name,
  image_url: row.image_url,
  destination_url: row.destination_url,
  cta_label: row.cta_label,
  open_in_new_tab: row.open_in_new_tab,
  desktop_enabled: row.desktop_enabled,
  feed_enabled: row.feed_enabled,
  priority: row.priority,
  is_active: row.is_active,
  starts_at: row.starts_at,
  ends_at: row.ends_at,
  created_by: row.created_by,
  updated_by: row.updated_by,
  created_at: row.created_at,
  updated_at: row.updated_at,
  is_system: false,
  system_key: null
});

const defaultVerifyCampaign: Campaign = {
  id: SYSTEM_VERIFY_CAMPAIGN_ID,
  name: "Verify account",
  image_url: "https://res.cloudinary.com/dc3qprub3/image/upload/v1782807440/verify-poster_fmafob.webp",
  destination_url: "/dashboard#verification",
  cta_label: "Verify account",
  open_in_new_tab: false,
  desktop_enabled: true,
  feed_enabled: true,
  priority: 0,
  is_active: true,
  starts_at: null,
  ends_at: null,
  created_by: null,
  updated_by: null,
  created_at: "2026-06-30T00:00:00.000Z",
  updated_at: "2026-06-30T00:00:00.000Z",
  is_system: true,
  system_key: "verify-account"
};

const withDefaultCampaign = (campaigns: Campaign[]) => {
  const withoutSystemVerify = campaigns.filter((campaign) => campaign.id !== SYSTEM_VERIFY_CAMPAIGN_ID);
  return [defaultVerifyCampaign, ...withoutSystemVerify].sort((left, right) => left.priority - right.priority);
};

export const isSystemCampaign = (campaign: Pick<Campaign, "id" | "is_system">) =>
  campaign.is_system === true || campaign.id === SYSTEM_VERIFY_CAMPAIGN_ID;

export const isCampaignActiveNow = (campaign: Pick<Campaign, "is_active" | "starts_at" | "ends_at">, now = new Date()) => {
  if (!campaign.is_active) {
    return false;
  }

  const startsAt = campaign.starts_at ? new Date(campaign.starts_at) : null;
  const endsAt = campaign.ends_at ? new Date(campaign.ends_at) : null;

  if (startsAt && startsAt > now) {
    return false;
  }

  if (endsAt && endsAt < now) {
    return false;
  }

  return true;
};

export const isExternalDestination = (value: string) => /^https?:\/\//i.test(value);

export const fetchActiveCampaigns = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: withDefaultCampaign([]), error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: withDefaultCampaign([]), error: error.message };
  }

  return {
    data: withDefaultCampaign(
      ((data ?? []) as Database["public"]["Tables"]["campaigns"]["Row"][])
        .map(mapCampaign)
        .filter((campaign) => isCampaignActiveNow(campaign))
    ),
    error: null
  };
};

export const fetchAdminCampaigns = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: withDefaultCampaign([]), error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return { data: withDefaultCampaign([]), error: error.message };
  }

  return {
    data: withDefaultCampaign(
      ((data ?? []) as Database["public"]["Tables"]["campaigns"]["Row"][]).map(mapCampaign)
    ),
    error: null
  };
};

export const uploadCampaignImage = async (adminId: string, file: File) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${adminId}/campaign-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("campaign-media").upload(path, file, { upsert: true });

  if (error) {
    return { data: null, error: error.message };
  }

  const { data } = supabase.storage.from("campaign-media").getPublicUrl(path);
  return { data: data.publicUrl, error: null };
};

type CampaignMutationInput = Pick<
  Campaign,
  | "name"
  | "image_url"
  | "destination_url"
  | "cta_label"
  | "open_in_new_tab"
  | "desktop_enabled"
  | "feed_enabled"
  | "priority"
  | "is_active"
  | "starts_at"
  | "ends_at"
> & { id?: string };

export const saveCampaign = async (adminId: string, input: CampaignMutationInput) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  if (input.id === SYSTEM_VERIFY_CAMPAIGN_ID) {
    return { error: "Built-in campaigns cannot be edited." };
  }

  if (input.id) {
    const payload: Database["public"]["Tables"]["campaigns"]["Update"] = {
      name: input.name,
      image_url: input.image_url,
      destination_url: input.destination_url,
      cta_label: input.cta_label,
      open_in_new_tab: input.open_in_new_tab,
      desktop_enabled: input.desktop_enabled,
      feed_enabled: input.feed_enabled,
      priority: input.priority,
      is_active: input.is_active,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      updated_by: adminId
    };

    const { error } = await (supabase.from("campaigns") as never as {
      update: (
        values: Database["public"]["Tables"]["campaigns"]["Update"]
      ) => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    })
      .update(payload)
      .eq("id", input.id);
    return { error: error?.message ?? null };
  }

  const payload: Database["public"]["Tables"]["campaigns"]["Insert"] = {
    name: input.name,
    image_url: input.image_url,
    destination_url: input.destination_url,
    cta_label: input.cta_label,
    open_in_new_tab: input.open_in_new_tab,
    desktop_enabled: input.desktop_enabled,
    feed_enabled: input.feed_enabled,
    priority: input.priority,
    is_active: input.is_active,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    created_by: adminId,
    updated_by: adminId
  };

  const { error } = await (supabase.from("campaigns") as never as {
    insert: (
      values: Database["public"]["Tables"]["campaigns"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  }).insert(payload);

  return { error: error?.message ?? null };
};

export const deleteCampaign = async (campaignId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  if (campaignId === SYSTEM_VERIFY_CAMPAIGN_ID) {
    return { error: "Built-in campaigns cannot be deleted." };
  }

  const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
  return { error: error?.message ?? null };
};

export const fetchAdminStats = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      data: {
        totalUsers: 0,
        totalAdmins: 0,
        totalCreators: 0,
        totalVisitors: 0,
        blockedUsers: 0,
        verifiedArtists: 0,
        totalPosts: 0,
        totalCampaigns: 0,
        activeCampaigns: 0
      } satisfies AdminStats,
      error: "Supabase is not configured."
    };
  }

  const [profilesResponse, blockedResponse, postsResponse, campaignsResponse] = await Promise.all([
    supabase.from("profiles").select("role, is_verified_artist"),
    supabase.from("user_settings").select("profile_id", { count: "exact", head: true }).not("deactivated_at", "is", null),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("campaigns").select("*")
  ]);

  if (profilesResponse.error) {
    return { data: null, error: profilesResponse.error.message };
  }

  if (blockedResponse.error) {
    return { data: null, error: blockedResponse.error.message };
  }

  if (postsResponse.error) {
    return { data: null, error: postsResponse.error.message };
  }

  if (campaignsResponse.error) {
    return { data: null, error: campaignsResponse.error.message };
  }

  const profileRows = (profilesResponse.data ?? []) as {
    role: Database["public"]["Enums"]["app_role"];
    is_verified_artist: boolean | null;
  }[];
  const campaignRows = ((campaignsResponse.data ?? []) as Database["public"]["Tables"]["campaigns"]["Row"][]).map(mapCampaign);

  return {
    data: {
      totalUsers: profileRows.length,
      totalAdmins: profileRows.filter((row) => row.role === "admin").length,
      totalCreators: profileRows.filter((row) => row.role === "creator").length,
      totalVisitors: profileRows.filter((row) => row.role === "visitor").length,
      blockedUsers: Number(blockedResponse.count ?? 0),
      verifiedArtists: profileRows.filter((row) => Boolean(row.is_verified_artist)).length,
      totalPosts: Number(postsResponse.count ?? 0),
      totalCampaigns: campaignRows.length + 1,
      activeCampaigns: campaignRows.filter((row) => isCampaignActiveNow(row)).length + 1
    } satisfies AdminStats,
    error: null
  };
};

export const fetchAdminUsers = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as AdminUserRecord[], error: "Supabase is not configured." };
  }

  const [profilesResponse, settingsResponse, creatorsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, username, is_verified_artist, created_at, updated_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_settings")
      .select("profile_id, deactivated_at, profile_visibility"),
    supabase
      .from("creator_profiles")
      .select("id, slug, is_published")
  ]);

  if (profilesResponse.error) {
    return { data: [] as AdminUserRecord[], error: profilesResponse.error.message };
  }

  if (settingsResponse.error) {
    return { data: [] as AdminUserRecord[], error: settingsResponse.error.message };
  }

  if (creatorsResponse.error) {
    return { data: [] as AdminUserRecord[], error: creatorsResponse.error.message };
  }

  const settingsMap = new Map(
    ((settingsResponse.data ?? []) as Pick<Database["public"]["Tables"]["user_settings"]["Row"], "profile_id" | "deactivated_at" | "profile_visibility">[])
      .map((row) => [row.profile_id, row])
  );
  const creatorsMap = new Map(
    ((creatorsResponse.data ?? []) as Pick<Database["public"]["Tables"]["creator_profiles"]["Row"], "id" | "slug" | "is_published">[])
      .map((row) => [row.id, row])
  );

  return {
    data: ((profilesResponse.data ?? []) as Database["public"]["Tables"]["profiles"]["Row"][]).map((row) => {
      const settings = settingsMap.get(row.id);
      const creator = creatorsMap.get(row.id);

      return {
        id: row.id,
        email: row.email,
        full_name: row.full_name,
        role: row.role,
        username: row.username,
        is_verified_artist: row.is_verified_artist,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deactivated_at: settings?.deactivated_at ?? null,
        profile_visibility: settings?.profile_visibility ?? null,
        creator_slug: creator?.slug ?? null,
        creator_is_published: Boolean(creator?.is_published)
      } satisfies AdminUserRecord;
    }),
    error: null
  };
};

export const updateAdminUserBlockState = async (profileId: string, shouldBlock: boolean) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.from("user_settings") as never as {
    update: (
      values: Database["public"]["Tables"]["user_settings"]["Update"]
    ) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  })
    .update({
      deactivated_at: shouldBlock ? new Date().toISOString() : null
    })
    .eq("profile_id", profileId);

  return { error: error?.message ?? null };
};

export const fetchAdminPosts = async (limit = 40) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as AdminPostRecord[], error: "Supabase is not configured." };
  }

  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (postsError) {
    return { data: [] as AdminPostRecord[], error: postsError.message };
  }

  const posts = (postsData ?? []) as Database["public"]["Tables"]["posts"]["Row"][];

  if (posts.length === 0) {
    return { data: [] as AdminPostRecord[], error: null };
  }

  const postIds = posts.map((post) => post.id);
  const authorIds = Array.from(new Set(posts.map((post) => post.author_id)));

  const [profilesResponse, statsResponse] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role").in("id", authorIds),
    supabase.from("post_engagement_stats").select("*").in("post_id", postIds)
  ]);

  if (profilesResponse.error) {
    return { data: [] as AdminPostRecord[], error: profilesResponse.error.message };
  }

  if (statsResponse.error) {
    return { data: [] as AdminPostRecord[], error: statsResponse.error.message };
  }

  const profilesMap = new Map(
    ((profilesResponse.data ?? []) as Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name" | "role">[])
      .map((row) => [row.id, row])
  );
  const statsMap = new Map(
    ((statsResponse.data ?? []) as Database["public"]["Views"]["post_engagement_stats"]["Row"][])
      .filter((row) => row.post_id)
      .map((row) => [
        row.post_id!,
        {
          like_count: Number(row.like_count ?? 0),
          comment_count: Number(row.comment_count ?? 0)
        }
      ])
  );

  return {
    data: posts.map((post) => {
      const author = profilesMap.get(post.author_id);
      const stats = statsMap.get(post.id);

      return {
        id: post.id,
        author_id: post.author_id,
        author_name: author?.full_name ?? "Unknown user",
        author_role: author?.role ?? "visitor",
        post_type: post.post_type,
        title: post.title,
        body: post.body,
        caption: post.caption,
        media_url: post.media_url,
        is_published: post.is_published,
        is_pinned: post.is_pinned,
        created_at: post.created_at,
        updated_at: post.updated_at,
        like_count: stats?.like_count ?? 0,
        comment_count: stats?.comment_count ?? 0
      } satisfies AdminPostRecord;
    }),
    error: null
  };
};

export const updateAdminPost = async (
  postId: string,
  input: Pick<
    Database["public"]["Tables"]["posts"]["Update"],
    "title" | "body" | "caption" | "is_published" | "is_pinned"
  >
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.from("posts") as never as {
    update: (
      values: Database["public"]["Tables"]["posts"]["Update"]
    ) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  })
    .update(input)
    .eq("id", postId);
  return { error: error?.message ?? null };
};

export const deleteAdminPost = async (postId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  return { error: error?.message ?? null };
};
