import React, { useEffect, useState } from "react";
import { validateChatUpload } from "@/lib/chat/upload-constraints";

type MessageComposerProps = {
  disabled: boolean;
  errorMessage: string | null;
  isUploading: boolean;
  value: string;
  onChange: (value: string) => void;
  onSend: (file?: File) => void;
};

export function MessageComposer({
  disabled,
  errorMessage,
  isUploading,
  value,
  onChange,
  onSend,
}: MessageComposerProps) {
  const isComposerDisabled = disabled || isUploading;
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isUploading) {
      setLocalErrorMessage(null);
    }
  }, [isUploading]);

  const displayedErrorMessage = localErrorMessage ?? errorMessage;

  return (
    <div className="border-t border-black/5 bg-white/70 p-4 backdrop-blur-sm sm:p-5">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          if (isComposerDisabled) {
            return;
          }
          onSend();
        }}
      >
        <div className="flex w-full items-center gap-3">
          <input
            className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            disabled={isComposerDisabled}
            onChange={(event) => {
              setLocalErrorMessage(null);
              onChange(event.target.value);
            }}
            placeholder="Type your message"
            value={value}
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-50">
            <input
              aria-label="Attach file"
              className="hidden"
              disabled={isComposerDisabled}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && !isComposerDisabled) {
                  const validationError = validateChatUpload(file);

                  if (validationError) {
                    setLocalErrorMessage(validationError);
                    e.currentTarget.value = "";
                    return;
                  }

                  setLocalErrorMessage(null);
                  onSend(file);
                }
                e.currentTarget.value = "";
              }}
              type="file"
            />
            <span className="text-sm">Attach</span>
          </label>
        </div>

        <button
          className="rounded-2xl bg-emerald-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[6rem]"
          disabled={isComposerDisabled || !value.trim()}
          type="submit"
        >
          {isUploading ? "Uploading..." : "Send"}
        </button>
      </form>
      {displayedErrorMessage ? (
        <p className="mt-3 text-sm text-rose-600">{displayedErrorMessage}</p>
      ) : null}
    </div>
  );
}
