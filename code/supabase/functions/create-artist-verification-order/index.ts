import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARTIST_VERIFICATION_AMOUNT_PAISE = 49900;
const ARTIST_VERIFICATION_CURRENCY = "INR";

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

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("full_name, role, is_verified_artist")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return jsonResponse({ error: "Profile not found." }, 404);
  }

  if (profile.role !== "creator") {
    return jsonResponse({ error: "Convert this account to an artist profile first." }, 400);
  }

  if (profile.is_verified_artist) {
    return jsonResponse({ error: "This artist account is already verified." }, 400);
  }

  const receipt = `artist_verify_${user.id.slice(0, 8)}_${Date.now()}`;
  const razorpayOrderResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: ARTIST_VERIFICATION_AMOUNT_PAISE,
      currency: ARTIST_VERIFICATION_CURRENCY,
      receipt,
      notes: {
        profile_id: user.id,
        flow: "artist_verification"
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

  const { error: paymentError } = await adminClient.from("artist_verification_payments").upsert(
    {
      profile_id: user.id,
      razorpay_order_id: razorpayOrder.id,
      amount_paise: ARTIST_VERIFICATION_AMOUNT_PAISE,
      currency: ARTIST_VERIFICATION_CURRENCY,
      status: "created",
      metadata: {
        receipt
      }
    },
    {
      onConflict: "razorpay_order_id"
    }
  );

  if (paymentError) {
    return jsonResponse({ error: paymentError.message }, 500);
  }

  return jsonResponse({
    orderId: razorpayOrder.id,
    amount: ARTIST_VERIFICATION_AMOUNT_PAISE,
    currency: ARTIST_VERIFICATION_CURRENCY,
    keyId: razorpayKeyId,
    profileName: profile.full_name
  });
});
