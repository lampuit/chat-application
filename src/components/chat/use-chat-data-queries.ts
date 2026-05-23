import { useEffect, useState } from "react";
import { subscribeToUsers, subscribeToConversations, subscribeToMessages } from "./use-chat-data-subscriptions";
import type { UserRecord, ConversationRecord, MessageRecord } from "./use-chat-data";

export function useUsersAndConversationsSubscription(currentUserId: string | null) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [confirmedConversationIds, setConfirmedConversationIds] = useState<string[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId) {
      setUsers([]);
      setConversations([]);
      setConfirmedConversationIds([]);
      setIsUsersLoading(false);
      setIsConversationsLoading(false);
      return;
    }

    setIsUsersLoading(true);
    setIsConversationsLoading(true);
    const activeCurrentUserId = currentUserId;

    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeConversations: (() => void) | undefined;
    let isCancelled = false;

    async function subscribe() {
      unsubscribeUsers = await subscribeToUsers(
        activeCurrentUserId,
        (users) => {
          setIsUsersLoading(false);
          setUsers(users);
        },
        () => {
          setIsUsersLoading(false);
        },
      );

      if (isCancelled) return;

      unsubscribeConversations = await subscribeToConversations(
        activeCurrentUserId,
        (conversations, confirmedIds) => {
          setIsConversationsLoading(false);
          setConfirmedConversationIds((current) => {
            const merged = new Set(confirmedIds);
            current.forEach((id) => {
              if (conversations.some((c) => c.id === id)) {
                merged.add(id);
              }
            });
            return Array.from(merged);
          });
          setConversations(conversations);
          setSelectedConversationId((current) => current || conversations[0]?.id || null);
        },
        () => {
          setIsConversationsLoading(false);
        },
      );
    }

    void subscribe();

    return () => {
      isCancelled = true;
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeConversations) unsubscribeConversations();
    };
  }, [currentUserId]);

  return {
    users,
    conversations,
    setConversations,
    confirmedConversationIds,
    isUsersLoading,
    isConversationsLoading,
    selectedConversationId,
    setSelectedConversationId,
  };
}

export function useMessagesSubscription(
  currentUserId: string | null,
  selectedConversationId: string | null,
  selectedConversationExists: boolean,
  selectedConversationReady: boolean,
  selectedConversationType: string | null,
) {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [messagesConversationId, setMessagesConversationId] = useState<string | null>(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);

  useEffect(() => {
    if (!selectedConversationId || !selectedConversationExists || !selectedConversationReady) {
      setMessages([]);
      setMessagesConversationId(null);
      setIsMessagesLoading(false);
      return;
    }

    setMessagesConversationId(null);
    setIsMessagesLoading(true);
    const conversationId = selectedConversationId;
    const activeCurrentUserId = currentUserId;
    let unsubscribe: (() => void) | undefined;
    let isCancelled = false;

    async function handleMessagesSnapshot(nextMessages: MessageRecord[]) {
      setIsMessagesLoading(false);
      setMessagesConversationId(conversationId);
      setMessages(nextMessages);

      if (!activeCurrentUserId || selectedConversationType === "group") {
        return;
      }

      const messageIdsNeedingReceipts = nextMessages
        .filter(
          (msg) =>
            msg.senderId !== activeCurrentUserId &&
            (!msg.deliveredTo?.includes(activeCurrentUserId) || !msg.readBy?.includes(activeCurrentUserId)),
        )
        .map((msg) => msg.id);

      if (messageIdsNeedingReceipts.length === 0) {
        return;
      }

      void import("@/lib/chat/messages").then(({ markConversationMessagesSeen }) =>
        markConversationMessagesSeen(conversationId, activeCurrentUserId, messageIdsNeedingReceipts).catch(
          (error) => {
            console.error("Failed to mark messages as seen", { conversationId, currentUserId: activeCurrentUserId, messageIds: messageIdsNeedingReceipts, error });
          },
        ),
      );
    }

    async function subscribe() {
      unsubscribe = await subscribeToMessages(
        conversationId,
        activeCurrentUserId,
        handleMessagesSnapshot,
        () => {
          setIsMessagesLoading(false);
          setMessagesConversationId(null);
          setMessages([]);
        },
      );
    }

    if (!isCancelled) {
      void subscribe();
    }

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [currentUserId, selectedConversationExists, selectedConversationId, selectedConversationReady, selectedConversationType]);

  return { messages, messagesConversationId, isMessagesLoading };
}
