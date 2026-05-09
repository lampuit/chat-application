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
    <section className="rounded-[2rem] border border-black/5 bg-white/80 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-950">Conversations</h2>
        <p className="text-sm text-slate-500">Recent direct message threads.</p>
      </div>
      {conversations.length === 0 ? (
        <p className="text-sm text-slate-500">No conversations yet.</p>
      ) : (
        <ul className="space-y-3">
          {conversations.map((conversation) => {
            const isSelected = conversation.id === selectedConversationId;

            return (
              <li key={conversation.id}>
                <button
                  className={`w-full rounded-2xl px-4 py-3 text-left ${
                    isSelected
                      ? "bg-emerald-900 text-white"
                      : "border border-black/5 bg-stone-50 text-slate-900"
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

