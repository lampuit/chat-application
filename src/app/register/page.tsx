import { PublicOnlyRoute } from "@/components/auth/public-only-route";
import { RegisterForm } from "@/components/auth/register-form";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <PublicOnlyRoute>
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,32,0.08)]">
          <h1 className="text-3xl font-semibold text-slate-950">Register</h1>
          <p className="mt-2 text-sm text-slate-500">
            Create an account to begin realtime messaging.
          </p>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link className="font-medium text-sky-900 underline-offset-4 hover:underline" href="/login">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </PublicOnlyRoute>
  );
}
