import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authSessionStorage } from "./authSessionPreference";
import { env, isSupabaseConfigured } from "./env";
import type { Database } from "./supabase.types";

let browserClient: SupabaseClient<Database> | null = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (browserClient === null) {
    browserClient = createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: authSessionStorage
      }
    });
  }

  return browserClient;
};
