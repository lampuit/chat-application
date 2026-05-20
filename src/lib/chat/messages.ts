import {
  arrayUnion as firestoreArrayUnion,
  doc as firestoreDoc,
  serverTimestamp as firestoreServerTimestamp,
  writeBatch as firestoreWriteBatch,
} from "firebase/firestore";
import { createMessageRecord } from "@/lib/chat/conversations";
import type { ConversationWriteDeps } from "@/lib/chat/messages.types";

export type SendMessageInput = {
  conversationId: string;
  senderId: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

async function getMessageWriteDeps(): Promise<ConversationWriteDeps> {
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    throw new Error("Firebase is not configured. Add the required environment variables.");
  }

  return {
    db: services.db,
    doc: firestoreDoc,
    writeBatch: firestoreWriteBatch,
    serverTimestamp: firestoreServerTimestamp,
  };
}

export async function sendMessageToConversation(
  input: SendMessageInput,
  deps?: ConversationWriteDeps,
) {
  const resolvedDeps = deps ?? (await getMessageWriteDeps());
  const batch = resolvedDeps.writeBatch(resolvedDeps.db as never);
  const timestamp = resolvedDeps.serverTimestamp();
  const messageId = crypto.randomUUID();
  const conversationRef = resolvedDeps.doc(
    resolvedDeps.db as never,
    "conversations",
    input.conversationId,
  );
  const messageRef = resolvedDeps.doc(
    resolvedDeps.db as never,
    "conversations",
    input.conversationId,
    "messages",
    messageId,
  );

  const lastMessageText = input.fileUrl
    ? `${input.fileType?.startsWith("image/") ? "[image]" : "[file]"} ${input.fileName ?? ""}`
    : input.text ?? "";

  batch.set(
    conversationRef,
    {
      lastMessageText,
      lastMessageSenderId: input.senderId,
      lastMessageAt: timestamp,
      updatedAt: timestamp,
    },
    { merge: true },
  );

  batch.set(
    messageRef,
    createMessageRecord(
      input.fileUrl
        ? {
            conversationId: input.conversationId,
            currentUserId: input.senderId,
            fileUrl: input.fileUrl,
            fileName: input.fileName,
            fileType: input.fileType,
            fileSize: input.fileSize,
            text: input.text,
          }
        : {
            conversationId: input.conversationId,
            currentUserId: input.senderId,
            text: input.text ?? "",
          },
      timestamp,
    ),
  );

  await batch.commit();
}

export async function markConversationMessagesSeen(
  conversationId: string,
  currentUserId: string,
  messageIds: string[],
) {
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    throw new Error("Firebase is not configured. Add the required environment variables.");
  }

  const batch = firestoreWriteBatch(services.db);
  let hasChanges = false;

  messageIds.forEach((messageId) => {
    hasChanges = true;
    batch.update(
      firestoreDoc(
        services.db,
        "conversations",
        conversationId,
        "messages",
        messageId,
      ),
      {
        deliveredTo: firestoreArrayUnion(currentUserId),
        readBy: firestoreArrayUnion(currentUserId),
      },
    );
  });

  if (!hasChanges) {
    return;
  }

  await batch.commit();
}
