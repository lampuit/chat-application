"use client";

import React, { useState, useTransition } from "react";
import {
  registerWithEmailAndPassword,
  reloadCurrentUser,
  sendCurrentUserVerificationEmail,
} from "@/lib/auth/auth-service";

export function RegisterForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAwaitingVerification, setIsAwaitingVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const credential = await registerWithEmailAndPassword(email, password, displayName);
        await sendCurrentUserVerificationEmail({
          currentUser: credential.user,
        });
        setIsAwaitingVerification(true);
        setVerificationMessage(null);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to register.",
        );
      }
    });
  }

  function handleResend() {
    setError(null);
    setVerificationMessage(null);

    startTransition(async () => {
      try {
        await sendCurrentUserVerificationEmail();
        setVerificationMessage("Verification email sent again.");
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to resend verification email.",
        );
      }
    });
  }

  function handleRefreshVerification() {
    setError(null);
    setVerificationMessage(null);

    startTransition(async () => {
      try {
        const user = await reloadCurrentUser();

        if (user.emailVerified) {
          setVerificationMessage("Email verified. You can now enable 2-step verification.");
          setIsAwaitingVerification(false);
          return;
        }

        setVerificationMessage("Your email is not verified yet. Please check your inbox.");
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to refresh verification status.",
        );
      }
    });
  }

  if (isAwaitingVerification || verificationMessage === "Email verified. You can now enable 2-step verification.") {
    return (
      <div className="mt-8 space-y-4">
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
          <h2 className="text-lg font-semibold text-slate-950">Check your email</h2>
          <p className="mt-2 text-sm text-slate-600">
            We sent a verification link to <span className="font-medium">{email}</span>.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Verify your email before enabling Google Authenticator 2-step verification.
          </p>
        </div>
        {verificationMessage ? (
          <p className="text-sm text-emerald-700">{verificationMessage}</p>
        ) : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <button
          className="w-full rounded-2xl bg-sky-900 px-5 py-3 text-sm font-medium text-white disabled:bg-slate-300"
          disabled={isPending}
          onClick={handleResend}
          type="button"
        >
          {isPending ? "Sending..." : "Resend verification email"}
        </button>
        <button
          className="w-full rounded-2xl border border-black/10 bg-stone-50 px-5 py-3 text-sm font-medium text-slate-900 disabled:bg-slate-100"
          disabled={isPending}
          onClick={handleRefreshVerification}
          type="button"
        >
          {isPending ? "Checking..." : "I've verified my email"}
        </button>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Display name</span>
        <input
          className="w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm outline-none"
          onChange={(event) => setDisplayName(event.target.value)}
          required
          type="text"
          value={displayName}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          className="w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm outline-none"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          className="w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm outline-none"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        className="w-full rounded-2xl bg-sky-900 px-5 py-3 text-sm font-medium text-white disabled:bg-slate-300"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Creating account..." : "Register"}
      </button>
    </form>
  );
}
