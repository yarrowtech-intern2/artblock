import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../lib/env";
import { applyKeepSignedInPreference } from "../lib/authSessionPreference";
import { fetchOwnUserSettings, updateOwnUserSettings } from "../lib/profile";
import { getSupabaseClient } from "../lib/supabase";
import type {
  AuthContextValue,
  Profile,
  SignInInput,
  SignUpInput
} from "../types/auth";

const AuthContext = createContext<AuthContextValue | null>(null);

const getAuthRequestErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message === "Failed to fetch") {
      return "Cannot reach Supabase. Check VITE_SUPABASE_URL in code/.env and make sure the Supabase project is still active.";
    }

    return error.message;
  }

  return "Authentication request failed.";
};

const readProfile = async (user: User): Promise<Profile | null> => {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return null;
  }

  return data;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<AuthContextValue["settings"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>(
    isSupabaseConfigured ? "loading" : "disabled"
  );
  const mountedRef = useRef(true);

  const loadAuthenticatedAccount = async (nextUser: User) => {
    if (!supabase) {
      return;
    }

    const [nextProfile, settingsResult] = await Promise.all([
      readProfile(nextUser),
      fetchOwnUserSettings(nextUser.id)
    ]);

    if (!mountedRef.current) {
      return;
    }

    applyKeepSignedInPreference(settingsResult.data.keep_me_signed_in);

    if (settingsResult.data.deactivated_at) {
      setProfile(null);
      setSettings(settingsResult.data);
      setError("This account has been deactivated.");
      await supabase.auth.signOut();
      return;
    }

    setProfile(nextProfile);
    setSettings(settingsResult.data);
    setStatus("authenticated");
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      setStatus("disabled");
      return () => {
        mountedRef.current = false;
      };
    }

    const bootstrap = async () => {
      const {
        data: { session: initialSession }
      } = await supabase.auth.getSession();

      if (!mountedRef.current) {
        return;
      }

      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        setStatus("loading");
        await loadAuthenticatedAccount(initialSession.user);
        return;
      }

      setProfile(null);
      setSettings(null);
      setStatus("anonymous");
    };

    void bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setSettings(null);
        setStatus("anonymous");
        return;
      }

      setStatus("loading");
      void loadAuthenticatedAccount(nextSession.user);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (input: SignInInput) => {
    if (!supabase) {
      const configError = "Supabase environment variables are missing. Add them to code/.env and restart Vite.";
      setError(configError);
      return { error: configError };
    }

    setError(null);
    try {
      applyKeepSignedInPreference(input.keepMeSignedIn);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password
      });

      if (signInError) {
        setError(signInError.message);
        return { error: signInError.message };
      }

      if (data.user) {
        void updateOwnUserSettings(data.user.id, {
          keep_me_signed_in: input.keepMeSignedIn
        });
      }

      return { error: null };
    } catch (requestError) {
      const message = getAuthRequestErrorMessage(requestError);
      setError(message);
      return { error: message };
    }
  };

  const signUp = async (input: SignUpInput) => {
    if (!supabase) {
      const configError = "Supabase environment variables are missing. Add them to code/.env and restart Vite.";
      setError(configError);
      return { error: configError };
    }

    setError(null);
    const redirectTo = `${window.location.origin}/feed`;
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: input.fullName,
            role: input.role,
            accepted_terms: input.acceptedTerms,
            accepted_terms_at: input.acceptedTerms ? new Date().toISOString() : null
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return { error: signUpError.message };
      }

      return { error: null };
    } catch (requestError) {
      const message = getAuthRequestErrorMessage(requestError);
      setError(message);
      return { error: message };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const nextProfile = await readProfile(user);
    setProfile(nextProfile);
  };

  const refreshSettings = async () => {
    if (!user) {
      setSettings(null);
      return;
    }

    const nextSettings = await fetchOwnUserSettings(user.id);
    applyKeepSignedInPreference(nextSettings.data.keep_me_signed_in);
    setSettings(nextSettings.data);
  };

  const updateSettings = async (
    input: Partial<
      Pick<
        NonNullable<AuthContextValue["settings"]>,
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
    if (!user) {
      return { error: "Authentication required." };
    }

    const result = await updateOwnUserSettings(user.id, input);

    if (result.error) {
      setError(result.error);
      return result;
    }

    if (typeof input.keep_me_signed_in === "boolean") {
      applyKeepSignedInPreference(input.keep_me_signed_in);
    }

    setError(null);
    await refreshSettings();
    return { error: null };
  };

  const value: AuthContextValue = {
    session,
    user,
    profile,
    settings,
    status,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    refreshSettings,
    updateSettings
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
};
