"use client";

import React from "react";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
import { ChatShell } from "@/components/chat/chat-shell";
import { CreateGroupModal } from "@/components/chat/create-group-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/auth/auth-service";
import { useChatData } from "./use-chat-data";
import { useChatActions } from "./use-chat-actions";

export function ChatClient() {
  const [isCreateGroupOpen, setIsCreateGroupOpen] = React.useState(false);
  const { user } = useAuth();
  const currentUser = user;
  const currentUserId = currentUser?.uid ?? null;

  const {
    users,
    conversations,
    setConversations,
    messages,
    selectedConversationId,
    setSelectedConversationId,
    conversationItems,
    selectedConversationDetails,
    messageItems,
  } = useChatData(currentUserId);

  const {
    draftMessage,
    setDraftMessage,
    uploadError,
    isUploading,
    isPending,
    handleStartConversation,
    handleCreateGroup,
    handleSendMessage,
  } = useChatActions({
    currentUserId,
    conversations,
    setConversations,
    selectedConversationId,
    setSelectedConversationId,
    messages,
  });

  if (!currentUserId || !currentUser) {
    return null;
  }

  const displayName = currentUser.displayName ?? currentUser.email ?? "Realtime Chat";
  const displayNameInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto pr-1 lg:gap-6">
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-black/5 bg-white/60 p-5 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-lg font-bold text-white shadow-[0_8px_16px_rgba(16,185,129,0.3)]">
              {displayNameInitials || "RC"}
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-sky-600">
                Active Session
              </p>
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {displayName}
              </h1>
              <p className="truncate text-sm font-medium text-slate-500">
                {currentUser.email ?? "Active account"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUser.displayName ? (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm ring-1 ring-inset ring-sky-600/20">
                Profile ready
              </span>
            ) : null}
            <button
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition-all hover:bg-slate-50 active:scale-95"
              onClick={() => void logout()}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
        <TwoFactorSettings />
      </div>
      <div className="min-h-[32rem] flex-1">
        <ChatShell
          conversations={conversationItems}
          currentUserId={currentUserId}
          draftMessage={draftMessage}
          messages={messageItems}
          selectedConversationDetails={selectedConversationDetails}
          errorMessage={uploadError}
          isUploading={isUploading}
          onDraftMessageChange={setDraftMessage}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onSelectConversation={setSelectedConversationId}
          onSendMessage={handleSendMessage}
          onStartConversation={(otherUserId) => void handleStartConversation(otherUserId)}
          selectedConversationId={selectedConversationId}
          users={users}
        />
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          isSubmitting={isPending}
          onClose={() => setIsCreateGroupOpen(false)}
          onCreateGroup={handleCreateGroup}
          users={users.filter((entry) => entry.uid !== currentUserId)}
        />
      </div>
      {isPending ? <p className="shrink-0 text-sm text-slate-500">Sending...</p> : null}
    </div>
  );
}
