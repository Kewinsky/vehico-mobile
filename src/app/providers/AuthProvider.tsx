import type { PropsWithChildren } from "react";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "../../services/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Best-effort wipe of persisted Supabase auth keys (RN AsyncStorage). */
async function clearPersistedAuthStorage() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(
      (key) => key.startsWith("sb-") && key.includes("auth"),
    );
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }
  } catch {
    // Ignore storage failures – UI session is still cleared below.
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (alive) setSession(data.session);
      } catch {
        // Treat auth bootstrap errors as signed-out (e.g. corrupted local session).
        if (alive) setSession(null);
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signOut: async () => {
        // Prefer local scope on mobile: revoke this device session. Remote
        // global logout fails with 403/network after a blip and used to leave
        // the user stuck (e.g. onboarding Sign out) until reinstall.
        try {
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) {
            console.warn("signOut returned error, clearing locally anyway:", error);
            await clearPersistedAuthStorage();
          }
        } catch (error) {
          console.warn("signOut threw, clearing locally anyway:", error);
          await clearPersistedAuthStorage();
        } finally {
          setSession(null);
        }
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
