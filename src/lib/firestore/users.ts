import {
  arrayUnion as firestoreArrayUnion,
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

export type UserTokenDocumentDeps = UserDocumentDeps & {
  arrayUnion: typeof firestoreArrayUnion;
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

export async function getDefaultUserTokenDocumentDeps(): Promise<UserTokenDocumentDeps> {
  const deps = await getDefaultUserDocumentDeps();

  return {
    ...deps,
    arrayUnion: firestoreArrayUnion,
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

export async function storeUserFcmToken(
  uid: string,
  token: string,
  deps?: UserTokenDocumentDeps,
) {
  const resolvedDeps = deps ?? (await getDefaultUserTokenDocumentDeps());
  const userRef = resolvedDeps.doc(resolvedDeps.db as never, "users", uid);

  await resolvedDeps.setDoc(
    userRef,
    {
      fcmTokens: resolvedDeps.arrayUnion(token),
      updatedAt: resolvedDeps.serverTimestamp(),
    },
    { merge: true },
  );
}
