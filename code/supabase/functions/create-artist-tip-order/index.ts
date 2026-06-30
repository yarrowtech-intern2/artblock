import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MIN_TIP_AMOUNT_PAISE = 1000;
const MAX_TIP_AMOUNT_PAISE = 500000;
const TIP_CURRENCY = "INR";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Supabase function secrets are incomplete." }, 500);
  }

  if (!razorpayKeyId || !razorpayKeySecret) {
    return jsonResponse({ error: "Razorpay secrets are not configured." }, 500);
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

  const body = await request.json().catch(() => null);
  const postId = typeof body?.postId === "string" ? body.postId : "";
  const recipientId = typeof body?.recipientId === "string" ? body.recipientId : "";
  const amountRupees = Number(body?.amountRupees ?? 0);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 240) : null;
  const amountPaise = Math.round(amountRupees * 100);

  if (!postId || !recipientId || !Number.isFinite(amountPaise)) {
    return jsonResponse({ error: "Missing tip payment fields." }, 400);
  }

  if (recipientId === user.id) {
    return jsonResponse({ error: "You cannot tip yourself." }, 400);
  }

  if (amountPaise < MIN_TIP_AMOUNT_PAISE || amountPaise > MAX_TIP_AMOUNT_PAISE) {
    return jsonResponse({ error: "Tip amount is outside the supported range." }, 400);
  }

  const { data: recipient, error: recipientError } = await adminClient
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", recipientId)
    .single();

  if (recipientError || !recipient) {
    return jsonResponse({ error: "Artist profile not found." }, 404);
  }

  if (recipient.role !== "creator") {
    return jsonResponse({ error: "Tips can only be sent to creators." }, 400);
  }

  const { data: post, error: postError } = await adminClient
    .from("posts")
    .select("id, author_id, surface, tip_enabled, is_published")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return jsonResponse({ error: "Short post not found." }, 404);
  }

  if (!post.is_published || post.surface !== "short" || post.author_id !== recipientId) {
    return jsonResponse({ error: "Tips are only supported on published reels from this artist." }, 400);
  }

  if (!post.tip_enabled) {
    return jsonResponse({ error: "This artist has disabled tips on the selected reel." }, 400);
  }

  const receipt = `artist_tip_${user.id.slice(0, 8)}_${Date.now()}`;
  const razorpayOrderResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: TIP_CURRENCY,
      receipt,
      notes: {
        flow: "artist_tip",
        sender_id: user.id,
        recipient_id: recipientId,
        post_id: postId
      }
    })
  });

  if (!razorpayOrderResponse.ok) {
    const errorBody = await razorpayOrderResponse.text();
    return jsonResponse(
      {
        error: "Unable to create Razorpay order.",
        detail: errorBody
      },
      502
    );
  }

  const razorpayOrder = await razorpayOrderResponse.json();

  const { error: tipInsertError } = await adminClient.from("artist_tips").upsert(
    {
      post_id: postId,
      sender_id: user.id,
      recipient_id: recipientId,
      razorpay_order_id: razorpayOrder.id,
      amount_paise: amountPaise,
      currency: TIP_CURRENCY,
      message,
      status: "created",
      metadata: {
        receipt
      }
    },
    {
      onConflict: "razorpay_order_id"
    }
  );

  if (tipInsertError) {
    return jsonResponse({ error: tipInsertError.message }, 500);
  }

  return jsonResponse({
    orderId: razorpayOrder.id,
    amount: amountPaise,
    currency: TIP_CURRENCY,
    keyId: razorpayKeyId,
    recipientName: recipient.full_name
  });
});
