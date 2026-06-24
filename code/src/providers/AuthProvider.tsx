import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabase";
import { isSupabaseConfigured } from "../lib/env";
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
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>(
    isSupabaseConfigured ? "loading" : "disabled"
  );
  const mountedRef = useRef(true);

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
        const nextProfile = await readProfile(initialSession.user);

        if (!mountedRef.current) {
          return;
        }

        setProfile(nextProfile);
        setStatus("authenticated");
        return;
      }

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
        setStatus("anonymous");
        return;
      }

      setStatus("loading");
      void readProfile(nextSession.user).then((nextProfile) => {
        if (!mountedRef.current) {
          return;
        }

        setProfile(nextProfile);
        setStatus("authenticated");
      });
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password
      });

      if (signInError) {
        setError(signInError.message);
        return { error: signInError.message };
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

  const value: AuthContextValue = {
    session,
    user,
    profile,
    status,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile
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
