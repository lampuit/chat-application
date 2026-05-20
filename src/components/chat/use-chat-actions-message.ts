import { createDirectConversationWithFirstMessage, createGroupConversation } from "@/lib/chat/conversations";
import { sendMessageToConversation } from "@/lib/chat/messages";
import { normalizeChatError } from "@/lib/chat/errors";
import type { ConversationRecord } from "./use-chat-data";

export async function handleFileUploadAndSend(
  file: File,
  selectedConversationId: string,
  currentUserId: string,
  nextMessage: string,
  selectedConversation: ConversationRecord | undefined,
  hasMessages: boolean,
  pendingConversationTrackerRef: React.MutableRefObject<any>,
) {
  const { getDownloadURL, ref: storageRef, uploadBytes, getStorage } = await import(
    "firebase/storage"
  );
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    throw new Error("Firebase is not configured. Add the required environment variables.");
  }

  const storage = getStorage(services.app);
  const filename = `${Date.now()}_${file.name}`;
  const path = `conversations/${selectedConversationId}/files/${filename}`;
  const fileRef = storageRef(storage, path);

  await uploadBytes(fileRef, file as Blob);
  const url = await getDownloadURL(fileRef);

  const isExistingGroupConversation = selectedConversation?.type === "group";
  const otherUserId = pendingConversationTrackerRef.current.resolveOtherUserId(
    selectedConversationId,
    currentUserId,
    [],
  );

  if (!hasMessages && !isExistingGroupConversation) {
    await createDirectConversationWithFirstMessage({
      conversationId: selectedConversationId,
      currentUserId,
      otherUserId,
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
}

export async function handleTextMessageSend(
  selectedConversationId: string,
  currentUserId: string,
  nextMessage: string,
  selectedConversation: ConversationRecord | undefined,
  hasMessages: boolean,
  pendingConversationTrackerRef: React.MutableRefObject<any>,
) {
  const isExistingGroupConversation = selectedConversation?.type === "group";
  const otherUserId = pendingConversationTrackerRef.current.resolveOtherUserId(
    selectedConversationId,
    currentUserId,
    [],
  );

  if (!hasMessages && !isExistingGroupConversation) {
    await createDirectConversationWithFirstMessage({
      conversationId: selectedConversationId,
      currentUserId,
      otherUserId,
      text: nextMessage,
    });
    return;
  }

  await sendMessageToConversation({
    conversationId: selectedConversationId,
    senderId: currentUserId,
    text: nextMessage,
  });
}
