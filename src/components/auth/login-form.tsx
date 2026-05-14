"use client";

import React, { useState, useTransition } from "react";
import {
  completeTotpSignIn,
  loginWithEmailAndPassword,
} from "@/lib/auth/auth-service";
import type { TotpSignInChallenge } from "@/types/auth";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [challenge, setChallenge] = useState<TotpSignInChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetChallenge() {
    setChallenge(null);
    setVerificationCode("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (challenge) {
          await completeTotpSignIn(challenge, verificationCode);
          return;
        }

        const result = await loginWithEmailAndPassword(email, password);

        if (result.status === "mfa-required") {
          setChallenge(result.challenge);
          return;
        }
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to login.",
        );
      }
    });
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
          disabled={Boolean(challenge)}
          onChange={(event) => {
            resetChallenge();
            setEmail(event.target.value);
          }}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
          disabled={Boolean(challenge)}
          minLength={6}
          onChange={(event) => {
            resetChallenge();
            setPassword(event.target.value);
          }}
          required
          type="password"
          value={password}
        />
      </label>
      {challenge ? (
        <>
          <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Enter the 6-digit code from {challenge.displayName ?? "your authenticator app"}.
          </p>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Authentication code</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm tracking-[0.35em] outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setVerificationCode(event.target.value)}
              pattern="[0-9]{6}"
              required
              type="text"
              value={verificationCode}
            />
          </label>
        </>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:bg-slate-300 disabled:translate-y-0"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Signing in..." : challenge ? "Verify code" : "Login"}
      </button>
    </form>
  );
}
