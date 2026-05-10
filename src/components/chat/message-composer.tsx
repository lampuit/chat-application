import React from "react";

type MessageComposerProps = {
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

export function MessageComposer({
  disabled,
  value,
  onChange,
  onSend,
}: MessageComposerProps) {
  return (
    <div className="border-t border-black/5 bg-white/70 p-4 backdrop-blur-sm sm:p-5">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type your message"
          value={value}
        />
        <button
          className="rounded-2xl bg-emerald-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[6rem]"
          disabled={disabled || !value.trim()}
          type="submit"
        >
          Send
        </button>
      </form>
    </div>
  );
}
