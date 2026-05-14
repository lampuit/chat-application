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
  conversations,
  messages,
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
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
              {selectedConversationDetails?.title ?? "Messages"}
            </h2>
            <p className="truncate text-sm text-slate-500">
              {selectedConversationDetails?.subtitle ?? "Jump into direct or group chats."}
            </p>
          </div>
          <button
            className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-sky-700 active:scale-95"
            onClick={onOpenCreateGroup}
            type="button"
          >
            New group
          </button>
        </div>
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
