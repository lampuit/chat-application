"use client";

import React, { useState, useTransition } from "react";
import {
  reloadCurrentUser,
  sendCurrentUserVerificationEmail,
} from "@/lib/auth/auth-service";
import { useAuth } from "@/components/auth/auth-provider";

export function EmailVerificationCard() {
  const { refreshUser, user } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!user || user.emailVerified) {
    return null;
  }

  function handleResend() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await sendCurrentUserVerificationEmail();
        setMessage("Verification email sent. Check your inbox.");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Unable to send a verification email.",
        );
      }
    });
  }

  function handleRefresh() {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const nextUser = await reloadCurrentUser();

        if (nextUser.emailVerified) {
          await refreshUser?.();
          setMessage("Email verified. 2-step verification is now available.");
          return;
        }

        setMessage("Your email is not verified yet. Please check your inbox.");
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Unable to refresh your verification status.",
        );
      }
    });
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-amber-950">Verify your email</h2>
        <p className="text-sm text-amber-900">
          Verify <span className="font-medium">{user.email}</span> before enabling
          Google Authenticator 2-step verification.
        </p>
      </div>
      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          className="rounded-2xl bg-sky-900 px-4 py-3 text-sm font-medium text-white disabled:bg-slate-300"
          disabled={isPending}
          onClick={handleResend}
          type="button"
        >
          {isPending ? "Sending..." : "Resend verification email"}
        </button>
        <button
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-slate-900 disabled:bg-slate-100"
          disabled={isPending}
          onClick={handleRefresh}
          type="button"
        >
          {isPending ? "Checking..." : "I've verified my email"}
        </button>
      </div>
    </section>
  );
}
