import type { FieldValue, Timestamp } from "firebase/firestore";

export type FirestoreTimestamp = Timestamp | FieldValue;

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  lastSeenAt: FirestoreTimestamp;
};

export type Conversation =
  | {
      type: "direct";
      memberIds: [string, string];
      memberKey: string;
      lastMessageText: string;
      lastMessageSenderId: string;
      lastMessageAt: FirestoreTimestamp;
      createdAt: FirestoreTimestamp;
      updatedAt: FirestoreTimestamp;
    }
  | {
      type: "group";
      name: string;
      ownerId: string;
      memberIds: string[];
      lastMessageText: string;
      lastMessageSenderId: string;
      lastMessageAt: FirestoreTimestamp;
      createdAt: FirestoreTimestamp;
      updatedAt: FirestoreTimestamp;
    };

export type Message =
  | {
      conversationId: string;
      senderId: string;
      type: "text";
      text: string;
      deliveredTo?: string[];
      readBy?: string[];
      createdAt: FirestoreTimestamp;
    }
  | {
      conversationId: string;
      senderId: string;
      type: "file";
      fileUrl: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
      text?: string; // optional caption
      deliveredTo?: string[];
      readBy?: string[];
      createdAt: FirestoreTimestamp;
    };
