import { useEffect, useState, useMemo } from "react";

export type UserRecord = {
  uid: string;
  email: string;
  displayName: string;
};

export type ConversationRecord = {
  id: string;
  memberIds: string[];
  lastMessageText: string;
  lastMessageAt?: { toDate?: () => Date } | null;
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
    if (!selectedConversationId) {
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
  }, [selectedConversationId]);

  const conversationItems = useMemo(() => {
    return conversations.map((conversation) => {
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
    messageItems,
  };
}
