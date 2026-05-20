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
  memberSummary?: string;
  lastMessageText: string;
};

type SelectedConversationDetails = {
  id: string;
  title: string;
  subtitle: string;
};

type ChatMessage = {
  id: string;
  senderLabel: string;
  text: string;
  createdAtLabel: string;
  isOwnMessage: boolean;
  receiptLabel?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
};

type ChatShellProps = {
  currentUserId: string;
  users: ChatUser[];
  isUsersLoading: boolean;
  conversations: ChatConversation[];
  isConversationsLoading: boolean;
  messages: ChatMessage[];
  isMessagesLoading: boolean;
  selectedConversationId: string | null;
  selectedConversationDetails: SelectedConversationDetails | null;
  draftMessage: string;
  errorMessage: string | null;
  isUploading: boolean;
  onDraftMessageChange: (value: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onStartConversation: (userId: string) => void;
  onSendMessage: (file?: File) => void;
  onOpenCreateGroup: () => void;
};

export function ChatShell({
  currentUserId,
  users,
  isUsersLoading,
  conversations,
  isConversationsLoading,
  messages,
  isMessagesLoading,
  selectedConversationId,
  selectedConversationDetails,
  draftMessage,
  errorMessage,
  isUploading,
  onDraftMessageChange,
  onSelectConversation,
  onStartConversation,
  onSendMessage,
  onOpenCreateGroup,
}: ChatShellProps) {
  return (
    <div className="grid h-full min-h-0 gap-4 grid-rows-[1fr_1fr_2fr] lg:grid-rows-1 lg:grid-cols-[minmax(0,310px)_minmax(0,330px)_minmax(0,1fr)]">
      <UserList
        currentUserId={currentUserId}
        isLoading={isUsersLoading}
        users={users}
        onStartConversation={onStartConversation}
        onOpenCreateGroup={onOpenCreateGroup}
      />
      <ConversationList
        conversations={conversations}
        isLoading={isConversationsLoading}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
      />
      <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-[rgba(255,255,255,0.82)] shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-3xl ring-1 ring-slate-900/5">
        <div className="flex items-center gap-3 border-b border-slate-900/5 px-4 py-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 text-sm font-bold text-white shadow-[0_14px_36px_rgba(8,145,178,0.22)]">
            {selectedConversationDetails?.title?.[0]?.toUpperCase() ?? "M"}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="heading-font truncate text-xl font-semibold tracking-[-0.04em] text-slate-950">
              {selectedConversationDetails?.title ?? "Messages"}
            </h2>
            <p className="truncate text-sm text-slate-500">
              {selectedConversationDetails?.subtitle ?? "Jump into direct or group chats."}
            </p>
          </div>
          <div className="hidden rounded-full bg-slate-950/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:inline-flex">
            Live
          </div>
        </div>
        <MessageThread
          hasSelection={Boolean(selectedConversationId)}
          isLoading={isMessagesLoading}
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
