import {
  doc as firestoreDoc,
  serverTimestamp as firestoreServerTimestamp,
  setDoc as firestoreSetDoc,
} from "firebase/firestore";
import type { UserProfile } from "@/types/chat";

export type UserDocumentDeps = {
  db: unknown;
  doc: typeof firestoreDoc;
  setDoc: typeof firestoreSetDoc;
  serverTimestamp: typeof firestoreServerTimestamp;
};

export async function getDefaultUserDocumentDeps(): Promise<UserDocumentDeps> {
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    throw new Error("Firebase is not configured. Add the required environment variables.");
  }

  return {
    db: services.db,
    doc: firestoreDoc,
    setDoc: firestoreSetDoc,
    serverTimestamp: firestoreServerTimestamp,
  };
}

export async function upsertUserProfile(
  uid: string,
  profile: UserProfile,
  deps: UserDocumentDeps,
) {
  const userRef = deps.doc(deps.db as never, "users", uid);

  await deps.setDoc(userRef, profile, { merge: true });
}
