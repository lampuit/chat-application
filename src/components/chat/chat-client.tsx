"use client";

import React from "react";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
import { ChatShell } from "@/components/chat/chat-shell";
import { CreateGroupModal } from "@/components/chat/create-group-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { logout } from "@/lib/auth/auth-service";
import { registerFcmTokenFromUserAction } from "@/lib/firebase/messaging";
import { useChatData } from "./use-chat-data";
import { useChatActions } from "./use-chat-actions";

export function ChatClient() {
  const [isCreateGroupOpen, setIsCreateGroupOpen] = React.useState(false);
  const [isRegisteringNotifications, setIsRegisteringNotifications] = React.useState(false);
  const [notificationFeedback, setNotificationFeedback] = React.useState<string | null>(null);
  const { user } = useAuth();
  const currentUser = user;
  const currentUserId = currentUser?.uid ?? null;

  const {
    users,
    conversations,
    setConversations,
    messages,
    isUsersLoading,
    isConversationsLoading,
    isMessagesLoading,
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

  const handleEnableNotifications = async () => {
    setIsRegisteringNotifications(true);
    setNotificationFeedback(null);

    try {
      const result = await registerFcmTokenFromUserAction(currentUserId);

      if (result.status === "registered") {
        setNotificationFeedback("Notifications enabled for this device.");
        return;
      }

      if (result.status === "permission-not-granted") {
        setNotificationFeedback("Notifications stayed off. You can enable them later from this device.");
        return;
      }

      setNotificationFeedback("Notifications are not available on this browser right now.");
    } catch {
      setNotificationFeedback("Notifications are not available on this browser right now.");
    } finally {
      setIsRegisteringNotifications(false);
    }
  };

  const displayName = currentUser.displayName ?? currentUser.email ?? "Realtime Chat";
  const displayNameInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const hasTotpEnrollment = Boolean(currentUser.hasTotpEnrollment);

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto pr-1 lg:gap-6">
      <div className="shrink-0 space-y-4">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[rgba(255,255,255,0.82)] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_32%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-teal-500/90 to-sky-500/90 text-lg font-bold text-white shadow-[0_14px_32px_rgba(8,145,178,0.18)] ring-1 ring-inset ring-white/60 backdrop-blur">
                {displayNameInitials || "RC"}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-teal-600">
                  Active Session
                </p>
                <h1 className="heading-font truncate text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  {displayName}
                </h1>
                <p className="truncate text-sm text-slate-500">
                  {currentUser.email ?? "Active account"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {currentUser.displayName ? (
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200/70 backdrop-blur">
                  Profile ready
                </span>
              ) : null}
              {hasTotpEnrollment ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
                  2-step enabled
                </span>
              ) : null}
              <button
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
                onClick={() => void logout()}
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Status</p>
              <p className="mt-1 text-sm font-medium text-slate-900">Ready to chat</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Security</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {hasTotpEnrollment ? "2-step active" : "2-step available"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Session</p>
              <p className="mt-1 text-sm font-medium text-slate-900">Live workspace</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-sky-200/80 bg-sky-50/80 p-4 shadow-[0_12px_32px_rgba(14,165,233,0.08)] ring-1 ring-sky-100/80 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                Notifications
              </p>
              <p className="text-sm text-slate-700">
                Turn on push alerts for new messages on this device.
              </p>
            </div>
            <button
              className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-500 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-sky-300"
              disabled={isRegisteringNotifications}
              onClick={() => void handleEnableNotifications()}
              type="button"
            >
              {isRegisteringNotifications ? "Enabling..." : "Enable notifications"}
            </button>
          </div>
          {notificationFeedback ? (
            <p className="mt-3 text-sm text-slate-600">{notificationFeedback}</p>
          ) : null}
        </div>
        <TwoFactorSettings />
      </div>
      <div className="min-h-[32rem] flex-1">
        <ChatShell
          conversations={conversationItems}
          currentUserId={currentUserId}
          draftMessage={draftMessage}
          isConversationsLoading={isConversationsLoading}
          isMessagesLoading={isMessagesLoading}
          isUsersLoading={isUsersLoading}
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
