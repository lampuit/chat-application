import { useRef, useState, useTransition } from "react";
import { createDirectConversationWithFirstMessage, createGroupConversation } from "@/lib/chat/conversations";
import { buildDirectMemberKey } from "@/lib/chat/member-key";
import { createPendingGroupConversationRecord, createPendingConversationRecord, createPendingConversationTracker } from "@/lib/chat/pending-conversations";
import { normalizeChatError } from "@/lib/chat/errors";
import { validateChatUpload } from "@/lib/chat/upload-constraints";
import { handleFileUploadAndSend, handleTextMessageSend } from "./use-chat-actions-message";
import type { ConversationRecord, MessageRecord } from "./use-chat-data";

interface UseChatActionsProps {
  currentUserId: string | null;
  conversations: ConversationRecord[];
  setConversations: React.Dispatch<React.SetStateAction<ConversationRecord[]>>;
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  messages: MessageRecord[];
}

export function useChatActions({
  currentUserId,
  conversations,
  setConversations,
  selectedConversationId,
  setSelectedConversationId,
  messages,
}: UseChatActionsProps) {
  const [draftMessage, setDraftMessage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pendingConversationTrackerRef = useRef(createPendingConversationTracker());

  function removePendingConversation(conversationId: string) {
    setConversations((c) => c.filter((conv) => conv.id !== conversationId));
    if (selectedConversationId === conversationId) {
      setSelectedConversationId(null);
    }
  }

  async function handleStartConversation(otherUserId: string) {
    if (!currentUserId) return;
    const existingConversation = conversations.find(
      (conversation) =>
        buildDirectMemberKey(currentUserId, otherUserId) ===
        buildDirectMemberKey(conversation.memberIds[0] ?? "", conversation.memberIds[1] ?? ""),
    );
    if (existingConversation) {
      setSelectedConversationId(existingConversation.id);
      return;
    }
    const conversationId = crypto.randomUUID();
    const memberIds = [currentUserId, otherUserId].sort();
    setUploadError(null);
    pendingConversationTrackerRef.current.rememberPartner(conversationId, otherUserId);
    setConversations((c) => [
      createPendingConversationRecord(conversationId, currentUserId, otherUserId),
      ...c.filter((conversation) => conversation.id !== conversationId),
    ]);
    setSelectedConversationId(conversationId);
    try {
      const { setDoc, doc, serverTimestamp } = await import("firebase/firestore");
      const { getFirebaseServices } = await import("@/lib/firebase/client");
      const services = getFirebaseServices();
      if (!services) {
        throw new Error("Firebase is not configured. Add the required environment variables.");
      }
      const writePromise = pendingConversationTrackerRef.current.trackWrite(
        conversationId,
        setDoc(doc(services.db, "conversations", conversationId), {
          type: "direct",
          memberIds,
          memberKey: buildDirectMemberKey(currentUserId, otherUserId),
          lastMessageText: "",
          lastMessageSenderId: "",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
      await writePromise;
    } catch (error) {
      removePendingConversation(conversationId);
      setUploadError(normalizeChatError(error));
    }
  }

  async function handleCreateGroup(input: { groupName: string; memberIds: string[] }) {
    if (!currentUserId) return;
    const conversationId = crypto.randomUUID();
    setUploadError(null);
    setConversations((c) => [
      createPendingGroupConversationRecord(conversationId, currentUserId, input.groupName, input.memberIds),
      ...c.filter((conversation) => conversation.id !== conversationId),
    ]);
    setSelectedConversationId(conversationId);
    try {
      const writePromise = createGroupConversation({
        conversationId,
        currentUserId,
        groupName: input.groupName,
        memberIds: input.memberIds,
      });
      await pendingConversationTrackerRef.current.trackWrite(conversationId, writePromise);
    } catch (error) {
      removePendingConversation(conversationId);
      setUploadError(normalizeChatError(error));
    }
  }

  function handleSendMessage(file?: File) {
    if (!currentUserId || !selectedConversationId || isUploading) return;
    const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
    const hasMessages = messages.length > 0;
    const nextMessage = draftMessage.trim();
    if (file) {
      const validationError = validateChatUpload(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }
    }
    setUploadError(null);
    if (!file) {
      setDraftMessage("");
    }
    startTransition(async () => {
      try {
        if (!hasMessages) {
          await pendingConversationTrackerRef.current.waitForWrite(selectedConversationId);
        }
        if (file) {
          setIsUploading(true);
          await handleFileUploadAndSend(file, selectedConversationId, currentUserId, nextMessage, selectedConversation, hasMessages, pendingConversationTrackerRef);
        } else if (nextMessage) {
          await handleTextMessageSend(selectedConversationId, currentUserId, nextMessage, selectedConversation, hasMessages, pendingConversationTrackerRef);
        }
      } catch (error) {
        setUploadError(normalizeChatError(error));
      } finally {
        if (file) {
          setIsUploading(false);
        }
      }
    });
  }

  return {
    draftMessage,
    setDraftMessage,
    uploadError,
    isUploading,
    isPending,
    handleStartConversation,
    handleCreateGroup,
    handleSendMessage,
  };
}
