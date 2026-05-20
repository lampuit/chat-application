import type { ActionCodeSettings } from "firebase/auth";
import type { FirestoreTimestamp, UserProfile } from "@/types/chat";
import type { User } from "firebase/auth";

type FirebaseUserLike = Pick<User, "uid" | "email" | "displayName" | "photoURL">;

export function getDisplayName(user: FirebaseUserLike) {
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

export function getTotpEnrollmentDisplayName() {
  return "Google Authenticator";
}

export function getAppBaseUrl() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export function buildEmailVerificationActionCodeSettings(
  appBaseUrl: string,
): ActionCodeSettings {
  return {
    url: new URL("/verify-email", appBaseUrl).toString(),
    handleCodeInApp: false,
  };
}
