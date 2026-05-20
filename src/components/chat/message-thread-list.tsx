import React from "react";
import { DownloadIcon, ReceiptCheckIcon, isNearBottom } from "./message-thread-icons";

type MessageItemProps = {
  id: string;
  senderLabel: string;
  text: string;
  createdAtLabel: string;
  isOwnMessage: boolean;
  receiptLabel?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
};

interface MessageListProps {
  messages: MessageItemProps[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

function MessageItem({ message, index, messages }: { message: MessageItemProps; index: number; messages: MessageItemProps[] }) {
  const showAvatar = !message.isOwnMessage && (index === 0 || messages[index - 1]?.isOwnMessage || messages[index - 1]?.senderLabel !== message.senderLabel);
  const initials = message.senderLabel.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "U";
  const receiptToneClass = message.receiptLabel === "Seen"
    ? "bg-emerald-400/18 text-emerald-50 ring-1 ring-emerald-200/25"
    : "bg-white/14 text-sky-50 ring-1 ring-white/18";
  const bgClass = message.isOwnMessage
    ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-[1.35rem] rounded-br-sm shadow-[0_14px_30px_rgba(15,118,110,0.18)]"
    : "bg-white border border-slate-100 text-slate-900 rounded-[1.35rem] rounded-bl-sm shadow-[0_10px_24px_rgba(15,23,42,0.05)]";
  return (
    <li className={`flex w-full ${message.isOwnMessage ? "justify-end" : "justify-start"} animate-in fade-in-0 slide-in-from-bottom-2`}>
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
              <span className="text-xs font-medium text-slate-700">{message.senderLabel}</span>
            </div>
          )}
          <div className={`relative px-4 py-3 shadow-sm ${bgClass}`}>
            {message.fileUrl && message.fileType?.startsWith("image/") ? (
              <a href={message.fileUrl} target="_blank" rel="noreferrer" className="block group">
                <div className="overflow-hidden rounded-xl bg-black/5">
                  <img src={message.fileUrl} alt={message.fileName ?? "image"} className="max-h-[40vh] w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
                </div>
                {message.text && (
                  <p className={`mt-3 text-[15px] leading-relaxed ${message.isOwnMessage ? "text-sky-50" : "text-slate-700"}`}>
                    {message.text}
                  </p>
                )}
              </a>
            ) : message.fileUrl ? (
              <div className="space-y-3">
                <a href={message.fileUrl} target="_blank" rel="noreferrer" download={message.fileName}
                  className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${message.isOwnMessage ? "bg-sky-700/50 hover:bg-sky-700 text-white" : "bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-700"}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${message.isOwnMessage ? "bg-sky-600" : "bg-white shadow-sm"}`}>
                    <DownloadIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{message.fileName ?? "Download file"}</p>
                    <p className={`text-xs ${message.isOwnMessage ? "text-sky-200" : "text-slate-500"}`}>Click to download</p>
                  </div>
                </a>
                {message.text && (
                  <p className={`text-[15px] leading-relaxed ${message.isOwnMessage ? "text-sky-50" : "text-slate-700"}`}>
                    {message.text}
                  </p>
                )}
              </div>
            ) : (
              <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${message.isOwnMessage ? "text-white" : "text-slate-700"}`}>
                {message.text}
              </p>
            )}
            <div className={`mt-1 flex items-center gap-1 text-[11px] ${message.isOwnMessage ? "text-sky-100/80 justify-end" : "text-slate-400 justify-start"}`}>
              {message.createdAtLabel}
              {message.isOwnMessage && message.receiptLabel && (
                <>
                  <span aria-hidden="true">.</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${receiptToneClass}`} data-testid={`receipt-${message.receiptLabel.toLowerCase()}`}>
                    <ReceiptCheckIcon className="h-3.5 w-3.5" double={message.receiptLabel === "Seen"} />
                    <span>{message.receiptLabel}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function MessageList({ messages, scrollContainerRef, bottomRef, onScroll }: MessageListProps) {
  return (
    <div ref={scrollContainerRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-6 pb-8 sm:px-6 sm:pb-10 custom-scrollbar" onScroll={onScroll}>
      <ul className="flex flex-col gap-5">
        {messages.map((message, index) => (
          <MessageItem key={message.id} message={message} index={index} messages={messages} />
        ))}
      </ul>
      <div ref={bottomRef} aria-hidden="true" className="h-1 shrink-0" />
    </div>
  );
}
