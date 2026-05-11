import { useRef, useState, useTransition } from "react";
import { createDirectConversationWithFirstMessage } from "@/lib/chat/conversations";
import { buildDirectMemberKey } from "@/lib/chat/member-key";
import { sendMessageToConversation } from "@/lib/chat/messages";
import {
  createPendingConversationRecord,
  createPendingConversationTracker,
} from "@/lib/chat/pending-conversations";
import { validateChatUpload } from "@/lib/chat/upload-constraints";
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

  async function handleStartConversation(otherUserId: string) {
    if (!currentUserId) return;

    const existingConversation = conversations.find((conversation) =>
      buildDirectMemberKey(currentUserId, otherUserId) ===
      buildDirectMemberKey(conversation.memberIds[0] ?? "", conversation.memberIds[1] ?? ""),
    );

    if (existingConversation) {
      setSelectedConversationId(existingConversation.id);
      return;
    }

    const conversationId = crypto.randomUUID();
    const memberIds = [currentUserId, otherUserId].sort();
    pendingConversationTrackerRef.current.rememberPartner(conversationId, otherUserId);
    setConversations((currentConversations) => [
      createPendingConversationRecord(conversationId, currentUserId, otherUserId),
      ...currentConversations.filter((conversation) => conversation.id !== conversationId),
    ]);
    setSelectedConversationId(conversationId);

    const { setDoc, doc, serverTimestamp } = await import("firebase/firestore");
    const { getFirebaseServices } = await import("@/lib/firebase/client");
    const services = getFirebaseServices();

    if (!services) return;

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
  }

  function getOtherUserIdForConversation(conversationId: string) {
    return pendingConversationTrackerRef.current.resolveOtherUserId(
      conversationId,
      currentUserId,
      conversations,
    );
  }

  function handleSendMessage(file?: File) {
    if (!currentUserId || !selectedConversationId || isUploading) return;

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
          const { getDownloadURL, ref: storageRef, uploadBytes, getStorage } = await import(
            "firebase/storage"
          );
          const { getFirebaseServices } = await import("@/lib/firebase/client");
          const services = getFirebaseServices();

          if (!services) {
            setUploadError("Firebase is not configured.");
            return;
          }

          const storage = getStorage(services.app);
          const filename = `${Date.now()}_${file.name}`;
          const path = `conversations/${selectedConversationId}/files/${filename}`;
          const fileRef = storageRef(storage, path);

          await uploadBytes(fileRef, file as Blob);
          const url = await getDownloadURL(fileRef);

          if (!hasMessages) {
            await createDirectConversationWithFirstMessage({
              conversationId: selectedConversationId,
              currentUserId,
              otherUserId: getOtherUserIdForConversation(selectedConversationId),
              fileUrl: url,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              text: nextMessage,
            });
          } else {
            await sendMessageToConversation({
              conversationId: selectedConversationId,
              senderId: currentUserId,
              text: nextMessage,
              fileUrl: url,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            });
          }

          return;
        }

        if (!nextMessage) return;

        if (!hasMessages) {
          await createDirectConversationWithFirstMessage({
            conversationId: selectedConversationId,
            currentUserId,
            otherUserId: getOtherUserIdForConversation(selectedConversationId),
            text: nextMessage,
          });
          return;
        }

        await sendMessageToConversation({
          conversationId: selectedConversationId,
          senderId: currentUserId,
          text: nextMessage,
        });
      } catch {
        setUploadError("Upload failed. Please try again.");
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
    handleSendMessage,
  };
}
