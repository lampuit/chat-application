import React from "react";
import { PublicOnlyRoute } from "@/components/auth/public-only-route";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <PublicOnlyRoute>
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2.25rem] border border-white/70 bg-[rgba(255,255,255,0.72)] shadow-[0_32px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden bg-[linear-gradient(160deg,rgba(15,23,42,0.98),rgba(15,118,110,0.88))] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_30%)]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur">
                Secure access
              </div>
              <h1 className="heading-font max-w-lg text-5xl font-semibold tracking-[-0.06em]">
                A calmer, cleaner place to pick up your conversations.
              </h1>
              <p className="max-w-md text-sm leading-6 text-white/70">
                Sign in and continue from the same polished workspace across chat, groups, and account setup.
              </p>
            </div>
            <div className="relative grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Fast</p>
                <p className="mt-2 text-sm font-medium text-white">Instant access to your room</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Private</p>
                <p className="mt-2 text-sm font-medium text-white">Protected by Firebase auth</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">Ready</p>
                <p className="mt-2 text-sm font-medium text-white">Built for 1:1 and groups</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-md rounded-[2rem] border border-slate-200/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-9">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-600">Welcome back</p>
                <h1 className="heading-font text-3xl font-semibold tracking-[-0.05em] text-slate-950">Login</h1>
                <p className="text-sm text-slate-500">
                  Continue with your email and password.
                </p>
              </div>
              <LoginForm />
              <p className="mt-6 text-center text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link className="font-semibold text-teal-700 underline-offset-4 transition hover:text-teal-800 hover:underline" href="/register">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </PublicOnlyRoute>
  );
}
