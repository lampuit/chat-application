import type { UserRecord, ConversationRecord, MessageRecord } from "./use-chat-data";

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

export function getMemberLabels(memberIds: string[], users: UserRecord[]) {
  return memberIds.map((memberId) => {
    const user = users.find((entry) => entry.uid === memberId);
    return user?.displayName ?? user?.email ?? "Unknown user";
  });
}

export function buildConversationItems(
  conversations: ConversationRecord[],
  currentUserId: string | null,
  users: UserRecord[],
): ConversationItem[] {
  return conversations.map((conversation) => {
    if (conversation.type === "group") {
      const memberLabels = getMemberLabels(conversation.memberIds, users);
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
}

export function buildSelectedConversationDetails(
  selectedConversationId: string | null,
  conversations: ConversationRecord[],
  currentUserId: string | null,
  users: UserRecord[],
): SelectedConversationDetails | null {
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
      subtitle: getMemberLabels(selectedConversation.memberIds, users).join(", "),
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
}

export function buildMessageItems(
  messages: MessageRecord[],
  messagesConversationId: string | null,
  selectedConversationId: string | null,
  conversations: ConversationRecord[],
  currentUserId: string | null,
  users: UserRecord[],
) {
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
    const receiptLabel =
      isDirectConversation && isOwnMessage && isLastOwnMessageInSequence
        ? message.readBy?.some((memberId) => otherMemberIds.includes(memberId))
          ? "Seen"
          : "Sent"
        : undefined;

    const baseItem = {
      id: message.id,
      senderLabel: sender?.displayName ?? sender?.email ?? "Unknown user",
      text: message.text ?? "",
      createdAtLabel: message.createdAt?.toDate?.().toLocaleTimeString() ?? "Sending...",
      isOwnMessage,
      receiptLabel,
    };

    if (message.type === "file") {
      return {
        ...baseItem,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileType: message.fileType,
      };
    }

    return baseItem;
  });
}
