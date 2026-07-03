import { getSupabaseClient } from "./supabase";
import type { AppRole } from "./supabase.types";

export type TipParty = {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  role: AppRole;
  is_verified_artist: boolean;
  creator_slug: string | null;
};

export type TipContext =
  | {
      kind: "post";
      href: string | null;
      title: string;
      post_id: string | null;
    }
  | {
      kind: "profile";
      href: string | null;
      title: string;
      post_id: null;
    };

export type TipDashboardRecord = {
  id: string;
  created_at: string;
  paid_at: string | null;
  amount_paise: number;
  currency: string;
  message: string | null;
  status: string;
  sender: TipParty;
  recipient: TipParty;
  viewer_relation: "sender" | "recipient" | "other";
  context: TipContext;
};

export type TipLeaderboardEntry = {
  profile: TipParty;
  tip_count: number;
  amount_paise: number;
};

export type TipDashboardSummary = {
  total_tips: number;
  paid_tips: number;
  pending_tips: number;
  failed_tips: number;
  total_amount_paise: number;
  sent_tips: number;
  sent_amount_paise: number;
  received_tips: number;
  received_amount_paise: number;
};

export type TipDashboardResponse = {
  is_admin: boolean;
  summary: TipDashboardSummary;
  records: TipDashboardRecord[];
  top_senders: TipLeaderboardEntry[];
  top_recipients: TipLeaderboardEntry[];
};

export const fetchTipDashboard = async () => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return { data: null as TipDashboardResponse | null, error: "Supabase is not configured." };
  }

  const rpcResponse = await (supabase as any).rpc("get_tip_dashboard");

  if (!rpcResponse.error) {
    return {
      data: (rpcResponse.data ?? null) as TipDashboardResponse | null,
      error: null
    };
  }

  return {
    data: null,
    error: rpcResponse.error?.message ?? "Unable to load tip dashboard."
  };
};
