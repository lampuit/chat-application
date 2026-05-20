import { useMemo } from "react";
import { useUsersAndConversationsSubscription, useMessagesSubscription } from "./use-chat-data-queries";
import {
  buildConversationItems,
  buildSelectedConversationDetails,
  buildMessageItems,
} from "./use-chat-data-helpers";

export type UserRecord = {
  uid: string;
  email: string;
  displayName: string;
};

export type ConversationRecord = {
  id: string;
  type?: "direct" | "group";
  name?: string;
  ownerId?: string;
  pending?: boolean;
  memberIds: string[];
  lastMessageText: string;
  lastMessageAt?: { toDate?: () => Date } | null;
};

export type MessageRecord = {
  id: string;
  senderId: string;
  text: string;
  type?: "text" | "file";
  deliveredTo?: string[];
  readBy?: string[];
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt?: { toDate?: () => Date } | null;
};

export function useChatData(currentUserId: string | null) {
  const {
    users,
    conversations,
    setConversations,
    confirmedConversationIds,
    isUsersLoading,
    isConversationsLoading,
    selectedConversationId,
    setSelectedConversationId,
  } = useUsersAndConversationsSubscription(currentUserId);

  const selectedConversationExists = useMemo(
    () =>
      selectedConversationId != null &&
      conversations.some((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  const selectedConversationReady = useMemo(
    () =>
      selectedConversationId != null &&
      conversations.some(
        (conversation) =>
          conversation.id === selectedConversationId &&
          (!conversation.pending || confirmedConversationIds.includes(conversation.id)),
      ),
    [confirmedConversationIds, conversations, selectedConversationId],
  );

  const selectedConversationType = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedConversationId)?.type ?? null,
    [conversations, selectedConversationId],
  );

  const { messages, messagesConversationId, isMessagesLoading } = useMessagesSubscription(
    currentUserId,
    selectedConversationId,
    selectedConversationExists,
    selectedConversationReady,
    selectedConversationType,
  );

  const conversationItems = useMemo(
    () => buildConversationItems(conversations, currentUserId, users),
    [conversations, currentUserId, users],
  );

  const selectedConversationDetails = useMemo(
    () =>
      buildSelectedConversationDetails(selectedConversationId, conversations, currentUserId, users),
    [selectedConversationId, conversations, currentUserId, users],
  );

  const messageItems = useMemo(
    () =>
      buildMessageItems(
        messages,
        messagesConversationId,
        selectedConversationId,
        conversations,
        currentUserId,
        users,
      ),
    [messages, messagesConversationId, selectedConversationId, conversations, currentUserId, users],
  );

  return {
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
  };
}
