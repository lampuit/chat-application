import React, { useEffect, useRef } from "react";

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const DownloadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" x2="12" y1="15" y2="3"/>
  </svg>
);

type MessageThreadProps = {
  hasSelection: boolean;
  isLoading: boolean;
  messages: Array<{
    id: string;
    senderLabel: string;
    text: string;
    createdAtLabel: string;
    isOwnMessage: boolean;
    receiptLabel?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
  }>;
};

export function MessageThread({ hasSelection, isLoading, messages }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!hasSelection) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-slate-950 to-slate-700 shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-inset ring-white/10">
          <MessageSquareIcon className="h-9 w-9 text-white/70" />
        </div>
        <div className="max-w-sm space-y-2">
          <p className="heading-font text-xl font-semibold tracking-[-0.04em] text-slate-950">
            Your Messages
          </p>
          <p className="text-sm text-slate-500">
            Select a conversation from the sidebar to start messaging, or create a new one.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6 custom-scrollbar"
        data-testid="message-thread-skeleton"
      >
        {Array.from({ length: 4 }).map((_, index) => {
          const isOwnBubble = index % 2 === 1;

          return (
            <div
              key={`message-skeleton-${index}`}
              className={`flex w-full ${isOwnBubble ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex max-w-[85%] sm:max-w-[75%] gap-2 ${isOwnBubble ? "flex-row-reverse" : "flex-row"}`}>
                {!isOwnBubble ? (
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200" />
                ) : null}
                <div className="space-y-2">
                  {!isOwnBubble ? (
                    <div className="h-3 w-20 animate-pulse rounded-full bg-slate-100" />
                  ) : null}
                  <div className={`rounded-2xl px-4 py-3 ${isOwnBubble ? "bg-sky-100" : "border border-slate-100 bg-white"}`}>
                    <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-2 h-4 w-32 animate-pulse rounded-full bg-slate-100" />
                    <div className="mt-3 h-3 w-16 animate-pulse rounded-full bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-sky-500 to-teal-500 shadow-[0_24px_60px_rgba(8,145,178,0.18)] ring-1 ring-inset ring-white/30">
          <MessageSquareIcon className="h-9 w-9 text-white/90" />
        </div>
        <div className="max-w-sm space-y-2">
          <p className="heading-font text-xl font-semibold tracking-[-0.04em] text-slate-950">No messages yet</p>
          <p className="text-sm text-slate-500">
            Send the first message to kick off this conversation. Say hello!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 custom-scrollbar">
      <ul className="flex flex-col gap-5">
        {messages.map((message, index) => {
          const showAvatar = !message.isOwnMessage && (index === 0 || messages[index - 1].isOwnMessage || messages[index - 1].senderLabel !== message.senderLabel);
          const initials = message.senderLabel
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase() || "U";

          return (
            <li
              key={message.id}
              className={`flex w-full ${message.isOwnMessage ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-2`}
            >
              <div className={`flex max-w-[85%] sm:max-w-[75%] gap-2 ${message.isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
                
                {!message.isOwnMessage && (
                  <div className="flex flex-col justify-end">
                    {showAvatar ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 shadow-sm">
                        {initials}
                      </div>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-0">
                  {!message.isOwnMessage && showAvatar && (
                    <div className="ml-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-700">
                        {message.senderLabel}
                      </span>
                    </div>
                  )}

                  <div
                    className={`relative px-4 py-3 shadow-sm ${
                      message.isOwnMessage
                        ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-[1.35rem] rounded-br-sm shadow-[0_14px_30px_rgba(15,118,110,0.18)]"
                        : "bg-white border border-slate-100 text-slate-900 rounded-[1.35rem] rounded-bl-sm shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                    }`}
                  >
                    {message.fileUrl && message.fileType?.startsWith("image/") ? (
                      <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block group">
                        <div className="overflow-hidden rounded-xl bg-black/5">
                          <img
                            src={message.fileUrl}
                            alt={message.fileName ?? "image"}
                            className="max-h-[40vh] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        {message.text ? (
                          <p className={`mt-3 text-[15px] leading-relaxed ${message.isOwnMessage ? "text-sky-50" : "text-slate-700"}`}>
                            {message.text}
                          </p>
                        ) : null}
                      </a>
                    ) : message.fileUrl ? (
                      <div className="space-y-3">
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={message.fileName}
                          className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                            message.isOwnMessage
                              ? "bg-sky-700/50 hover:bg-sky-700 text-white"
                              : "bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            message.isOwnMessage ? "bg-sky-600" : "bg-white shadow-sm"
                          }`}>
                            <DownloadIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {message.fileName ?? "Download file"}
                            </p>
                            <p className={`text-xs ${message.isOwnMessage ? "text-sky-200" : "text-slate-500"}`}>
                              Click to download
                            </p>
                          </div>
                        </a>
                        {message.text ? (
                          <p className={`text-[15px] leading-relaxed ${message.isOwnMessage ? "text-sky-50" : "text-slate-700"}`}>
                            {message.text}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${
                        message.isOwnMessage ? "text-white" : "text-slate-700"
                      }`}>
                        {message.text}
                      </p>
                    )}
                    
                    <div className={`mt-1 flex items-center gap-1 text-[11px] ${
                      message.isOwnMessage ? "text-sky-100/80 justify-end" : "text-slate-400 justify-start"
                    }`}>
                      {message.createdAtLabel}
                      {message.isOwnMessage && message.receiptLabel ? (
                        <>
                          <span aria-hidden="true">.</span>
                          <span>{message.receiptLabel}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
