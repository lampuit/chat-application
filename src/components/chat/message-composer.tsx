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
    <div className="border-t border-black/5 p-4">
      <div className="flex gap-3">
        <input
          className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type your message"
          value={value}
        />
        <button
          className="rounded-2xl bg-emerald-900 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={disabled || !value.trim()}
          onClick={onSend}
          type="button"
        >
          Send
        </button>
      </div>
    </div>
  );
}
