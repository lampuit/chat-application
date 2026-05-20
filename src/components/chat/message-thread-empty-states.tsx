import React from "react";
import { MessageSquareIcon } from "./message-thread-icons";

export function NoConversationSelected() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center text-sm text-slate-500">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-slate-950 to-slate-700 shadow-[0_24px_60px_rgba(15,23,42,0.18)] ring-1 ring-inset ring-white/10">
        <MessageSquareIcon className="h-9 w-9 text-white/70" />
      </div>
      <div className="max-w-sm space-y-2">
        <p className="heading-font text-xl font-semibold tracking-[-0.04em] text-slate-950">Your Messages</p>
        <p className="text-sm text-slate-500">
          Select a conversation from the sidebar to start messaging, or create a new one.
        </p>
      </div>
    </div>
  );
}

export function MessageThreadSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6 custom-scrollbar" data-testid="message-thread-skeleton">
      {Array.from({ length: 4 }).map((_, index) => {
        const isOwnBubble = index % 2 === 1;
        return (
          <div key={`message-skeleton-${index}`} className={`flex w-full ${isOwnBubble ? "justify-end" : "justify-start"}`}>
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

export function NoMessages() {
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
