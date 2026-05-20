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
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
};

type CreateGroupConversationInput = {
  conversationId: string;
  currentUserId: string;
  groupName: string;
  memberIds: string[];
};

type ConversationWriteDeps = {
  db: unknown;
  doc: typeof firestoreDoc;
  writeBatch: typeof firestoreWriteBatch;
  serverTimestamp: typeof firestoreServerTimestamp;
};

export function createMessageRecord(
  input:
    | (Pick<CreateConversationInput, "conversationId" | "currentUserId" | "text"> & {
        senderId?: string;
      })
    | (Pick<CreateConversationInput, "conversationId" | "currentUserId"> & {
        senderId?: string;
        fileUrl: string;
        fileName?: string;
        fileType?: string;
        fileSize?: number;
        text?: string;
      }),
  timestamp: FirestoreTimestamp,
): Message {
  const senderId = (input as any).senderId ?? input.currentUserId;

  if ((input as any).fileUrl) {
    return {
      conversationId: input.conversationId,
      senderId,
      type: "file",
      fileUrl: (input as any).fileUrl,
      fileName: (input as any).fileName,
      fileType: (input as any).fileType,
      fileSize: (input as any).fileSize,
      text: (input as any).text,
      deliveredTo: [senderId],
      readBy: [senderId],
      createdAt: timestamp,
    };
  }

  return {
    conversationId: input.conversationId,
    senderId,
    type: "text",
    text: (input as any).text ?? "",
    deliveredTo: [senderId],
    readBy: [senderId],
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

  const lastMessageText = input.fileUrl
    ? `${input.fileType?.startsWith("image/") ? "[image]" : "[file]"} ${input.fileName ?? ""}`
    : input.text ?? "";

  return {
    type: "direct",
    memberIds,
    memberKey: buildDirectMemberKey(input.currentUserId, input.otherUserId),
    lastMessageText,
    lastMessageSenderId: input.currentUserId,
    lastMessageAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createGroupConversationRecord(
  input: CreateGroupConversationInput,
  timestamp: FirestoreTimestamp,
): Conversation {
  const memberIds = Array.from(
    new Set([...input.memberIds, input.currentUserId]),
  ).sort();

  return {
    type: "group",
    name: input.groupName.trim(),
    ownerId: input.currentUserId,
    memberIds,
    lastMessageText: "",
    lastMessageSenderId: "",
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
  batch.set(messageRef, createMessageRecord(input as any, timestamp));

  await batch.commit();
}

export async function createGroupConversation(
  input: CreateGroupConversationInput,
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

  batch.set(conversationRef, createGroupConversationRecord(input, timestamp));

  await batch.commit();
}
