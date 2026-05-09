import React from "react";

export function AppBrand() {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium uppercase tracking-[0.4em] text-emerald-700">
        Technical Test
      </p>
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
          Realtime Chat
        </h1>
        <p className="max-w-xl text-base text-slate-600">
          Firebase-backed direct messaging with multi-device authentication and
          realtime delivery.
        </p>
      </div>
    </div>
  );
}
