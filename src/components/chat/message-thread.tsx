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
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-slate-500">
        Choose a conversation to start messaging.
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-slate-500">
        No messages yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-6">
      {messages.map((message) => (
        <li
          key={message.id}
          className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
              message.isOwnMessage
                ? "bg-emerald-900 text-white"
                : "border border-black/5 bg-white text-slate-900"
            }`}
          >
            <div
              className={`mb-1 flex items-center gap-3 ${
                message.isOwnMessage ? "justify-end" : "justify-between"
              }`}
            >
              {!message.isOwnMessage ? (
                <span className="text-sm font-medium text-slate-900">
                  {message.senderLabel}
                </span>
              ) : null}
              <span
                className={`text-xs ${
                  message.isOwnMessage ? "text-emerald-100" : "text-slate-400"
                }`}
              >
                {message.createdAtLabel}
              </span>
            </div>
            <p
              className={`text-sm ${
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
