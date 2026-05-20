import React from "react";
import { logout } from "@/lib/auth/auth-service";
import type { User } from "@/lib/auth/types";

interface ChatClientHeaderProps {
  currentUser: User;
  displayName: string;
  displayNameInitials: string;
  hasTotpEnrollment: boolean;
}

export function ChatClientHeader({
  currentUser,
  displayName,
  displayNameInitials,
  hasTotpEnrollment,
}: ChatClientHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[rgba(255,255,255,0.82)] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_32%)]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-teal-500/90 to-sky-500/90 text-lg font-bold text-white shadow-[0_14px_32px_rgba(8,145,178,0.18)] ring-1 ring-inset ring-white/60 backdrop-blur">
            {displayNameInitials || "RC"}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-600">
              Active Session
            </p>
            <h1 className="heading-font truncate text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
              {displayName}
            </h1>
            <p className="truncate text-sm text-slate-500">
              {currentUser.email ?? "Active account"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {currentUser.displayName ? (
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200/70 backdrop-blur">
              Profile ready
            </span>
          ) : null}
          {hasTotpEnrollment ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
              2-step enabled
            </span>
          ) : null}
          <button
            className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
            onClick={() => void logout()}
            type="button"
          >
            Logout
          </button>
        </div>
      </div>
      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Status</p>
          <p className="mt-1 text-sm font-medium text-slate-900">Ready to chat</p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Security</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {hasTotpEnrollment ? "2-step active" : "2-step available"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Session</p>
          <p className="mt-1 text-sm font-medium text-slate-900">Live workspace</p>
        </div>
      </div>
    </div>
  );
}
