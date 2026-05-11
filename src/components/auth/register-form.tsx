"use client";

import React, { useState, useTransition } from "react";
import { registerWithEmailAndPassword } from "@/lib/auth/auth-service";

export function RegisterForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await registerWithEmailAndPassword(email, password, displayName);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to register.",
        );
      }
    });
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
