import React from "react";
import { PublicOnlyRoute } from "@/components/auth/public-only-route";
import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <PublicOnlyRoute>
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2.25rem] border border-white/70 bg-[rgba(255,255,255,0.72)] shadow-[0_32px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative hidden overflow-hidden bg-[linear-gradient(160deg,rgba(15,118,110,0.95),rgba(15,23,42,0.96))] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_30%)]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur">
                Create your space
              </div>
              <h1 className="heading-font max-w-lg text-5xl font-semibold tracking-[-0.06em]">
                Build your account and start a cleaner chat experience.
              </h1>
              <p className="max-w-md text-sm leading-6 text-white/70">
                Create a profile, verify your email, and turn on two-factor verification when you are ready.
              </p>
            </div>
            <div className="relative grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Profile</p>
                <p className="mt-2 text-sm font-medium text-white">Set your display name</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Verify</p>
                <p className="mt-2 text-sm font-medium text-white">Confirm your inbox</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Protect</p>
                <p className="mt-2 text-sm font-medium text-white">Enable 2-step login</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-9">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-600">Join now</p>
                <h1 className="heading-font text-3xl font-semibold tracking-[-0.05em] text-slate-950">Register</h1>
                <p className="text-sm text-slate-500">
                  Create an account to begin realtime messaging.
                </p>
              </div>
              <RegisterForm />
              <p className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link className="font-semibold text-teal-700 underline-offset-4 transition hover:text-teal-800 hover:underline" href="/login">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </PublicOnlyRoute>
  );
}
