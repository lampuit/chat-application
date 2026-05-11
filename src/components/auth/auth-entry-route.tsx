"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { shouldRedirectToChat, shouldRedirectToLogin } from "@/lib/auth/session";

export function AuthEntryRoute() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (shouldRedirectToChat(status)) {
      router.replace("/chat");
      return;
    }

    if (shouldRedirectToLogin(status)) {
      router.replace("/login");
    }
  }, [router, status]);

  return null;
}