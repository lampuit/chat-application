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
  const { user } = useAuth();
  const [setup, setSetup] = useState<TotpEnrollment | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  function handleStartSetup() {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const nextSetup = await startTotpEnrollment();
        setSetup(nextSetup);
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
    <section className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">2-step verification</h2>
        <p className="text-sm text-slate-600">
          Protect your account with a 6-digit code from Google Authenticator.
        </p>
      </div>

      {!user.emailVerified ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verify your email before enabling 2-step verification.
        </p>
      ) : null}

      {user.emailVerified && !setup && !successMessage ? (
        <button
          className="mt-4 rounded-2xl bg-sky-900 px-4 py-3 text-sm font-medium text-white disabled:bg-slate-300"
          disabled={isPending}
          onClick={handleStartSetup}
          type="button"
        >
          {isPending ? "Preparing setup..." : "Set up Google Authenticator"}
        </button>
      ) : null}

      {setup ? (
        <form className="mt-5 space-y-4" onSubmit={handleVerify}>
          <div className="rounded-3xl border border-black/10 bg-stone-50 p-4">
            <canvas
              aria-label="Google Authenticator QR code"
              className="mx-auto rounded-2xl bg-white p-3"
              ref={canvasRef}
            />
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm text-slate-700">
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
            className="w-full rounded-2xl bg-sky-900 px-5 py-3 text-sm font-medium text-white disabled:bg-slate-300"
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
