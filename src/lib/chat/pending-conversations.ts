type PendingConversation = {
  id: string;
  memberIds: string[];
  lastMessageText: string;
  lastMessageAt: null;
};

type ConversationLike = {
  id: string;
  memberIds: string[];
};

export function createPendingConversationRecord(
  conversationId: string,
  currentUserId: string,
  otherUserId: string,
): PendingConversation {
  return {
    id: conversationId,
    memberIds: [currentUserId, otherUserId].sort(),
    lastMessageText: "",
    lastMessageAt: null,
  };
}

export function createPendingConversationTracker() {
  const writes: Record<string, Promise<void>> = {};
  const partners: Record<string, string> = {};

  return {
    rememberPartner(conversationId: string, otherUserId: string) {
      partners[conversationId] = otherUserId;
    },
    trackWrite(conversationId: string, writePromise: Promise<void>) {
      writes[conversationId] = writePromise.finally(() => {
        delete writes[conversationId];
      });

      return writes[conversationId];
    },
    waitForWrite(conversationId: string) {
      return writes[conversationId];
    },
    resolveOtherUserId(
      conversationId: string,
      currentUserId: string | null,
      conversations: ConversationLike[],
    ) {
      if (partners[conversationId]) {
        return partners[conversationId];
      }

      const selectedConversation = conversations.find(
        (conversation) => conversation.id === conversationId,
      );

      return (
        selectedConversation?.memberIds.find((memberId) => memberId !== currentUserId) ?? ""
      );
    },
  };
}
