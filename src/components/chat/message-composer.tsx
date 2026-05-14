import React, { useEffect, useState, useRef } from "react";
import { validateChatUpload } from "@/lib/chat/upload-constraints";

const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
);
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 ml-0.5">
    <path d="m22 2-7 20-4-9-9-4Z"/>
    <path d="M22 2 11 13"/>
  </svg>
);
const Loader2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isUploading) {
      setLocalErrorMessage(null);
      inputRef.current?.focus();
    }
  }, [isUploading]);

  const displayedErrorMessage = localErrorMessage ?? errorMessage;

  return (
    <div className="border-t border-slate-900/5 bg-[rgba(255,255,255,0.9)] p-4 backdrop-blur-xl sm:p-5">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          if (isComposerDisabled || (!value.trim() && !isUploading)) {
            return;
          }
          onSend();
        }}
      >
        <div className="flex w-full items-center gap-2 rounded-[1.4rem] border border-slate-200/80 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition-all focus-within:border-teal-300 focus-within:ring-4 focus-within:ring-teal-100">
          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-teal-600">
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
            <PaperclipIcon />
          </label>
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            disabled={isComposerDisabled}
            onChange={(event) => {
              setLocalErrorMessage(null);
              onChange(event.target.value);
            }}
            placeholder="Type your message..."
            value={value}
            autoComplete="off"
          />
          <button
            aria-label={isUploading ? "Uploading..." : "Send"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
              isComposerDisabled || !value.trim()
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_14px_28px_rgba(15,23,42,0.18)] active:translate-y-0"
            }`}
            disabled={isComposerDisabled || !value.trim()}
            type="submit"
          >
            {isUploading ? (
              <Loader2Icon />
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
      </form>
      {displayedErrorMessage ? (
        <p className="mt-3 text-sm font-medium text-rose-500 animate-in slide-in-from-top-1 fade-in-0">
          {displayedErrorMessage}
        </p>
      ) : null}
    </div>
  );
}
