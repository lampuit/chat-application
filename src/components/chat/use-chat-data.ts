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
  createdAt?: { toDate?: () => Date } | null;
};

export function useChatData(currentUserId: string | null) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConversationExists = useMemo(
    () =>
      selectedConversationId != null &&
      conversations.some((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeConversations: (() => void) | undefined;
    let isCancelled = false;

    async function subscribe() {
      const firestore = await import("firebase/firestore");
      const { getFirebaseServices } = await import("@/lib/firebase/client");
      const services = getFirebaseServices();

      if (!services) {
        return;
      }

      if (isCancelled) return;

      unsubscribeUsers = firestore.onSnapshot(
        firestore.collection(services.db, "users"),
        (snapshot) => {
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
          const nextConversations = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ConversationRecord, "id">),
          }));
          setConversations(nextConversations);

          setSelectedConversationId((currentSelection) => {
            if (currentSelection) {
              return currentSelection;
            }

            return nextConversations[0]?.id ?? null;
          });
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
      return;
    }

    const conversationId = selectedConversationId;
    let unsubscribe: (() => void) | undefined;
    let isCancelled = false;

    async function subscribeToMessages() {
      const firestore = await import("firebase/firestore");
      const { getFirebaseServices } = await import("@/lib/firebase/client");
      const services = getFirebaseServices();

      if (!services) {
        return;
      }

      if (isCancelled) return;

      unsubscribe = firestore.onSnapshot(
        firestore.query(
          firestore.collection(services.db, "conversations", conversationId, "messages"),
          firestore.orderBy("createdAt", "asc"),
        ),
        (snapshot) => {
          setMessages(
            snapshot.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<MessageRecord, "id">),
            })),
          );
        },
      );
    }

    void subscribeToMessages();

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [selectedConversationExists, selectedConversationId]);

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
    return messages.map((message) => {
      const sender = users.find((entry) => entry.uid === message.senderId);

      if ((message as any).type === "file") {
        return {
          id: message.id,
          senderLabel: sender?.displayName ?? sender?.email ?? "Unknown user",
          text: (message as any).text ?? "",
          fileUrl: (message as any).fileUrl,
          fileName: (message as any).fileName,
          fileType: (message as any).fileType,
          createdAtLabel: message.createdAt?.toDate?.().toLocaleTimeString() ?? "Sending...",
          isOwnMessage: message.senderId === currentUserId,
        };
      }

      return {
        id: message.id,
        senderLabel: sender?.displayName ?? sender?.email ?? "Unknown user",
        text: (message as any).text ?? "",
        createdAtLabel: message.createdAt?.toDate?.().toLocaleTimeString() ?? "Sending...",
        isOwnMessage: message.senderId === currentUserId,
      };
    });
  }, [currentUserId, messages, users]);

  return {
    users,
    conversations,
    setConversations,
    messages,
    selectedConversationId,
    setSelectedConversationId,
    conversationItems,
    selectedConversationDetails,
    messageItems,
  };
}
