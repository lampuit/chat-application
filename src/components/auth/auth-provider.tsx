"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { AuthStatus, AuthUserSummary } from "@/types/auth";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUserSummary | null;
  refreshUser?: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  user: null,
});

function mapAuthUser(user: User | null): AuthUserSummary | null {
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUserSummary | null>(null);

  async function refreshUser() {
    const [{ reload }, { getFirebaseServices }] = await Promise.all([
      import("firebase/auth"),
      import("@/lib/firebase/client"),
    ]);
    const services = getFirebaseServices();

    if (!services?.auth.currentUser) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    await reload(services.auth.currentUser);
    setUser(mapAuthUser(services.auth.currentUser));
    setStatus("authenticated");
  }

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;

    async function startAuthSubscription() {
      const [{ onAuthStateChanged }, { getFirebaseServices }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/client"),
      ]);
      const services = getFirebaseServices();

      if (!services) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      unsubscribe = onAuthStateChanged(services.auth, (nextUser) => {
        setUser(mapAuthUser(nextUser));
        setStatus(nextUser ? "authenticated" : "unauthenticated");
      });
    }

    void startAuthSubscription().catch(() => {
      setUser(null);
      setStatus("unauthenticated");
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
