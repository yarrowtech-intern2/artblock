import type { AppRole } from "./supabase.types";

export const getIdentityNameClass = (role: AppRole | null | undefined) =>
  role === "creator" ? "identity-name identity-name--creator" : "identity-name identity-name--follower";
