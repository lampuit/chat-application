import React from "react";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageComposer } from "@/components/chat/message-composer";
import { MessageThread } from "@/components/chat/message-thread";
import { UserList } from "@/components/chat/user-list";

type ChatUser = {
  uid: string;
  displayName: string;
  email: string;
};

type ChatConversation = {
  id: string;
  title: string;
  lastMessageText: string;
};

type ChatMessage = {
  id: string;
  senderLabel: string;
  text: string;
  createdAtLabel: string;
  isOwnMessage: boolean;
};

type ChatShellProps = {
  currentUserId: string;
  users: ChatUser[];
  conversations: ChatConversation[];
  messages: ChatMessage[];
  selectedConversationId: string | null;
  draftMessage: string;
  onDraftMessageChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onStartConversation: (userId: string) => void;
  onSendMessage: () => void;
};

export function ChatShell({
  currentUserId,
  users,
  conversations,
  messages,
  selectedConversationId,
  draftMessage,
  onDraftMessageChange,
  onSelectConversation,
  onStartConversation,
  onSendMessage,
}: ChatShellProps) {
  return (
    <div className="grid min-h-[75vh] gap-4 lg:grid-cols-[280px_320px_1fr]">
      <UserList
        currentUserId={currentUserId}
        users={users}
        onStartConversation={onStartConversation}
      />
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
      />
      <section className="flex min-h-[60vh] flex-col rounded-[2rem] border border-black/5 bg-stone-50/85">
        <MessageThread
          hasSelection={Boolean(selectedConversationId)}
          messages={messages}
        />
        <MessageComposer
          disabled={!selectedConversationId}
          value={draftMessage}
          onChange={onDraftMessageChange}
          onSend={onSendMessage}
        />
      </section>
    </div>
  );
}
