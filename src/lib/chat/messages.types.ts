import type {
  doc as firestoreDoc,
  serverTimestamp as firestoreServerTimestamp,
  writeBatch as firestoreWriteBatch,
} from "firebase/firestore";

export type ConversationWriteDeps = {
  db: unknown;
  doc: typeof firestoreDoc;
  writeBatch: typeof firestoreWriteBatch;
  serverTimestamp: typeof firestoreServerTimestamp;
};

