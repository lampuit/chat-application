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
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
};

type ChatShellProps = {
  currentUserId: string;
  users: ChatUser[];
  conversations: ChatConversation[];
  messages: ChatMessage[];
  selectedConversationId: string | null;
  draftMessage: string;
  errorMessage: string | null;
  isUploading: boolean;
  onDraftMessageChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onStartConversation: (userId: string) => void;
  onSendMessage: (file?: File) => void;
};

export function ChatShell({
  currentUserId,
  users,
  conversations,
  messages,
  selectedConversationId,
  draftMessage,
  errorMessage,
  isUploading,
  onDraftMessageChange,
  onSelectConversation,
  onStartConversation,
  onSendMessage,
}: ChatShellProps) {
  return (
    <div className="grid h-full min-h-0 gap-4 grid-rows-[1fr_1fr_2fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,300px)_minmax(0,320px)_minmax(0,1fr)]">
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
      <section className="flex flex-col min-h-0 overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-sm ring-1 ring-slate-900/5 backdrop-blur-3xl">
        <MessageThread
          hasSelection={Boolean(selectedConversationId)}
          messages={messages}
        />
        <MessageComposer
          disabled={!selectedConversationId}
          errorMessage={errorMessage}
          isUploading={isUploading}
          value={draftMessage}
          onChange={onDraftMessageChange}
          onSend={onSendMessage}
        />
      </section>
    </div>
  );
}
