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
    <div className="grid min-h-0 gap-4 lg:h-[calc(100vh-17rem)] lg:grid-cols-[minmax(0,280px)_minmax(0,320px)_minmax(0,1fr)]">
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
      <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,249,244,0.92))] shadow-[0_18px_48px_rgba(15,23,32,0.06)]">
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
