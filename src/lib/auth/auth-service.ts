import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  getDefaultUserDocumentDeps,
  upsertUserProfile,
  type UserDocumentDeps,
} from "@/lib/firestore/users";
import type { FirestoreTimestamp, UserProfile } from "@/types/chat";

type FirebaseUserLike = Pick<User, "uid" | "email" | "displayName" | "photoURL">;

function getDisplayName(user: FirebaseUserLike) {
  if (user.displayName) {
    return user.displayName;
  }

  if (user.email) {
    return user.email.split("@")[0] ?? "User";
  }

  return "User";
}

export function buildUserProfile(
  user: FirebaseUserLike,
  timestamp: FirestoreTimestamp,
): UserProfile {
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: getDisplayName(user),
    photoURL: user.photoURL,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSeenAt: timestamp,
  };
}

export async function syncUserProfile(
  user: FirebaseUserLike,
  deps?: UserDocumentDeps,
) {
  const resolvedDeps = deps ?? (await getDefaultUserDocumentDeps());
  const timestamp = resolvedDeps.serverTimestamp();
  const profile = buildUserProfile(user, timestamp);

  await upsertUserProfile(user.uid, profile, resolvedDeps);
}

async function getAuthInstance() {
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    throw new Error("Firebase is not configured. Add the required environment variables.");
  }

  return services.auth;
}

type RegisterDeps = {
  auth: unknown;
  createUserWithEmailAndPassword: typeof createUserWithEmailAndPassword;
  updateProfile: typeof updateProfile;
  syncUserProfile: typeof syncUserProfile;
};

export async function registerWithEmailAndPassword(
  email: string,
  password: string,
  displayName: string,
  deps?: RegisterDeps,
) {
  const auth = deps?.auth ?? (await getAuthInstance());
  const createUser = deps?.createUserWithEmailAndPassword ?? createUserWithEmailAndPassword;
  const syncUser = deps?.syncUserProfile ?? syncUserProfile;
  const syncProfile = deps?.updateProfile ?? updateProfile;
  const credential = await createUser(auth as never, email, password);

  await syncProfile(credential.user, { displayName });
  await syncUser({
    ...credential.user,
    displayName,
  });

  return credential;
}

export async function loginWithEmailAndPassword(email: string, password: string) {
  const auth = await getAuthInstance();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await syncUserProfile(credential.user);
  return credential;
}

export async function logout() {
  const auth = await getAuthInstance();
  await signOut(auth);
}
