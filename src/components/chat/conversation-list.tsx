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
    <section className="flex min-h-0 flex-col rounded-[2rem] border border-black/5 bg-white/80 p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold text-slate-950">Conversations</h2>
        <p className="text-sm text-slate-500">Recent direct message threads.</p>
      </div>
      {conversations.length === 0 ? (
        <p className="text-sm text-slate-500">No conversations yet.</p>
      ) : (
        <ul className="flex-1 space-y-3 overflow-y-auto pr-1">
          {conversations.map((conversation) => {
            const isSelected = conversation.id === selectedConversationId;

            return (
              <li key={conversation.id}>
                <button
                  className={`w-full rounded-2xl px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "bg-emerald-950 text-white shadow-[0_10px_24px_rgba(5,46,22,0.18)]"
                      : "border border-black/5 bg-stone-50 text-slate-900 hover:border-emerald-200 hover:bg-emerald-50/60"
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                  type="button"
                >
                  <span className="block font-medium">{conversation.title}</span>
                  <span
                    className={`block text-sm ${
                      isSelected ? "text-emerald-100" : "text-slate-500"
                    }`}
                  >
                    {conversation.lastMessageText}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

