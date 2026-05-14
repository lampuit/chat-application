"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  applyEmailVerificationCode,
  reloadCurrentUser,
} from "@/lib/auth/auth-service";

type VerifyEmailRouteProps = {
  mode?: string;
  oobCode?: string;
};

export function VerifyEmailRoute({ mode, oobCode }: VerifyEmailRouteProps) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (mode !== "verifyEmail" || !oobCode) {
      setStatus("error");
      setMessage("This verification link is invalid or incomplete.");
      return;
    }

    void applyEmailVerificationCode(oobCode)
      .then(async () => {
        await reloadCurrentUser().catch(() => undefined);
        setStatus("success");
        setMessage("Your email has been verified successfully.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("This verification link is invalid or has expired.");
      });
  }, [mode, oobCode]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,32,0.08)]">
        <h1 className="text-3xl font-semibold text-slate-950">Verify email</h1>
        <p
          className={`mt-4 text-sm ${
            status === "error" ? "text-rose-600" : "text-slate-600"
          }`}
        >
          {message}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            className="rounded-2xl bg-sky-900 px-5 py-3 text-center text-sm font-medium text-white"
            href={status === "success" ? "/chat" : "/login"}
          >
            {status === "success" ? "Continue to chat" : "Back to login"}
          </Link>
          {status === "error" ? (
            <p className="text-sm text-slate-600">
              You can sign in and request a new verification email from the app.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
