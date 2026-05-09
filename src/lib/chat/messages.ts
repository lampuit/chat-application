import {
  doc as firestoreDoc,
  serverTimestamp as firestoreServerTimestamp,
  writeBatch as firestoreWriteBatch,
} from "firebase/firestore";
import { createMessageRecord } from "@/lib/chat/conversations";
import type { ConversationWriteDeps } from "@/lib/chat/messages.types";

export type SendMessageInput = {
  conversationId: string;
  senderId: string;
  text: string;
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

  batch.set(
    conversationRef,
    {
      lastMessageText: input.text,
      lastMessageSenderId: input.senderId,
      lastMessageAt: timestamp,
      updatedAt: timestamp,
    },
    { merge: true },
  );
  batch.set(
    messageRef,
    createMessageRecord(
      {
        conversationId: input.conversationId,
        currentUserId: input.senderId,
        text: input.text,
      },
      timestamp,
    ),
  );

  await batch.commit();
}
