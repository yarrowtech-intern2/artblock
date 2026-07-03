import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });

type TipRow = {
  id: string;
  post_id: string | null;
  sender_id: string;
  recipient_id: string;
  amount_paise: number;
  currency: string;
  message: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: "admin" | "creator" | "visitor";
  is_verified_artist: boolean | null;
  creator_slug: string | null;
};

type PostRow = {
  id: string;
  title: string | null;
  body: string | null;
  caption: string | null;
  post_type: string;
  surface: string;
  author_id: string;
};

const formatTipTitle = (post: PostRow | null, recipient: ProfileRow | null) => {
  if (post) {
    return post.title?.trim() || post.caption?.trim() || post.body?.trim() || "Post tip";
  }

  if (recipient?.role === "creator") {
    return "Artist profile";
  }

  return "Profile tip";
};

const buildProfile = (row: ProfileRow | null | undefined) => ({
  id: row?.id ?? "",
  full_name: row?.full_name ?? "Unknown user",
  username: row?.username ?? null,
  avatar_url: row?.avatar_url ?? null,
  role: row?.role ?? "visitor",
  is_verified_artist: Boolean(row?.is_verified_artist),
  creator_slug: row?.creator_slug ?? null
});

const emptyQueryResult = <T,>() => ({
  data: [] as T[],
  error: null as { message: string } | null
});

const sumAmount = (rows: TipRow[], predicate: (row: TipRow) => boolean) =>
  rows.reduce((sum, row) => sum + (predicate(row) && row.status === "paid" ? row.amount_paise : 0), 0);

const countRows = (rows: TipRow[], predicate: (row: TipRow) => boolean) =>
  rows.reduce((sum, row) => sum + (predicate(row) ? 1 : 0), 0);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Supabase function secrets are incomplete." }, 500);
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization header." }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const {
    data: { user },
    error: userError
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  const { data: profileRow, error: profileError } = await adminClient
    .from("profiles")
    .select("id, full_name, username, avatar_url, role, is_verified_artist, creator_slug")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profileRow) {
    return jsonResponse({ error: "Profile not found." }, 404);
  }

  const profile = profileRow as ProfileRow;
  const isAdmin = profile.role === "admin";

  const { data: tipRowsData, error: tipRowsError } = await adminClient
    .from("artist_tips")
    .select("id, post_id, sender_id, recipient_id, amount_paise, currency, message, status, paid_at, created_at")
    .order("created_at", { ascending: false });

  if (tipRowsError) {
    return jsonResponse({ error: tipRowsError.message }, 500);
  }

  const allRows = ((tipRowsData ?? []) as TipRow[]).filter((row) =>
    isAdmin ? true : row.sender_id === user.id || row.recipient_id === user.id
  );

  const profileIds = Array.from(
    new Set(allRows.flatMap((row) => [row.sender_id, row.recipient_id]).filter(Boolean))
  );
  const postIds = Array.from(new Set(allRows.map((row) => row.post_id).filter((value): value is string => Boolean(value))));

  const [profilesResponse, postsResponse] = await Promise.all([
    profileIds.length > 0
      ? adminClient
          .from("public_member_profiles")
          .select("id, full_name, username, avatar_url, role, is_verified_artist, creator_slug")
          .in("id", profileIds)
      : Promise.resolve(emptyQueryResult<ProfileRow>()),
    postIds.length > 0
      ? adminClient
          .from("posts")
          .select("id, title, body, caption, post_type, surface, author_id")
          .in("id", postIds)
      : Promise.resolve(emptyQueryResult<PostRow>())
  ]);

  if (profilesResponse.error) {
    return jsonResponse({ error: profilesResponse.error.message }, 500);
  }

  if (postsResponse.error) {
    return jsonResponse({ error: postsResponse.error.message }, 500);
  }

  const profileMap = new Map<string, ProfileRow>(
    ((profilesResponse.data ?? []) as ProfileRow[]).map((row) => [row.id, row])
  );
  const postMap = new Map<string, PostRow>((postsResponse.data ?? []).map((row) => [row.id, row as PostRow]));

  const sentCounts = new Map<string, { count: number; amount: number }>();
  const receivedCounts = new Map<string, { count: number; amount: number }>();

  allRows
    .filter((row) => row.status === "paid")
    .forEach((row) => {
      const senderCount = sentCounts.get(row.sender_id) ?? { count: 0, amount: 0 };
      senderCount.count += 1;
      senderCount.amount += row.amount_paise;
      sentCounts.set(row.sender_id, senderCount);

      const recipientCount = receivedCounts.get(row.recipient_id) ?? { count: 0, amount: 0 };
      recipientCount.count += 1;
      recipientCount.amount += row.amount_paise;
      receivedCounts.set(row.recipient_id, recipientCount);
    });

  const records = allRows.map((row) => {
    const sender = buildProfile(profileMap.get(row.sender_id));
    const recipient = buildProfile(profileMap.get(row.recipient_id));
    const post = row.post_id ? postMap.get(row.post_id) ?? null : null;
    const isSender = row.sender_id === user.id;
    const isRecipient = row.recipient_id === user.id;
    const contextHref = post
      ? recipient.creator_slug
        ? `/creators/${recipient.creator_slug}/posts/${post.id}`
        : `/profiles/${recipient.id}/posts/${post.id}`
      : recipient.creator_slug
        ? `/creators/${recipient.creator_slug}`
        : `/profiles/${recipient.id}`;

    return {
      id: row.id,
      created_at: row.created_at,
      paid_at: row.paid_at,
      amount_paise: row.amount_paise,
      currency: row.currency,
      message: row.message,
      status: row.status,
      sender,
      recipient,
      viewer_relation: isSender ? "sender" : isRecipient ? "recipient" : "other",
      context: {
        kind: post ? "post" : "profile",
        href: contextHref,
        title: formatTipTitle(post, profileMap.get(row.recipient_id)),
        post_id: post?.id ?? null
      }
    };
  });

  const summary = {
    total_tips: allRows.length,
    paid_tips: countRows(allRows, (row) => row.status === "paid"),
    pending_tips: countRows(allRows, (row) => row.status === "created"),
    failed_tips: countRows(allRows, (row) => row.status === "failed"),
    total_amount_paise: sumAmount(allRows, () => true),
    sent_tips: countRows(allRows, (row) => row.sender_id === user.id),
    sent_amount_paise: sumAmount(allRows, (row) => row.sender_id === user.id),
    received_tips: countRows(allRows, (row) => row.recipient_id === user.id),
    received_amount_paise: sumAmount(allRows, (row) => row.recipient_id === user.id)
  };

  const top_senders = Array.from(sentCounts.entries())
    .map(([profileId, value]) => ({
      profile: buildProfile(profileMap.get(profileId)),
      tip_count: value.count,
      amount_paise: value.amount
    }))
    .sort((left, right) => right.amount_paise - left.amount_paise || right.tip_count - left.tip_count)
    .slice(0, 5);

  const top_recipients = Array.from(receivedCounts.entries())
    .map(([profileId, value]) => ({
      profile: buildProfile(profileMap.get(profileId)),
      tip_count: value.count,
      amount_paise: value.amount
    }))
    .sort((left, right) => right.amount_paise - left.amount_paise || right.tip_count - left.tip_count)
    .slice(0, 5);

  return jsonResponse({
    is_admin: isAdmin,
    summary,
    records,
    top_senders: isAdmin ? top_senders : [],
    top_recipients: isAdmin ? top_recipients : []
  });
});
