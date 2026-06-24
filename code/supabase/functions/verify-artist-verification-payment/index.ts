import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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

const toHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

const signOrderPayload = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(signature);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: "Supabase function secrets are incomplete." }, 500);
  }

  if (!razorpayKeySecret) {
    return jsonResponse({ error: "Razorpay secret is not configured." }, 500);
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
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const paymentId = typeof body?.paymentId === "string" ? body.paymentId : "";
  const signature = typeof body?.signature === "string" ? body.signature : "";

  if (!orderId || !paymentId || !signature) {
    return jsonResponse({ error: "Missing payment verification fields." }, 400);
  }

  const expectedSignature = await signOrderPayload(`${orderId}|${paymentId}`, razorpayKeySecret);

  if (expectedSignature !== signature) {
    return jsonResponse({ error: "Invalid Razorpay payment signature." }, 400);
  }

  const { data: paymentRecord, error: paymentLookupError } = await adminClient
    .from("artist_verification_payments")
    .select("id, profile_id, status")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (paymentLookupError || !paymentRecord) {
    return jsonResponse({ error: "Verification order was not found." }, 404);
  }

  if (paymentRecord.profile_id !== user.id) {
    return jsonResponse({ error: "This verification order does not belong to the current user." }, 403);
  }

  const verifiedAt = new Date().toISOString();

  const { error: paymentUpdateError } = await adminClient
    .from("artist_verification_payments")
    .update({
      razorpay_payment_id: paymentId,
      status: "paid",
      verified_at: verifiedAt
    })
    .eq("id", paymentRecord.id);

  if (paymentUpdateError) {
    return jsonResponse({ error: paymentUpdateError.message }, 500);
  }

  const { error: profileUpdateError } = await adminClient
    .from("profiles")
    .update({
      is_verified_artist: true,
      verified_artist_at: verifiedAt
    })
    .eq("id", user.id)
    .eq("role", "creator");

  if (profileUpdateError) {
    return jsonResponse({ error: profileUpdateError.message }, 500);
  }

  return jsonResponse({ verified: true });
});
