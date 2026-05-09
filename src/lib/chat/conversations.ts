import {
  doc as firestoreDoc,
  serverTimestamp as firestoreServerTimestamp,
  writeBatch as firestoreWriteBatch,
} from "firebase/firestore";
import { buildDirectMemberKey } from "@/lib/chat/member-key";
import type { Conversation, FirestoreTimestamp, Message } from "@/types/chat";

type CreateConversationInput = {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  text: string;
};

type ConversationWriteDeps = {
  db: unknown;
  doc: typeof firestoreDoc;
  writeBatch: typeof firestoreWriteBatch;
  serverTimestamp: typeof firestoreServerTimestamp;
};

export function createMessageRecord(
  input: Pick<CreateConversationInput, "conversationId" | "currentUserId" | "text"> & {
    senderId?: string;
  },
  timestamp: FirestoreTimestamp,
): Message {
  const senderId = input.senderId ?? input.currentUserId;

  return {
    conversationId: input.conversationId,
    senderId,
    type: "text",
    text: input.text,
    createdAt: timestamp,
  };
}

export function createConversationRecord(
  input: CreateConversationInput,
  timestamp: FirestoreTimestamp,
): Conversation {
  const memberIds = [input.currentUserId, input.otherUserId].sort() as [
    string,
    string,
  ];

  return {
    type: "direct",
    memberIds,
    memberKey: buildDirectMemberKey(input.currentUserId, input.otherUserId),
    lastMessageText: input.text,
    lastMessageSenderId: input.currentUserId,
    lastMessageAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function getConversationWriteDeps(): Promise<ConversationWriteDeps> {
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

export async function createDirectConversationWithFirstMessage(
  input: CreateConversationInput,
  deps?: ConversationWriteDeps,
) {
  const resolvedDeps = deps ?? (await getConversationWriteDeps());
  const batch = resolvedDeps.writeBatch(resolvedDeps.db as never);
  const timestamp = resolvedDeps.serverTimestamp();
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
    "initial",
  );

  batch.set(conversationRef, createConversationRecord(input, timestamp));
  batch.set(messageRef, createMessageRecord(input, timestamp));

  await batch.commit();
}
