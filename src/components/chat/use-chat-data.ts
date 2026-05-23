import { useEffect, useState, useMemo } from "react";

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

type ConversationItem = {
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
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [confirmedConversationIds, setConfirmedConversationIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [messagesConversationId, setMessagesConversationId] = useState<string | null>(null);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversationExists = useMemo(
    () => selectedConversationId != null && conversations.some((conversation) => conversation.id === selectedConversationId),
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
      conversations.find((conversation) => conversation.id === selectedConversationId)?.type ??
      null,
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!currentUserId) {
      setUsers([]);
      setConversations([]);
      setConfirmedConversationIds([]);
      setMessages([]);
      setMessagesConversationId(null);
      setIsUsersLoading(false);
      setIsConversationsLoading(false);
      setIsMessagesLoading(false);
      return;
    }

    setIsUsersLoading(true);
    setIsConversationsLoading(true);

    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeConversations: (() => void) | undefined;
    let isCancelled = false;

    async function subscribe() {
      const firestore = await import("firebase/firestore");
      const { getFirebaseServices } = await import("@/lib/firebase/client");
      const services = getFirebaseServices();

      if (!services) {
        setIsUsersLoading(false);
        setIsConversationsLoading(false);
        return;
      }

      if (isCancelled) return;

      unsubscribeUsers = firestore.onSnapshot(
        firestore.collection(services.db, "users"),
        (snapshot) => {
          setIsUsersLoading(false);
          setUsers(
            snapshot.docs.map((doc) => ({
              uid: doc.id,
              ...(doc.data() as Omit<UserRecord, "uid">),
            })),
          );
        },
      );

      unsubscribeConversations = firestore.onSnapshot(
        firestore.query(
          firestore.collection(services.db, "conversations"),
          firestore.where("memberIds", "array-contains", currentUserId),
          firestore.orderBy("lastMessageAt", "desc"),
        ),
        (snapshot) => {
          setIsConversationsLoading(false);
          const nextConfirmedConversationIds = new Set<string>();
          const nextConversations = snapshot.docs.map((doc) => ({
            id: doc.id,
            pending: Boolean(doc.metadata?.hasPendingWrites),
            ...(doc.data() as Omit<ConversationRecord, "id">),
          }));
          snapshot.docs.forEach((doc) => {
            if (!doc.metadata?.hasPendingWrites) {
              nextConfirmedConversationIds.add(doc.id);
            }
          });

          setConfirmedConversationIds((currentConfirmedConversationIds) => {
            currentConfirmedConversationIds.forEach((conversationId) => {
              if (nextConversations.some((conversation) => conversation.id === conversationId)) {
                nextConfirmedConversationIds.add(conversationId);
              }
            });

            return Array.from(nextConfirmedConversationIds);
          });
          setConversations(nextConversations);

          setSelectedConversationId((currentSelection) => {
            if (currentSelection) {
              return currentSelection;
            }

            return nextConversations[0]?.id ?? null;
          });
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

  useEffect(() => {
    if (!selectedConversationId || !selectedConversationExists) {
      setMessages([]);
      setMessagesConversationId(null);
      setIsMessagesLoading(false);
      return;
    }

    if (!selectedConversationReady) {
      setMessages([]);
      setMessagesConversationId(null);
      setIsMessagesLoading(false);
      return;
    }

    setMessagesConversationId(null);
    setIsMessagesLoading(true);
    const conversationId = selectedConversationId;
    let unsubscribe: (() => void) | undefined;
    let isCancelled = false;

    async function subscribeToMessages() {
      const firestore = await import("firebase/firestore");
      const { getFirebaseServices } = await import("@/lib/firebase/client");
      const services = getFirebaseServices();

      if (!services) {
        setIsMessagesLoading(false);
        return;
      }

      if (isCancelled) return;

      unsubscribe = firestore.onSnapshot(
        firestore.query(
          firestore.collection(services.db, "conversations", conversationId, "messages"),
          firestore.orderBy("createdAt", "asc"),
        ),
        (snapshot) => {
          setIsMessagesLoading(false);
          const nextMessages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<MessageRecord, "id">),
          }));
          setMessagesConversationId(conversationId);
          setMessages(nextMessages);

          if (!currentUserId) {
            return;
          }

          if (selectedConversationType === "group") {
            return;
          }

          const messageIdsNeedingReceipts = nextMessages
            .filter(
              (message) =>
                message.senderId !== currentUserId &&
                (!message.deliveredTo?.includes(currentUserId) ||
                  !message.readBy?.includes(currentUserId)),
            )
            .map((message) => message.id);

          if (messageIdsNeedingReceipts.length === 0) {
            return;
          }

          void import("@/lib/chat/messages").then(({ markConversationMessagesSeen }) =>
            markConversationMessagesSeen(
              conversationId,
              currentUserId,
              messageIdsNeedingReceipts,
            ).catch((error) => {
              console.error("Failed to mark messages as seen", {
                conversationId,
                currentUserId,
                messageIds: messageIdsNeedingReceipts,
                error,
              });
            }),
          );
        },
        () => {
          setIsMessagesLoading(false);
          setMessagesConversationId(null);
          setMessages([]);
        },
      );
    }

    void subscribeToMessages();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [
    currentUserId,
    selectedConversationExists,
    selectedConversationId,
    selectedConversationReady,
    selectedConversationType,
  ]);

  function getMemberLabels(memberIds: string[]) {
    return memberIds.map((memberId) => {
      const user = users.find((entry) => entry.uid === memberId);

      return user?.displayName ?? user?.email ?? "Unknown user";
    });
  }

  const conversationItems = useMemo<ConversationItem[]>(() => {
    return conversations.map((conversation) => {
      if (conversation.type === "group") {
        const memberLabels = getMemberLabels(conversation.memberIds);
        const otherMemberLabels = conversation.memberIds
          .filter((memberId) => memberId !== currentUserId)
          .map((memberId) => {
            const user = users.find((entry) => entry.uid === memberId);

            return user?.displayName ?? user?.email ?? "Unknown user";
          });
        const previewSource = otherMemberLabels.length > 0 ? otherMemberLabels : memberLabels;
        const previewMembersText = previewSource.slice(0, 2).join(", ");
        const remainingCount = Math.max(memberLabels.length - 2, 0);
        const memberSummary =
          remainingCount > 0
            ? `${memberLabels.length} members: ${previewMembersText}, +${remainingCount}`
            : `${memberLabels.length} members: ${previewMembersText}`;

        return {
          id: conversation.id,
          title: conversation.name?.trim() || "Group chat",
          memberSummary,
          lastMessageText: conversation.lastMessageText || "No messages yet",
        };
      }

      const otherUserId =
        conversation.memberIds.find((memberId) => memberId !== currentUserId) ?? null;
      const otherUser = users.find((entry) => entry.uid === otherUserId);

      return {
        id: conversation.id,
        title: otherUser?.displayName ?? otherUser?.email ?? "Direct chat",
        lastMessageText: conversation.lastMessageText || "No messages yet",
      };
    });
  }, [conversations, currentUserId, users]);

  const selectedConversationDetails = useMemo<SelectedConversationDetails | null>(() => {
    if (!selectedConversationId) {
      return null;
    }

    const selectedConversation = conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );

    if (!selectedConversation) {
      return null;
    }

    if (selectedConversation.type === "group") {
      return {
        id: selectedConversation.id,
        title: selectedConversation.name?.trim() || "Group chat",
        subtitle: getMemberLabels(selectedConversation.memberIds).join(", "),
      };
    }

    const otherUserId =
      selectedConversation.memberIds.find((memberId) => memberId !== currentUserId) ?? null;
    const otherUser = users.find((entry) => entry.uid === otherUserId);

    return {
      id: selectedConversation.id,
      title: otherUser?.displayName ?? otherUser?.email ?? "Direct chat",
      subtitle: otherUser?.email ?? "Direct conversation",
    };
  }, [conversations, currentUserId, selectedConversationId, users]);

  const messageItems = useMemo(() => {
    if (messagesConversationId !== selectedConversationId) {
      return [];
    }

    const selectedConversation = conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    );
    const isDirectConversation = selectedConversation?.type !== "group";
    const otherMemberIds =
      selectedConversation?.memberIds.filter((memberId) => memberId !== currentUserId) ?? [];

    return messages.map((message, index) => {
      const sender = users.find((entry) => entry.uid === message.senderId);
      const isOwnMessage = message.senderId === currentUserId;
      const nextMessage = messages[index + 1];
      const isLastOwnMessageInSequence =
        isOwnMessage && (!nextMessage || nextMessage.senderId !== currentUserId);
      const wasReadByOtherMember = message.readBy?.some((memberId) =>
        otherMemberIds.includes(memberId),
      );
      const wasDeliveredToOtherMember = message.deliveredTo?.some((memberId) =>
        otherMemberIds.includes(memberId),
      );
      const receiptLabel =
        isDirectConversation && isOwnMessage && isLastOwnMessageInSequence
          ? wasReadByOtherMember
            ? "Seen"
            : wasDeliveredToOtherMember
              ? "Delivered"
            : "Sent"
          : undefined;

      if (message.type === "file") {
        return {
          id: message.id,
          senderLabel: sender?.displayName ?? sender?.email ?? "Unknown user",
          text: message.text ?? "",
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileType: message.fileType,
          createdAtDate: message.createdAt?.toDate?.() ?? null,
          createdAtLabel: message.createdAt?.toDate?.().toLocaleTimeString() ?? "Sending...",
          isOwnMessage,
          receiptLabel,
        };
      }

      return {
        id: message.id,
        senderLabel: sender?.displayName ?? sender?.email ?? "Unknown user",
        text: message.text ?? "",
        createdAtDate: message.createdAt?.toDate?.() ?? null,
        createdAtLabel: message.createdAt?.toDate?.().toLocaleTimeString() ?? "Sending...",
        isOwnMessage,
        receiptLabel,
      };
    });
  }, [conversations, currentUserId, messages, messagesConversationId, selectedConversationId, users]);

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
