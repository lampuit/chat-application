"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { shouldRedirectToLogin } from "@/lib/auth/session";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirectToLogin(status)) {
      router.replace("/login");
    }
  }, [router, status]);

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}

