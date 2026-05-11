import React from "react";

type ConversationListProps = {
  conversations: Array<{
    id: string;
    title: string;
    lastMessageText: string;
  }>;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
};

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-[2rem] border border-black/5 bg-white/60 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-5 space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Chats</h2>
        <p className="text-sm text-slate-500">Your recent conversations.</p>
      </div>
      {conversations.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
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
                      ? "border-sky-100 bg-sky-50/80 shadow-sm"
                      : "border-transparent hover:bg-white hover:shadow-sm"
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                  type="button"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isSelected ? "bg-sky-600 text-white shadow-md shadow-sky-200 scale-105" : "bg-sky-100 text-sky-700 group-hover:scale-105 group-hover:bg-sky-200"
                  }`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`block truncate font-medium transition-colors ${
                      isSelected ? "text-sky-900" : "text-slate-900 group-hover:text-sky-700"
                    }`}>
                      {conversation.title}
                    </span>
                    <span className={`block truncate text-xs ${
                      isSelected ? "text-sky-600" : "text-slate-500"
                    }`}>
                      {conversation.lastMessageText}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
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
