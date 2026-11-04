import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "supervisor" | "sales";
export type UserProfile = {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
};

type AuthContextValue = {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function getProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, is_active")
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (!data || !data.is_active) throw new Error("Akun belum aktif. Hubungi administrator.");
  if (!["admin", "supervisor", "sales"].includes(data.role)) {
    throw new Error("Role akun tidak dikenali. Hubungi administrator.");
  }
  return data as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let profileRequest = 0;

    const loadProfile = async (userId: string) => {
      const requestId = ++profileRequest;
      try {
        const nextProfile = await getProfile(userId);
        if (mounted && requestId === profileRequest) setProfile(nextProfile);
      } catch {
        if (mounted && requestId === profileRequest) {
          setProfile(null);
          await supabase.auth.signOut();
        }
      } finally {
        if (mounted && requestId === profileRequest) setLoading(false);
      }
    };

    const handleAppState = (state: AppStateStatus) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };

    handleAppState((AppState.currentState ?? "active") as AppStateStatus);
    const appStateSubscription = AppState.addEventListener("change", handleAppState);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (!nextSession) {
        profileRequest += 1;
        setProfile(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      // Defer profile access until the auth event callback has completed.
      Promise.resolve().then(() => {
        if (mounted) void loadProfile(nextSession.user.id);
      });
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data.session) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setSession(data.session);
      setLoading(true);
      void loadProfile(data.session.user.id);
    });

    return () => {
      mounted = false;
      profileRequest += 1;
      listener.subscription.unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    profile,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    async reloadProfile() {
      if (!session?.user.id) return;
      setProfile(await getProfile(session.user.id));
    },
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
