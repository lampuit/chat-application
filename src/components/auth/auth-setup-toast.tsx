"use client";

import React, { useEffect, useState, useTransition } from "react";
import { reloadCurrentUser, sendCurrentUserVerificationEmail } from "@/lib/auth/auth-service";
import { useAuth } from "@/components/auth/auth-provider";

export function AuthSetupToast() {
  const { refreshUser, user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!user || user.emailVerified) {
      setIsDismissed(false);
      setMessage(null);
      setError(null);
      return;
    }

    setIsDismissed(false);
  }, [user?.uid, user?.emailVerified]);

  if (!user || user.emailVerified || isDismissed) {
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
          setMessage("Email verified. Your account setup is up to date.");
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
    <section
      aria-label="Email verification reminder"
      className="pointer-events-none fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))]"
      role="region"
    >
      <div className="pointer-events-auto rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_rgba(15,23,32,0.18)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="heading-font text-lg font-semibold tracking-[-0.04em] text-slate-950">Verify your email</h2>
            <p className="text-sm text-slate-600">
              Verify <span className="font-medium">{user.email}</span> before enabling
              Google Authenticator 2-step verification.
            </p>
          </div>
          <button
            aria-label="Dismiss email verification reminder"
            className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
            onClick={() => setIsDismissed(true)}
            type="button"
          >
            Dismiss
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:bg-slate-300 disabled:translate-y-0"
            disabled={isPending}
            onClick={handleResend}
            type="button"
          >
            {isPending ? "Sending..." : "Resend verification email"}
          </button>
          <button
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-all hover:-translate-y-0.5 hover:bg-white disabled:bg-slate-100 disabled:translate-y-0"
            disabled={isPending}
            onClick={handleRefresh}
            type="button"
          >
            {isPending ? "Checking..." : "I've verified my email"}
          </button>
        </div>

        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </div>
    </section>
  );
}
