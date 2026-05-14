import React from "react";

export function AppBrand() {
  return (
    <span className="inline-flex items-center gap-2 text-slate-950">
      <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 text-sm font-bold text-white shadow-[0_12px_32px_rgba(8,145,178,0.28)]">
        RC
      </span>
      <span className="heading-font text-base font-semibold tracking-[-0.04em] sm:text-lg">
        Realtime Chat
      </span>
    </span>
  );
}
