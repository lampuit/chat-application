import React from "react";
import { PublicOnlyRoute } from "@/components/auth/public-only-route";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <PublicOnlyRoute>
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,32,0.08)]">
          <h1 className="text-3xl font-semibold text-slate-950">Login</h1>
          <p className="mt-2 text-sm text-slate-500">
            Continue with your email and password.
          </p>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link className="font-medium text-sky-900 underline-offset-4 hover:underline" href="/register">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </PublicOnlyRoute>
  );
}
