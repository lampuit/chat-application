"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import {
  finalizeTotpEnrollment,
  startTotpEnrollment,
} from "@/lib/auth/auth-service";
import { renderQrCodeToCanvas } from "@/lib/auth/qr-code";
import { useAuth } from "@/components/auth/auth-provider";
import type { TotpEnrollment } from "@/types/auth";

export function TwoFactorSettings() {
  const { refreshUser, user } = useAuth();
  const [setup, setSetup] = useState<TotpEnrollment | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasTotpEnrollment = Boolean(user?.hasTotpEnrollment);

  useEffect(() => {
    if (!setup || !canvasRef.current) {
      return;
    }

    void renderQrCodeToCanvas(canvasRef.current, setup.qrCodeUrl).catch(() => {
      setError("Unable to render the Google Authenticator QR code.");
    });
  }, [setup]);

  if (!user) {
    return null;
  }

  if (hasTotpEnrollment) {
    return null;
  }

  function handleStartSetup() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const nextSetup = await startTotpEnrollment(currentPassword);
        setSetup(nextSetup);
        setCurrentPassword("");
      } catch (setupError) {
        setError(
          setupError instanceof Error
            ? setupError.message
            : "Unable to start 2-step verification setup.",
        );
      }
    });
  }

  function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!setup) {
      return;
    }

    startTransition(async () => {
      try {
        await finalizeTotpEnrollment({
          secret: setup.secret,
          verificationCode,
          displayName: "Google Authenticator",
        });
        await refreshUser?.();
        setSetup(null);
        setVerificationCode("");
        setSuccessMessage("2-step verification is now enabled.");
      } catch (verifyError) {
        setError(
          verifyError instanceof Error
            ? verifyError.message
            : "Unable to verify the authenticator code.",
        );
      }
    });
  }

  return (
    <section className="rounded-3xl border border-white/70 bg-[rgba(255,255,255,0.8)] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="heading-font text-lg font-semibold tracking-[-0.04em] text-slate-950">2-step verification</h2>
          <p className="text-sm text-slate-600">
            Protect your account with a 6-digit code from Google Authenticator.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasTotpEnrollment
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
              : "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200"
          }`}
        >
          {hasTotpEnrollment ? "Enabled" : "Not enabled"}
        </span>
      </div>

      {!user.emailVerified ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verify your email before enabling 2-step verification.
        </p>
      ) : null}

      {user.emailVerified && !setup ? (
        <div className="mt-4 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Current password</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm outline-none transition focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-100"
              autoComplete="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </label>
          <p className="text-sm text-slate-600">
            Firebase requires you to confirm your password before generating a new
            authenticator secret.
          </p>
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:bg-slate-300 disabled:translate-y-0"
            disabled={isPending}
            onClick={handleStartSetup}
            type="button"
          >
            {isPending ? "Preparing setup..." : "Set up Google Authenticator"}
          </button>
        </div>
      ) : null}

      {setup ? (
        <form className="mt-5 space-y-4" onSubmit={handleVerify}>
          <div className="rounded-3xl border border-black/10 bg-stone-50 p-4">
            <canvas
              aria-label="Google Authenticator QR code"
              className="mx-auto rounded-2xl bg-white p-3 shadow-sm"
              ref={canvasRef}
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Manual setup key</p>
            <p className="mt-2 break-all font-mono">{setup.secretKey}</p>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Authenticator code</span>
            <input
              className="w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm tracking-[0.35em] outline-none"
              inputMode="numeric"
              maxLength={setup.codeLength}
              onChange={(event) => setVerificationCode(event.target.value)}
              pattern={`[0-9]{${setup.codeLength}}`}
              required
              type="text"
              value={verificationCode}
            />
          </label>
          <button
            className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:bg-slate-300 disabled:translate-y-0"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Verifying..." : "Enable 2-step verification"}
          </button>
        </form>
      ) : null}

      {successMessage ? <p className="mt-4 text-sm text-emerald-700">{successMessage}</p> : null}
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
