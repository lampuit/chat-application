import React from "react";

type ConversationListProps = {
  conversations: Array<{
    id: string;
    title: string;
    memberSummary?: string;
    lastMessageText: string;
  }>;
  isLoading: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
};

export function ConversationList({
  conversations,
  isLoading,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.78)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl ring-1 ring-slate-900/5">
      <div className="mb-5 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600">Recent</p>
        <h2 className="heading-font text-xl font-semibold tracking-[-0.04em] text-slate-950">Chats</h2>
        <p className="text-sm text-slate-500">Your recent conversations.</p>
      </div>
      {isLoading ? (
        <div
          className="flex flex-1 flex-col gap-3 overflow-hidden"
          data-testid="conversation-list-skeleton"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`conversation-skeleton-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm"
            >
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/45">
          <p className="text-sm text-slate-500">No conversations yet.</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {conversations.map((conversation) => {
            const isSelected = conversation.id === selectedConversationId;
            const initials = conversation.title
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || "C";

            return (
              <li key={conversation.id}>
                <button
                  className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    isSelected
                      ? "border-sky-200/70 bg-gradient-to-br from-sky-50 to-teal-50 shadow-[0_14px_32px_rgba(14,165,233,0.12)]"
                      : "border-transparent hover:bg-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                  type="button"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isSelected ? "bg-slate-950 text-white shadow-md scale-105" : "bg-sky-100 text-sky-700 group-hover:scale-105 group-hover:bg-sky-200"
                  }`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`block truncate font-medium transition-colors ${
                      isSelected ? "text-slate-950" : "text-slate-900 group-hover:text-sky-700"
                    }`}>
                      {conversation.title}
                    </span>
                    {conversation.memberSummary ? (
                      <span className="block truncate text-[11px] text-slate-500">
                        {conversation.memberSummary}
                      </span>
                    ) : null}
                    <span className={`block truncate text-xs ${
                      isSelected ? "text-teal-700" : "text-slate-500"
                    }`}>
                      {conversation.lastMessageText}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="h-2.5 w-2.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
