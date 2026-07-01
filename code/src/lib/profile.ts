import { getSupabaseClient } from "./supabase";
import type { AppRole, Database, FeedPostType, PostSurface, StoryMediaKind } from "./supabase.types";
import type {
  DirectMessage,
  FeedComment,
  FeedPost,
  InboxThread,
  InteractionPermission,
  NotificationItem,
  PollOption,
  ProfileConnectionItem,
  ProfileRelationshipState,
  PublicProfile,
  PublicCreatorProfile,
  ProfileVisibility,
  ShortPost,
  StoryGroup,
  StoryItem,
  StoryViewReceipt,
  UserSettings
} from "../types/auth";

export const createSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const renderFormattedText = (value: string) => {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withFormatting = escaped
    .replace(/\+\+(.+?)\+\+/g, "<u>$1</u>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

  const paragraphs = withFormatting
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("- ")) {
        const items = block
          .split("\n")
          .map((line) => line.replace(/^- /, "").trim())
          .filter(Boolean)
          .map((line) => `<li>${line}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      return `<p>${block.replace(/\n/g, "<br />")}</p>`;
    });

  return paragraphs.join("");
};

const asTable = <T>(value: T) => value;

const DEFAULT_PROFILE_VISIBILITY: ProfileVisibility = "public";
const DEFAULT_INTERACTION_PERMISSION: InteractionPermission = "everyone";

const buildDefaultUserSettings = (profileId: string): UserSettings => ({
  profile_id: profileId,
  keep_me_signed_in: true,
  profile_visibility: DEFAULT_PROFILE_VISIBILITY,
  message_permissions: DEFAULT_INTERACTION_PERMISSION,
  comment_permissions: DEFAULT_INTERACTION_PERMISSION,
  notify_new_followers: true,
  notify_new_subscribers: true,
  notify_new_messages: true,
  notify_post_likes: true,
  notify_post_comments: true,
  deactivated_at: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString()
});

const mapUserSettings = (
  row: Database["public"]["Tables"]["user_settings"]["Row"] | null,
  profileId: string
): UserSettings =>
  row
    ? {
        profile_id: row.profile_id,
        keep_me_signed_in: row.keep_me_signed_in,
        profile_visibility: row.profile_visibility,
        message_permissions: row.message_permissions,
        comment_permissions: row.comment_permissions,
        notify_new_followers: row.notify_new_followers,
        notify_new_subscribers: row.notify_new_subscribers,
        notify_new_messages: row.notify_new_messages,
        notify_post_likes: row.notify_post_likes,
        notify_post_comments: row.notify_post_comments,
        deactivated_at: row.deactivated_at,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    : buildDefaultUserSettings(profileId);

const mapPublicProfile = (
  row: Database["public"]["Views"]["public_member_profiles"]["Row"]
): PublicProfile | null => {
  if (!row.id || !row.full_name || !row.role) {
    return null;
  }

  return {
    id: row.id,
    full_name: row.full_name,
    is_verified_artist: Boolean(row.is_verified_artist),
    verified_artist_at: row.verified_artist_at,
    username: row.username,
    avatar_url: row.avatar_url,
    cover_url: row.cover_url,
    gender: row.gender,
    bio: row.bio,
    website: row.website,
    location: row.location,
    role: row.role,
    creator_slug: row.creator_slug,
    headline: row.headline,
    about: row.about,
    featured_quote: row.featured_quote,
    profile_visibility: (row.profile_visibility ?? DEFAULT_PROFILE_VISIBILITY) as ProfileVisibility,
    message_permissions:
      (row.message_permissions ?? DEFAULT_INTERACTION_PERMISSION) as InteractionPermission,
    viewer_can_message: Boolean(row.viewer_can_message),
    follower_count: Number(row.follower_count ?? 0),
    following_count: Number(row.following_count ?? 0),
    subscriber_count: Number(row.subscriber_count ?? 0),
    post_count: Number(row.post_count ?? 0)
  };
};

const fetchProfileRoleMap = async (profileIds: string[]) => {
  const supabase = getSupabaseClient();
  const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));

  if (!supabase || uniqueProfileIds.length === 0) {
    return new Map<string, AppRole>();
  }

  const { data, error } = await supabase
    .from("public_member_profiles")
    .select("id, role")
    .in("id", uniqueProfileIds);

  if (error) {
    return new Map<string, AppRole>();
  }

  return new Map(
    (((data ?? []) as Pick<Database["public"]["Views"]["public_member_profiles"]["Row"], "id" | "role">[])
      .filter((row) => row.id && row.role)
      .map((row) => [row.id!, row.role!]))
  );
};

const mapProfileConnectionItem = (
  row: Database["public"]["Views"]["public_member_profiles"]["Row"]
): ProfileConnectionItem | null => {
  if (!row.id || !row.full_name || !row.role) {
    return null;
  }

  return {
    id: row.id,
    full_name: row.full_name,
    role: row.role,
    is_verified_artist: Boolean(row.is_verified_artist),
    username: row.username,
    avatar_url: row.avatar_url,
    creator_slug: row.creator_slug,
    headline: row.headline
  };
};

const fetchProfileConnectionItemsByIds = async (profileIds: string[]) => {
  const supabase = getSupabaseClient();
  const uniqueProfileIds = Array.from(new Set(profileIds.filter(Boolean)));

  if (!supabase) {
    return { data: [] as ProfileConnectionItem[], error: "Supabase is not configured." };
  }

  if (uniqueProfileIds.length === 0) {
    return { data: [] as ProfileConnectionItem[], error: null };
  }

  const { data, error } = await supabase
    .from("public_member_profiles")
    .select("id, full_name, role, is_verified_artist, username, avatar_url, creator_slug, headline")
    .in("id", uniqueProfileIds);

  if (error) {
    return { data: [] as ProfileConnectionItem[], error: error.message };
  }

  return {
    data: ((data ?? []) as Database["public"]["Views"]["public_member_profiles"]["Row"][])
      .map(mapProfileConnectionItem)
      .filter((item): item is ProfileConnectionItem => Boolean(item)),
    error: null
  };
};

export const updateProfile = async (
  userId: string,
  input: Pick<
    Database["public"]["Tables"]["profiles"]["Update"],
    | "full_name"
    | "username"
    | "bio"
    | "website"
    | "location"
    | "avatar_url"
    | "cover_url"
    | "gender"
  >
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const payload: Database["public"]["Tables"]["profiles"]["Update"] = input;

  const { error } = await supabase.from("profiles").update(payload as never).eq("id", userId);

  return { error: error?.message ?? null };
};

export const convertProfileToCreator = async (desiredSlug?: string | null) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await (supabase.rpc as never as (
    fn: "convert_profile_to_creator",
    args: Database["public"]["Functions"]["convert_profile_to_creator"]["Args"]
  ) => Promise<{
    data:
      | Database["public"]["Functions"]["convert_profile_to_creator"]["Returns"]
      | null;
    error: { message: string } | null;
  }>)("convert_profile_to_creator", {
    desired_slug: desiredSlug ?? null
  });

  const entry = data?.[0] ?? null;

  return {
    data: entry,
    error: error?.message ?? null
  };
};

export const createArtistVerificationOrder = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.functions.invoke("create-artist-verification-order", {
    body: {}
  });

  return {
    data: (data ?? null) as
      | {
          orderId: string;
          amount: number;
          currency: string;
          keyId: string;
          profileName: string;
        }
      | null,
    error:
      (typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : null) ??
      error?.message ??
      null
  };
};

export const verifyArtistVerificationPayment = async (input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.functions.invoke("verify-artist-verification-payment", {
    body: input
  });

  return {
    data: (data ?? null) as { verified: boolean } | null,
    error:
      (typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : null) ??
      error?.message ??
      null
  };
};

export const createArtistTipOrder = async (input: {
  postId: string;
  recipientId: string;
  amountRupees: number;
  message?: string | null;
}) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.functions.invoke("create-artist-tip-order", {
    body: input
  });

  return {
    data: (data ?? null) as
      | {
          orderId: string;
          amount: number;
          currency: string;
          keyId: string;
          recipientName: string;
        }
      | null,
    error:
      (typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : null) ??
      error?.message ??
      null
  };
};

export const verifyArtistTipPayment = async (input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.functions.invoke("verify-artist-tip-payment", {
    body: input
  });

  return {
    data: (data ?? null) as { verified: boolean } | null,
    error:
      (typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : null) ??
      error?.message ??
      null
  };
};

export const manageOwnAccountLifecycle = async (action: "deactivate" | "delete") => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.functions.invoke("manage-account-lifecycle", {
    body: {
      action
    }
  });

  return {
    error:
      (typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : null) ??
      error?.message ??
      null
  };
};

export const upsertCreatorProfile = async (
  userId: string,
  input: Pick<
    Database["public"]["Tables"]["creator_profiles"]["Insert"],
    "slug" | "headline" | "about" | "featured_quote" | "is_published"
  >
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const payload: Database["public"]["Tables"]["creator_profiles"]["Insert"] = {
    id: userId,
    ...input
  };

  const { error } = await (supabase.from("creator_profiles") as never as {
    upsert: (
      values: Database["public"]["Tables"]["creator_profiles"]["Insert"],
      options: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  }).upsert(payload, {
    onConflict: "id"
  });

  return { error: error?.message ?? null };
};

export const fetchOwnCreatorProfile = async (userId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return {
    data: data as Database["public"]["Tables"]["creator_profiles"]["Row"] | null,
    error: error?.message ?? null
  };
};

export const fetchPublicCreatorProfile = async (slug: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("public_creator_profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!data || error) {
    return { data: null, error: error?.message ?? "Creator profile not found." };
  }

  return {
    data: {
      ...(data as PublicCreatorProfile),
      profile_visibility:
        (((data as Database["public"]["Views"]["public_creator_profiles"]["Row"]).profile_visibility ??
          DEFAULT_PROFILE_VISIBILITY) as ProfileVisibility)
    },
    error: null
  };
};

export const fetchPublicProfileById = async (profileId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("public_member_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  const mapped = data
    ? mapPublicProfile(data as Database["public"]["Views"]["public_member_profiles"]["Row"])
    : null;

  return {
    data: mapped,
    error: error?.message ?? (mapped ? null : "Profile not found.")
  };
};

export const fetchPublicProfileBySlug = async (slug: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("public_member_profiles")
    .select("*")
    .eq("creator_slug", slug)
    .maybeSingle();

  const mapped = data
    ? mapPublicProfile(data as Database["public"]["Views"]["public_member_profiles"]["Row"])
    : null;

  return {
    data: mapped,
    error: error?.message ?? (mapped ? null : "Profile not found.")
  };
};

export const fetchOwnUserSettings = async (profileId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      data: buildDefaultUserSettings(profileId),
      error: "Supabase is not configured."
    };
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  return {
    data: mapUserSettings(
      (data as Database["public"]["Tables"]["user_settings"]["Row"] | null) ?? null,
      profileId
    ),
    error: error?.message ?? null
  };
};

export const updateOwnUserSettings = async (
  profileId: string,
  input: Partial<
    Pick<
      Database["public"]["Tables"]["user_settings"]["Update"],
      | "keep_me_signed_in"
      | "profile_visibility"
      | "message_permissions"
      | "comment_permissions"
      | "notify_new_followers"
      | "notify_new_subscribers"
      | "notify_new_messages"
      | "notify_post_likes"
      | "notify_post_comments"
    >
  >
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const payload: Database["public"]["Tables"]["user_settings"]["Insert"] = {
    profile_id: profileId,
    ...input
  };

  const { error } = await (supabase.from("user_settings") as never as {
    upsert: (
      values: Database["public"]["Tables"]["user_settings"]["Insert"],
      options: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  }).upsert(payload, {
    onConflict: "profile_id"
  });

  return { error: error?.message ?? null };
};

export const fetchProfileRelationshipState = async (viewerId: string, targetId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      data: { is_following: false, is_subscribed: false } satisfies ProfileRelationshipState,
      error: "Supabase is not configured."
    };
  }

  const [followResponse, subscriptionResponse] = await Promise.all([
    supabase
      .from("profile_follows")
      .select("followed_id")
      .eq("follower_id", viewerId)
      .eq("followed_id", targetId)
      .maybeSingle(),
    supabase
      .from("creator_subscriptions")
      .select("creator_id")
      .eq("subscriber_id", viewerId)
      .eq("creator_id", targetId)
      .maybeSingle()
  ]);

  return {
    data: {
      is_following: Boolean(followResponse.data),
      is_subscribed: Boolean(subscriptionResponse.data)
    } satisfies ProfileRelationshipState,
    error: followResponse.error?.message ?? subscriptionResponse.error?.message ?? null
  };
};

export const toggleFollowProfile = async (
  viewerId: string,
  targetId: string,
  currentlyFollowing: boolean
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  if (currentlyFollowing) {
    const { error } = await supabase
      .from("profile_follows")
      .delete()
      .eq("follower_id", viewerId)
      .eq("followed_id", targetId);

    return { error: error?.message ?? null };
  }

  const { error } = await (supabase.from("profile_follows") as never as {
    insert: (
      values: Database["public"]["Tables"]["profile_follows"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  }).insert({
    follower_id: viewerId,
    followed_id: targetId
  });

  return { error: error?.message ?? null };
};

export const toggleCreatorSubscription = async (
  viewerId: string,
  targetId: string,
  currentlySubscribed: boolean
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  if (currentlySubscribed) {
    const { error } = await supabase
      .from("creator_subscriptions")
      .delete()
      .eq("subscriber_id", viewerId)
      .eq("creator_id", targetId);

    return { error: error?.message ?? null };
  }

  const { error } = await (supabase.from("creator_subscriptions") as never as {
    insert: (
      values: Database["public"]["Tables"]["creator_subscriptions"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  }).insert({
    subscriber_id: viewerId,
    creator_id: targetId
  });

  return { error: error?.message ?? null };
};

export const fetchProfileFollowers = async (targetId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as ProfileConnectionItem[], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("profile_follows")
    .select("follower_id, created_at")
    .eq("followed_id", targetId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as ProfileConnectionItem[], error: error.message };
  }

  const relations = (data ?? []) as Pick<Database["public"]["Tables"]["profile_follows"]["Row"], "follower_id" | "created_at">[];
  const orderedIds = relations.map((row) => row.follower_id);
  const profilesResult = await fetchProfileConnectionItemsByIds(orderedIds);

  if (profilesResult.error) {
    return profilesResult;
  }

  const profileMap = new Map(profilesResult.data.map((item) => [item.id, item]));

  return {
    data: orderedIds.map((id) => profileMap.get(id)).filter((item): item is ProfileConnectionItem => Boolean(item)),
    error: null
  };
};

export const fetchProfileSubscribers = async (targetId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as ProfileConnectionItem[], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("creator_subscriptions")
    .select("subscriber_id, created_at")
    .eq("creator_id", targetId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as ProfileConnectionItem[], error: error.message };
  }

  const relations =
    (data ?? []) as Pick<Database["public"]["Tables"]["creator_subscriptions"]["Row"], "subscriber_id" | "created_at">[];
  const orderedIds = relations.map((row) => row.subscriber_id);
  const profilesResult = await fetchProfileConnectionItemsByIds(orderedIds);

  if (profilesResult.error) {
    return profilesResult;
  }

  const profileMap = new Map(profilesResult.data.map((item) => [item.id, item]));

  return {
    data: orderedIds.map((id) => profileMap.get(id)).filter((item): item is ProfileConnectionItem => Boolean(item)),
    error: null
  };
};

export const fetchStoryViewReceipts = async (storyId: string, authorId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as StoryViewReceipt[], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("story_views")
    .select("viewer_id, viewed_at")
    .eq("story_id", storyId)
    .order("viewed_at", { ascending: false });

  if (error) {
    return {
      data: [] as StoryViewReceipt[],
      error: mapStoriesSchemaError(getSupabaseErrorText(error) || error.message || "Unable to load story viewers.")
    };
  }

  const relations = ((data ?? []) as Pick<Database["public"]["Tables"]["story_views"]["Row"], "viewer_id" | "viewed_at">[])
    .filter((row) => row.viewer_id !== authorId);
  const orderedIds = relations.map((row) => row.viewer_id);
  const profilesResult = await fetchProfileConnectionItemsByIds(orderedIds);

  if (profilesResult.error) {
    return { data: [] as StoryViewReceipt[], error: profilesResult.error };
  }

  const profileMap = new Map(profilesResult.data.map((item) => [item.id, item]));

  return {
    data: relations
      .map((row) => {
        const profile = profileMap.get(row.viewer_id);

        if (!profile) {
          return null;
        }

        return {
          ...profile,
          viewed_at: row.viewed_at
        } satisfies StoryViewReceipt;
      })
      .filter((item): item is StoryViewReceipt => Boolean(item)),
    error: null
  };
};

export const openDirectThread = async (peerId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await (supabase.rpc as never as (
    fn: "open_direct_thread",
    args: Database["public"]["Functions"]["open_direct_thread"]["Args"]
  ) => Promise<{ data: string | null; error: { message: string } | null }>)("open_direct_thread", {
    peer_id: peerId
  });

  return {
    data: typeof data === "string" ? data : null,
    error: error?.message ?? null
  };
};

export const fetchInboxThreads = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as InboxThread[], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("direct_thread_previews")
    .select("*")
    .order("last_message_created_at", { ascending: false });

  if (error) {
    return { data: [] as InboxThread[], error: error.message };
  }

  return {
    data: ((data ?? []) as Database["public"]["Views"]["direct_thread_previews"]["Row"][])
      .filter((row) => row.thread_id && row.peer_id && row.peer_full_name && row.peer_role)
      .map(
        (row) =>
          ({
            thread_id: row.thread_id!,
            peer_id: row.peer_id!,
            peer_full_name: row.peer_full_name!,
            peer_is_verified_artist: Boolean(row.peer_is_verified_artist),
            peer_username: row.peer_username,
            peer_avatar_url: row.peer_avatar_url,
            peer_role: row.peer_role!,
            last_message_body: row.last_message_body,
            last_message_created_at: row.last_message_created_at,
            unread_count: Number(row.unread_count ?? 0),
            message_count: Number(row.message_count ?? 0)
          }) satisfies InboxThread
      ),
    error: null
  };
};

export const fetchUnreadMessageCount = async (userId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: 0, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("direct_thread_members")
    .select("unread_count")
    .eq("user_id", userId);

  if (error) {
    return { data: 0, error: error.message };
  }

  return {
    data: ((data ?? []) as { unread_count: number }[]).reduce(
      (sum, row) => sum + Number(row.unread_count ?? 0),
      0
    ),
    error: null
  };
};

export const fetchNotifications = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as NotificationItem[], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("notification_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as NotificationItem[], error: error.message };
  }

  const notificationRows = ((data ?? []) as Database["public"]["Views"]["notification_items"]["Row"][]).filter(
    (row) =>
      row.id &&
      row.recipient_id &&
      row.type &&
      row.title &&
      row.body &&
      row.created_at &&
      row.is_read !== null
  );
  const roleMap = await fetchProfileRoleMap(
    notificationRows.map((row) => row.actor_id).filter((value): value is string => Boolean(value))
  );

  return {
    data: notificationRows.map(
      (row) =>
        ({
          id: row.id!,
          recipient_id: row.recipient_id!,
          actor_id: row.actor_id,
          type: row.type!,
          title: row.title!,
          body: row.body!,
          link: row.link,
          is_read: row.is_read!,
          created_at: row.created_at!,
          actor_full_name: row.actor_full_name,
          actor_role: row.actor_id ? roleMap.get(row.actor_id) ?? "visitor" : null,
          actor_is_verified_artist: Boolean(row.actor_is_verified_artist),
          actor_username: row.actor_username,
          actor_avatar_url: row.actor_avatar_url
        }) satisfies NotificationItem
    ),
    error: null
  };
};

export const fetchUnreadNotificationsCount = async (userId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: 0, error: "Supabase is not configured." };
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false)
    .neq("type", "new_message");

  return {
    data: Number(count ?? 0),
    error: error?.message ?? null
  };
};

export const fetchDirectMessages = async (threadId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as DirectMessage[], error: "Supabase is not configured." };
  }

  const { data, error } = await supabase
    .from("direct_message_entries")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [] as DirectMessage[], error: error.message };
  }

  const messageRows = ((data ?? []) as Database["public"]["Views"]["direct_message_entries"]["Row"][]).filter(
    (row) =>
      row.id &&
      row.thread_id &&
      row.sender_id &&
      row.body &&
      row.created_at &&
      row.full_name
  );
  const roleMap = await fetchProfileRoleMap(messageRows.map((row) => row.sender_id!));

  return {
    data: messageRows.map(
      (row) =>
        ({
          id: row.id!,
          thread_id: row.thread_id!,
          sender_id: row.sender_id!,
          body: row.body!,
          created_at: row.created_at!,
          full_name: row.full_name!,
          sender_role: roleMap.get(row.sender_id!) ?? "visitor",
          is_verified_artist: Boolean(row.is_verified_artist),
          username: row.username,
          avatar_url: row.avatar_url
        }) satisfies DirectMessage
    ),
    error: null
  };
};

export const sendDirectMessage = async (threadId: string, senderId: string, body: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.from("direct_messages") as never as {
    insert: (
      values: Database["public"]["Tables"]["direct_messages"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  }).insert({
    thread_id: threadId,
    sender_id: senderId,
    body
  });

  return { error: error?.message ?? null };
};

export const markThreadRead = async (threadId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.rpc as never as (
    fn: "mark_thread_read",
    args: Database["public"]["Functions"]["mark_thread_read"]["Args"]
  ) => Promise<{ data: null; error: { message: string } | null }>)("mark_thread_read", {
    target_thread_id: threadId
  });

  return { error: error?.message ?? null };
};

export const markNotificationRead = async (notificationId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.rpc as never as (
    fn: "mark_notification_read",
    args: Database["public"]["Functions"]["mark_notification_read"]["Args"]
  ) => Promise<{ data: null; error: { message: string } | null }>)("mark_notification_read", {
    target_notification_id: notificationId
  });

  return { error: error?.message ?? null };
};

export const markAllNotificationsRead = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.rpc as never as (
    fn: "mark_all_notifications_read",
    args: Database["public"]["Functions"]["mark_all_notifications_read"]["Args"]
  ) => Promise<{ data: null; error: { message: string } | null }>)(
    "mark_all_notifications_read",
    {}
  );

  return { error: error?.message ?? null };
};

const uploadProfileImage = async (userId: string, file: File, imageType: "avatar" | "cover") => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${imageType}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });

  if (error) {
    return { data: null, error: error.message };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { data: data.publicUrl, error: null };
};

export const uploadAvatar = async (userId: string, file: File) =>
  uploadProfileImage(userId, file, "avatar");

export const uploadCoverImage = async (userId: string, file: File) =>
  uploadProfileImage(userId, file, "cover");

const uploadBucketMedia = async (
  userId: string,
  file: File,
  bucket: string,
  prefix: string
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${prefix}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });

  if (error) {
    return { data: null, error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { data: { publicUrl: data.publicUrl, path }, error: null };
};

export const uploadPostMedia = async (userId: string, file: File) =>
  uploadBucketMedia(userId, file, "post-media", "post");

export const uploadStoryMedia = async (userId: string, file: File) =>
  uploadBucketMedia(userId, file, "post-media", "story");

type CreateFeedPostInput = {
  postType: FeedPostType;
  surface?: PostSurface;
  title?: string | null;
  body?: string | null;
  plainBody?: string | null;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaStoragePath?: string | null;
  thumbnailStoragePath?: string | null;
  mediaDurationSeconds?: number | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  compressionStatus?: "original" | "compressed";
  tipEnabled?: boolean;
  isPublished?: boolean;
  pollOptions?: string[];
};

type CreateStoryInput = {
  mediaKind: StoryMediaKind;
  mediaUrl: string;
  mediaStoragePath?: string | null;
  thumbnailUrl?: string | null;
  thumbnailStoragePath?: string | null;
  body?: string | null;
  mediaDurationSeconds?: number | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  compressionStatus?: "original" | "compressed";
  expiresAt?: string;
};

type SupabaseErrorLike = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

const SHORTS_MIGRATION_FILE = "20260630_shorts_reels_and_tips.sql";
const STORIES_MIGRATION_FILE = "20260701_stories.sql";

const getSupabaseErrorText = (error: SupabaseErrorLike | null | undefined) =>
  [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" ");

const getSchemaCacheIdentifiers = (errorText: string) =>
  Array.from(errorText.toLowerCase().matchAll(/'([^']+)'/g), (match) =>
    match[1].replace(/^public\./, "")
  );

const isMissingSchemaCacheColumn = (errorText: string, columnName: string) =>
  errorText.toLowerCase().includes("schema cache") &&
  getSchemaCacheIdentifiers(errorText).includes(columnName.toLowerCase());

const isMissingSchemaCacheRelation = (errorText: string, relationName: string) =>
  errorText.toLowerCase().includes("schema cache") &&
  getSchemaCacheIdentifiers(errorText).includes(relationName.toLowerCase());

const isShortsSchemaMissingError = (errorText: string) =>
  [
    "compression_status",
    "surface",
    "thumbnail_url",
    "media_storage_path",
    "thumbnail_storage_path",
    "media_duration_seconds",
    "media_width",
    "media_height",
    "tip_enabled"
  ].some((columnName) => isMissingSchemaCacheColumn(errorText, columnName)) ||
  isMissingSchemaCacheRelation(errorText, "short_posts");

const isStoriesSchemaMissingError = (errorText: string) =>
  [
    "stories",
    "story_views",
    "active_stories",
    "media_kind",
    "expires_at"
  ].some((relationOrColumn) =>
    isMissingSchemaCacheRelation(errorText, relationOrColumn) ||
    isMissingSchemaCacheColumn(errorText, relationOrColumn)
  );

const mapShortsSchemaError = (errorText: string) =>
  isShortsSchemaMissingError(errorText)
    ? `Shorts/Reels is not enabled in Supabase yet. Apply the ${SHORTS_MIGRATION_FILE} migration and refresh the API schema cache.`
    : errorText;

const mapStoriesSchemaError = (errorText: string) =>
  isStoriesSchemaMissingError(errorText)
    ? `Stories is not enabled in Supabase yet. Apply the ${STORIES_MIGRATION_FILE} migration and refresh the API schema cache.`
    : errorText;

const shouldRetryLegacyFeedInsert = (input: CreateFeedPostInput, errorText: string) =>
  (input.surface ?? "feed") === "feed" && isShortsSchemaMissingError(errorText);

const buildLegacyFeedPostPayload = (
  userId: string,
  input: CreateFeedPostInput
): Database["public"]["Tables"]["posts"]["Insert"] => ({
  author_id: userId,
  post_type: input.postType,
  title: input.title ?? null,
  body: input.body ?? null,
  media_url: input.mediaUrl ?? null,
  caption:
    input.postType === "image" || input.postType === "video"
      ? input.plainBody ?? input.body ?? null
      : null,
  is_published: input.isPublished ?? true
});

export const createFeedPost = async (userId: string, input: CreateFeedPostInput) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const payload: Database["public"]["Tables"]["posts"]["Insert"] = {
    author_id: userId,
    post_type: input.postType,
    surface: input.surface ?? "feed",
    title: input.title ?? null,
    body: input.body ?? null,
    media_url: input.mediaUrl ?? null,
    thumbnail_url: input.thumbnailUrl ?? null,
    media_storage_path: input.mediaStoragePath ?? null,
    thumbnail_storage_path: input.thumbnailStoragePath ?? null,
    media_duration_seconds: input.mediaDurationSeconds ?? null,
    media_width: input.mediaWidth ?? null,
    media_height: input.mediaHeight ?? null,
    compression_status: input.compressionStatus ?? "original",
    tip_enabled: input.tipEnabled ?? true,
    caption: input.postType === "image" || input.postType === "video" ? input.plainBody ?? input.body ?? null : null,
    is_published: input.isPublished ?? true
  };

  const insertPost = async (values: Database["public"]["Tables"]["posts"]["Insert"]) =>
    await (supabase.from("posts") as never as {
      insert: (
        payload: Database["public"]["Tables"]["posts"]["Insert"]
      ) => {
        select: (columns: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: SupabaseErrorLike | null;
          }>;
        };
      };
    })
      .insert(values)
      .select("id")
      .single();

  let { data, error } = await insertPost(payload);
  const errorText = getSupabaseErrorText(error);

  if ((error || !data) && shouldRetryLegacyFeedInsert(input, errorText)) {
    ({ data, error } = await insertPost(buildLegacyFeedPostPayload(userId, input)));
  }

  if (error || !data) {
    const finalErrorText = getSupabaseErrorText(error) || "Unable to create post.";
    return {
      error: (input.surface ?? "feed") === "short" ? mapShortsSchemaError(finalErrorText) : finalErrorText
    };
  }

  if (input.postType === "poll" && input.pollOptions && input.pollOptions.length > 0) {
    const optionsPayload = input.pollOptions.map((label, index) => ({
      post_id: data.id,
      label,
      position: index
    }));

    const { error: optionsError } = await (supabase.from("post_poll_options") as never as {
      insert: (
        values: Database["public"]["Tables"]["post_poll_options"]["Insert"][]
      ) => Promise<{ error: { message: string } | null }>;
    }).insert(optionsPayload);

    if (optionsError) {
      return { error: optionsError.message };
    }
  }

  return { error: null };
};

export const createStory = async (userId: string, input: CreateStoryInput) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const payload: Database["public"]["Tables"]["stories"]["Insert"] = {
    author_id: userId,
    media_kind: input.mediaKind,
    media_url: input.mediaUrl,
    media_storage_path: input.mediaStoragePath ?? null,
    thumbnail_url: input.thumbnailUrl ?? null,
    thumbnail_storage_path: input.thumbnailStoragePath ?? null,
    body: input.body ?? null,
    media_duration_seconds: input.mediaDurationSeconds ?? null,
    media_width: input.mediaWidth ?? null,
    media_height: input.mediaHeight ?? null,
    compression_status: input.compressionStatus ?? "original",
    expires_at: input.expiresAt ?? undefined
  };

  const { error } = await (supabase.from("stories") as never as {
    insert: (
      values: Database["public"]["Tables"]["stories"]["Insert"]
    ) => Promise<{ error: SupabaseErrorLike | null }>;
  }).insert(payload);

  return {
    error: error ? mapStoriesSchemaError(getSupabaseErrorText(error) || "Unable to create story.") : null
  };
};

export const markStoryViewed = async (storyId: string, viewerId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.from("story_views") as never as {
    upsert: (
      values: Database["public"]["Tables"]["story_views"]["Insert"],
      options: { onConflict: string }
    ) => Promise<{ error: SupabaseErrorLike | null }>;
  }).upsert(
    {
      story_id: storyId,
      viewer_id: viewerId
    },
    {
      onConflict: "story_id,viewer_id"
    }
  );

  return {
    error: error ? mapStoriesSchemaError(getSupabaseErrorText(error) || "Unable to mark story as viewed.") : null
  };
};

export const togglePostLike = async (postId: string, userId: string, currentlyLiked: boolean) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  if (currentlyLiked) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId)
      .eq("reaction_type", "like");

    return { error: error?.message ?? null };
  }

  const { error } = await (supabase.from("post_reactions") as never as {
    insert: (
      values: Database["public"]["Tables"]["post_reactions"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  }).insert({
    post_id: postId,
    user_id: userId,
    reaction_type: "like"
  });

  return { error: error?.message ?? null };
};

export const togglePostSave = async (postId: string, userId: string, currentlySaved: boolean) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  if (currentlySaved) {
    const { error } = await supabase
      .from("post_bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);

    return { error: error?.message ?? null };
  }

  const { error } = await (supabase.from("post_bookmarks") as never as {
    insert: (
      values: Database["public"]["Tables"]["post_bookmarks"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  }).insert({
    post_id: postId,
    user_id: userId
  });

  return { error: error?.message ?? null };
};

export const recordPostShare = async (
  postId: string,
  userId: string,
  platform: "system" | "native-share" | "copy-link" = "system"
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.from("post_shares") as never as {
    insert: (
      values: Database["public"]["Tables"]["post_shares"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  }).insert({
    post_id: postId,
    user_id: userId,
    platform
  });

  return { error: error?.message ?? null };
};

export const togglePinnedPost = async (postId: string, userId: string, currentlyPinned: boolean) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  if (!currentlyPinned) {
    const { count, error: countError } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", userId)
      .eq("is_published", true)
      .eq("is_pinned", true);

    if (countError) {
      return { error: countError.message };
    }

    if (Number(count ?? 0) >= 3) {
      return { error: "You can pin up to 3 posts on your creator profile." };
    }
  }

  const { error } = await (supabase.from("posts") as never as {
    update: (
      values: Database["public"]["Tables"]["posts"]["Update"]
    ) => {
      eq: (column: string, value: string | boolean) => {
        eq: (column: string, value: string | boolean) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .update({ is_pinned: !currentlyPinned })
    .eq("id", postId)
    .eq("author_id", userId);

  return { error: error?.message ?? null };
};

export const deletePost = async (postId: string, userId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", userId);

  return { error: error?.message ?? null };
};

export const addComment = async (postId: string, userId: string, body: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.from("post_comments") as never as {
    insert: (
      values: Database["public"]["Tables"]["post_comments"]["Insert"]
    ) => Promise<{ error: { message: string } | null }>;
  }).insert({
    post_id: postId,
    author_id: userId,
    body
  });

  return { error: error?.message ?? null };
};

export const voteOnPoll = async (postId: string, optionId: string, userId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { error } = await (supabase.from("post_poll_votes") as never as {
    upsert: (
      values: Database["public"]["Tables"]["post_poll_votes"]["Insert"],
      options: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  }).upsert(
    {
      post_id: postId,
      option_id: optionId,
      user_id: userId
    },
    {
      onConflict: "post_id,user_id"
    }
  );

  return { error: error?.message ?? null };
};

type HydratablePostRow =
  | Database["public"]["Views"]["feed_posts"]["Row"]
  | Database["public"]["Views"]["short_posts"]["Row"];

const hydrateFeedPosts = async (
  viewerId: string,
  postsData: HydratablePostRow[]
) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as FeedPost[], error: "Supabase is not configured." };
  }

  const basePosts = ((postsData ?? []) as HydratablePostRow[])
    .filter(
      (row) =>
        row.id &&
        row.author_id &&
        row.post_type &&
        row.created_at &&
        row.full_name
    )
    .map((row) => ({
      id: row.id!,
      author_id: row.author_id!,
      post_type: row.post_type!,
      surface: (row.surface ?? "feed") as PostSurface,
      title: row.title,
      body: row.body,
      media_url: row.media_url,
      thumbnail_url: row.thumbnail_url ?? null,
      media_duration_seconds: row.media_duration_seconds ?? null,
      media_width: row.media_width ?? null,
      media_height: row.media_height ?? null,
      tip_enabled: Boolean(row.tip_enabled),
      share_count: Number(row.share_count ?? 0),
      tip_total_paise: Number(row.tip_total_paise ?? 0),
      created_at: row.created_at!,
      is_pinned: Boolean(row.is_pinned),
      full_name: row.full_name!,
      is_verified_artist: Boolean(row.is_verified_artist),
      username: row.username,
      avatar_url: row.avatar_url,
      creator_slug: row.creator_slug,
      headline: row.headline,
      comment_permissions:
        (row.comment_permissions ?? DEFAULT_INTERACTION_PERMISSION) as InteractionPermission,
      viewer_can_comment: Boolean(row.viewer_can_comment)
    }));

  if (basePosts.length === 0) {
    return { data: [] as FeedPost[], error: null };
  }

  const postIds = basePosts.map((post) => post.id);

  const [
    statsResponse,
    pollOptionsResponse,
    commentsResponse,
    likesResponse,
    votesResponse,
    bookmarksResponse
  ] = await Promise.all([
    supabase.from("post_engagement_stats").select("*").in("post_id", postIds),
    supabase.from("poll_option_results").select("*").in("post_id", postIds),
    supabase.from("comment_threads").select("*").in("post_id", postIds),
    supabase
      .from("post_reactions")
      .select("post_id")
      .eq("user_id", viewerId)
      .eq("reaction_type", "like")
      .in("post_id", postIds),
    supabase.from("post_poll_votes").select("post_id, option_id").eq("user_id", viewerId).in("post_id", postIds),
    supabase.from("post_bookmarks").select("post_id").eq("user_id", viewerId).in("post_id", postIds)
  ]);

  const statsMap = new Map(
    (((statsResponse.data ?? []) as Database["public"]["Views"]["post_engagement_stats"]["Row"][])
      .filter((row) => row.post_id)
      .map((row) => [
        row.post_id!,
        {
          like_count: Number(row.like_count ?? 0),
          comment_count: Number(row.comment_count ?? 0),
          share_count: Number(row.share_count ?? 0),
          tip_total_paise: Number(row.tip_total_paise ?? 0)
        }
      ]))
  );

  const pollOptionsMap = new Map<string, PollOption[]>();
  ((pollOptionsResponse.data ?? []) as Database["public"]["Views"]["poll_option_results"]["Row"][])
    .filter((row) => row.option_id && row.post_id && row.label && row.position !== null)
    .forEach((row) => {
      const entry = asTable<PollOption>({
        option_id: row.option_id!,
        post_id: row.post_id!,
        label: row.label!,
        position: Number(row.position),
        vote_count: Number(row.vote_count ?? 0)
      });

      const collection = pollOptionsMap.get(row.post_id!) ?? [];
      collection.push(entry);
      pollOptionsMap.set(row.post_id!, collection);
    });

  const commentRows = ((commentsResponse.data ?? []) as Database["public"]["Views"]["comment_threads"]["Row"][]).filter(
    (row) => row.id && row.post_id && row.body && row.created_at && row.author_id && row.full_name
  );
  const roleMap = await fetchProfileRoleMap([
    ...basePosts.map((post) => post.author_id),
    ...commentRows.map((row) => row.author_id!)
  ]);

  const commentsMap = new Map<string, FeedComment[]>();
  commentRows.forEach((row) => {
      const entry = asTable<FeedComment>({
        id: row.id!,
        post_id: row.post_id!,
        body: row.body!,
        created_at: row.created_at!,
        author_id: row.author_id!,
        full_name: row.full_name!,
        author_role: roleMap.get(row.author_id!) ?? "visitor",
        author_is_verified_artist: Boolean(row.author_is_verified_artist),
        username: row.username,
        avatar_url: row.avatar_url
      });

      const collection = commentsMap.get(row.post_id!) ?? [];
      collection.push(entry);
      commentsMap.set(row.post_id!, collection);
    });

  const likedSet = new Set(
    ((likesResponse.data ?? []) as { post_id: string }[]).map((row) => row.post_id)
  );
  const savedSet = new Set(
    ((bookmarksResponse.data ?? []) as { post_id: string }[]).map((row) => row.post_id)
  );

  const votedMap = new Map(
    ((votesResponse.data ?? []) as { post_id: string; option_id: string }[]).map((row) => [
      row.post_id,
      row.option_id
    ])
  );

  const data = basePosts.map(
    (post) =>
      ({
        ...post,
        author_role: roleMap.get(post.author_id) ?? "visitor",
        like_count: statsMap.get(post.id)?.like_count ?? 0,
        comment_count: statsMap.get(post.id)?.comment_count ?? 0,
        share_count: statsMap.get(post.id)?.share_count ?? post.share_count ?? 0,
        tip_total_paise: statsMap.get(post.id)?.tip_total_paise ?? post.tip_total_paise ?? 0,
        liked_by_viewer: likedSet.has(post.id),
        saved_by_viewer: savedSet.has(post.id),
        poll_options: (pollOptionsMap.get(post.id) ?? []).sort((a, b) => a.position - b.position),
        voted_option_id: votedMap.get(post.id) ?? null,
        comments: commentsMap.get(post.id) ?? []
      }) satisfies FeedPost
  );

  return { data, error: null };
};

export type FeedScope = "for-you" | "following" | "subscribed" | "saved";

type FetchFeedPostsOptions = {
  page?: number;
  pageSize?: number;
};

export const fetchFeedPosts = async (
  viewerId: string,
  scope: FeedScope = "for-you",
  options: FetchFeedPostsOptions = {}
) => {
  const supabase = getSupabaseClient();
  const page = options.page ?? 0;
  const pageSize = options.pageSize ?? 6;
  const rangeFrom = page * pageSize;
  const rangeTo = rangeFrom + pageSize;

  if (!supabase) {
    return { data: [] as FeedPost[], error: "Supabase is not configured.", hasMore: false };
  }

  let feedQuery = supabase
    .from("feed_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (scope === "saved") {
    const bookmarksResponse = await supabase
      .from("post_bookmarks")
      .select("post_id, created_at")
      .eq("user_id", viewerId)
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (bookmarksResponse.error) {
      return { data: [] as FeedPost[], error: bookmarksResponse.error.message, hasMore: false };
    }

    const bookmarkedRows = (bookmarksResponse.data ?? []) as {
      post_id: string;
      created_at: string;
    }[];
    const hasMore = bookmarkedRows.length > pageSize;
    const bookmarkedPostIds = bookmarkedRows.slice(0, pageSize).map((row) => row.post_id);

    if (bookmarkedPostIds.length === 0) {
      return { data: [] as FeedPost[], error: null, hasMore: false };
    }

    const { data: postsData, error: postsError } = await supabase
      .from("feed_posts")
      .select("*")
      .in("id", bookmarkedPostIds);

    if (postsError) {
      return { data: [] as FeedPost[], error: postsError.message, hasMore: false };
    }

    const hydrated = await hydrateFeedPosts(
      viewerId,
      (postsData ?? []) as Database["public"]["Views"]["feed_posts"]["Row"][]
    );

    if (hydrated.error) {
      return { ...hydrated, hasMore: false };
    }

    const bookmarkOrder = new Map(bookmarkedPostIds.map((postId, index) => [postId, index]));
    return {
      data: hydrated.data.sort(
        (left, right) => (bookmarkOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (bookmarkOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      ),
      error: null,
      hasMore
    };
  }

  if (scope !== "for-you") {
    const relationResponse =
      scope === "following"
        ? await supabase
            .from("profile_follows")
            .select("followed_id")
            .eq("follower_id", viewerId)
        : await supabase
            .from("creator_subscriptions")
            .select("creator_id")
            .eq("subscriber_id", viewerId);

    if (relationResponse.error) {
      return { data: [] as FeedPost[], error: relationResponse.error.message, hasMore: false };
    }

    const targetIds =
      scope === "following"
        ? ((relationResponse.data ?? []) as { followed_id: string }[]).map((row) => row.followed_id)
        : ((relationResponse.data ?? []) as { creator_id: string }[]).map((row) => row.creator_id);

    if (targetIds.length === 0) {
      return { data: [] as FeedPost[], error: null, hasMore: false };
    }

    feedQuery = feedQuery.in("author_id", targetIds);
  }

  const { data: postsData, error: postsError } = await feedQuery;

  if (postsError) {
    return { data: [] as FeedPost[], error: postsError.message, hasMore: false };
  }

  const pagedPosts = ((postsData ?? []) as Database["public"]["Views"]["feed_posts"]["Row"][]).slice(0, pageSize);
  const hydrated = await hydrateFeedPosts(
    viewerId,
    pagedPosts
  );

  return {
    data: hydrated.data,
    error: hydrated.error,
    hasMore: ((postsData ?? []) as Database["public"]["Views"]["feed_posts"]["Row"][]).length > pageSize
  };
};

export const fetchFeedPostById = async (viewerId: string, postId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null as FeedPost | null, error: "Supabase is not configured." };
  }

  const { data: postRows, error } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("id", postId)
    .limit(1);

  if (error) {
    return { data: null as FeedPost | null, error: error.message };
  }

  const hydrated = await hydrateFeedPosts(
    viewerId,
    (postRows ?? []) as Database["public"]["Views"]["feed_posts"]["Row"][]
  );

  return {
    data: hydrated.data[0] ?? null,
    error: hydrated.error
  };
};

export const fetchShortPosts = async (
  viewerId: string,
  options: FetchFeedPostsOptions = {}
) => {
  const supabase = getSupabaseClient();
  const page = options.page ?? 0;
  const pageSize = options.pageSize ?? 4;
  const rangeFrom = page * pageSize;
  const rangeTo = rangeFrom + pageSize;

  if (!supabase) {
    return { data: [] as ShortPost[], error: "Supabase is not configured.", hasMore: false };
  }

  const { data: postsData, error } = await supabase
    .from("short_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (error) {
    return {
      data: [] as ShortPost[],
      error: mapShortsSchemaError(getSupabaseErrorText(error)),
      hasMore: false
    };
  }

  const pagedPosts = ((postsData ?? []) as Database["public"]["Views"]["short_posts"]["Row"][]).slice(0, pageSize);
  const hydrated = await hydrateFeedPosts(viewerId, pagedPosts);

  return {
    data: hydrated.data as ShortPost[],
    error: hydrated.error,
    hasMore: ((postsData ?? []) as Database["public"]["Views"]["short_posts"]["Row"][]).length > pageSize
  };
};

export const fetchActiveStories = async (viewerId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as StoryGroup[], error: "Supabase is not configured." };
  }

  const { data: storiesData, error: storiesError } = await supabase
    .from("active_stories")
    .select("*")
    .order("created_at", { ascending: true });

  if (storiesError) {
    return {
      data: [] as StoryGroup[],
      error: mapStoriesSchemaError(getSupabaseErrorText(storiesError) || storiesError.message)
    };
  }

  const storyRows = ((storiesData ?? []) as Database["public"]["Views"]["active_stories"]["Row"][]).filter(
    (row) =>
      row.id &&
      row.author_id &&
      row.media_kind &&
      row.media_url &&
      row.expires_at &&
      row.created_at &&
      row.full_name
  );

  if (storyRows.length === 0) {
    return { data: [] as StoryGroup[], error: null };
  }

  const storyIds = storyRows.map((row) => row.id!);
  const roleMap = await fetchProfileRoleMap(storyRows.map((row) => row.author_id!));
  const { data: viewedData, error: viewedError } = await supabase
    .from("story_views")
    .select("story_id")
    .eq("viewer_id", viewerId)
    .in("story_id", storyIds);

  if (viewedError) {
    return {
      data: [] as StoryGroup[],
      error: mapStoriesSchemaError(getSupabaseErrorText(viewedError) || viewedError.message)
    };
  }

  const viewedSet = new Set(((viewedData ?? []) as { story_id: string }[]).map((row) => row.story_id));
  const items = storyRows.map(
    (row) =>
      ({
        id: row.id!,
        author_id: row.author_id!,
        media_kind: row.media_kind! as StoryMediaKind,
        media_url: row.media_url!,
        media_storage_path: row.media_storage_path ?? null,
        thumbnail_url: row.thumbnail_url ?? null,
        thumbnail_storage_path: row.thumbnail_storage_path ?? null,
        body: row.body,
        media_duration_seconds: row.media_duration_seconds ?? null,
        media_width: row.media_width ?? null,
        media_height: row.media_height ?? null,
        compression_status: row.compression_status ?? "original",
        expires_at: row.expires_at!,
        created_at: row.created_at!,
        full_name: row.full_name!,
        author_role: roleMap.get(row.author_id!) ?? "visitor",
        is_verified_artist: Boolean(row.is_verified_artist),
        username: row.username,
        avatar_url: row.avatar_url,
        creator_slug: row.creator_slug,
        headline: row.headline,
        viewed_by_viewer: row.author_id === viewerId ? true : viewedSet.has(row.id!)
      }) satisfies StoryItem
  );

  const groupsMap = new Map<string, StoryGroup>();

  items.forEach((item) => {
    const existing = groupsMap.get(item.author_id);

    if (!existing) {
      groupsMap.set(item.author_id, {
        author_id: item.author_id,
        full_name: item.full_name,
        author_role: item.author_role,
        is_verified_artist: item.is_verified_artist,
        username: item.username,
        avatar_url: item.avatar_url,
        creator_slug: item.creator_slug,
        headline: item.headline,
        items: [item],
        has_unviewed: !item.viewed_by_viewer,
        latest_created_at: item.created_at
      });
      return;
    }

    existing.items.push(item);
    existing.has_unviewed = existing.has_unviewed || !item.viewed_by_viewer;
    if (new Date(item.created_at).getTime() > new Date(existing.latest_created_at).getTime()) {
      existing.latest_created_at = item.created_at;
    }
  });

  const groups = Array.from(groupsMap.values()).sort(
    (left, right) =>
      new Date(right.latest_created_at).getTime() - new Date(left.latest_created_at).getTime()
  );

  return { data: groups, error: null };
};

export const fetchProfilePosts = async (viewerId: string, authorId: string) => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: [] as FeedPost[], error: "Supabase is not configured." };
  }

  const { data: postsData, error } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [] as FeedPost[], error: error.message };
  }

  return hydrateFeedPosts(
    viewerId,
    (postsData ?? []) as Database["public"]["Views"]["feed_posts"]["Row"][]
  );
};
