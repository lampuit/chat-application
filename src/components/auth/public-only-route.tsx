"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { shouldRedirectToChat } from "@/lib/auth/session";

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirectToChat(status)) {
      router.replace("/chat");
    }
  }, [router, status]);

  if (status === "authenticated") {
    return null;
  }

  return <>{children}</>;
}

