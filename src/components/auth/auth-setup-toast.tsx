"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import {
  finalizeTotpEnrollment,
  reloadCurrentUser,
  sendCurrentUserVerificationEmail,
  startTotpEnrollment,
} from "@/lib/auth/auth-service";
import { renderQrCodeToCanvas } from "@/lib/auth/qr-code";
import { useAuth } from "@/components/auth/auth-provider";
import type { TotpEnrollment } from "@/types/auth";

type SetupStep = "verify-email" | "setup-2fa" | null;

export function AuthSetupToast() {
  const { refreshUser, user } = useAuth();
  const [step, setStep] = useState<SetupStep>(null);
  const [setup, setSetup] = useState<TotpEnrollment | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEnrollmentComplete, setIsEnrollmentComplete] = useState(false);
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

  useEffect(() => {
    if (!user) {
      setStep(null);
      return;
    }

    if (user.displayName) {
      setStep(null);
      return;
    }

    if (!user.emailVerified) {
      setStep("verify-email");
      setIsEnrollmentComplete(false);
      return;
    }

    if (!user.hasTotpEnrollment && !isEnrollmentComplete) {
      setStep("setup-2fa");
      return;
    }

    if (user.hasTotpEnrollment) {
      setIsEnrollmentComplete(true);
      setStep(null);
      return;
    }

    if (isEnrollmentComplete) {
      setStep("setup-2fa");
    }
  }, [isEnrollmentComplete, user]);

  if (!user || !step) {
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
          setStep("setup-2fa");
          setSetup(null);
          setMessage("Email verified. You can now enable 2-step verification.");
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

  function handleStartSetup() {
    setError(null);
    setMessage(null);

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
        setIsEnrollmentComplete(true);
        setMessage("2-step verification is now enabled.");
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
    <section className="pointer-events-none fixed bottom-4 right-4 z-50 w-[min(26rem,calc(100vw-2rem))]">
      <div className="pointer-events-auto rounded-[2rem] border border-black/10 bg-white/95 p-5 shadow-[0_24px_80px_rgba(15,23,32,0.18)] backdrop-blur">
        {step === "verify-email" ? (
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">Verify your email</h2>
              <p className="text-sm text-slate-600">
                Verify <span className="font-medium">{user.email}</span> before enabling
                Google Authenticator 2-step verification.
              </p>
            </div>
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
                className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm font-medium text-slate-900 disabled:bg-slate-100"
                disabled={isPending}
                onClick={handleRefresh}
                type="button"
              >
                {isPending ? "Checking..." : "I've verified my email"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-950">2-step verification</h2>
              <p className="text-sm text-slate-600">
                Protect your account with a 6-digit code from Google Authenticator.
              </p>
            </div>

            {!setup && !isEnrollmentComplete ? (
              <div className="mt-4 space-y-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Current password</span>
                  <input
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-black/10 bg-stone-50 px-4 py-3 text-sm outline-none"
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
                  className="rounded-2xl bg-sky-900 px-4 py-3 text-sm font-medium text-white disabled:bg-slate-300"
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
          </>
        )}

        {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </div>
    </section>
  );
}
