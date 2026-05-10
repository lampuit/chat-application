import React from "react";

type MessageThreadProps = {
  hasSelection: boolean;
  messages: Array<{
    id: string;
    senderLabel: string;
    text: string;
    createdAtLabel: string;
    isOwnMessage: boolean;
  }>;
};

export function MessageThread({ hasSelection, messages }: MessageThreadProps) {
  if (!hasSelection) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
        <div className="max-w-sm space-y-2">
          <p className="text-base font-medium text-slate-700">
            Choose a conversation to start messaging.
          </p>
          <p className="text-sm text-slate-500">
            Your thread will appear here with the latest messages anchored to the
            bottom.
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
        <div className="max-w-sm space-y-2">
          <p className="text-base font-medium text-slate-700">No messages yet.</p>
          <p className="text-sm text-slate-500">
            Send the first message to kick off this conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      {messages.map((message) => (
        <li
          key={message.id}
          className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
              message.isOwnMessage
                ? "bg-emerald-950 text-white shadow-[0_10px_24px_rgba(5,46,22,0.18)]"
                : "border border-black/5 bg-white text-slate-900"
            }`}
          >
            <div
              className={`mb-1 flex items-center gap-3 text-xs ${
                message.isOwnMessage ? "justify-end" : "justify-between"
              }`}
            >
              {!message.isOwnMessage ? (
                <span className="font-medium text-slate-900">
                  {message.senderLabel}
                </span>
              ) : null}
              <span
                className={`${
                  message.isOwnMessage ? "text-emerald-100" : "text-slate-400"
                }`}
              >
                {message.createdAtLabel}
              </span>
            </div>
            <p
              className={`text-sm leading-6 ${
                message.isOwnMessage ? "text-white" : "text-slate-600"
              }`}
            >
              {message.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
