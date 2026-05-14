import { TotpMultiFactorGenerator, type ActionCodeSettings, type MultiFactorError, type User } from "firebase/auth";
import type { TotpSignInChallenge } from "@/types/auth";

export type FirebaseUserLike = Pick<User, "uid" | "email" | "displayName" | "photoURL">;
export type FirebaseTotpUserLike = Pick<User, "email" | "emailVerified">;
export type FirebaseVerificationUserLike = Pick<User, "email" | "emailVerified"> & {
  reload?: () => Promise<void>;
};

export function getFirebaseAuthErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof error.error === "object" &&
    error.error !== null &&
    "message" in error.error &&
    typeof error.error.message === "string"
  ) {
    const nestedMessage = error.error.message;

    if (nestedMessage.includes("OPERATION_NOT_ALLOWED")) {
      return "auth/operation-not-allowed";
    }

    if (nestedMessage.includes("INVALID_LOGIN_CREDENTIALS")) {
      return "auth/invalid-credential";
    }
  }

  return null;
}

export function getDisplayName(user: FirebaseUserLike) {
  if (user.displayName) {
    return user.displayName;
  }

  if (user.email) {
    return user.email.split("@")[0] ?? "User";
  }

  return "User";
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

export function normalizeVerificationEmailError(error: unknown) {
  const errorCode = getFirebaseAuthErrorCode(error);

  if (errorCode === "auth/unauthorized-continue-uri") {
    return new Error(
      "Firebase blocked the verification email because this app URL is not authorized. Add your app domain to Firebase Authentication Authorized Domains and set NEXT_PUBLIC_APP_URL if needed.",
    );
  }

  if (errorCode === "auth/invalid-continue-uri") {
    return new Error(
      "The verification return URL is invalid. Check NEXT_PUBLIC_APP_URL and your Firebase email action settings.",
    );
  }

  if (errorCode === "auth/missing-continue-uri") {
    return new Error(
      "Firebase could not build the verification email because the return URL is missing.",
    );
  }

  if (errorCode === "auth/operation-not-allowed") {
    return new Error(
      "Firebase Authentication is not fully enabled for this project. Turn on Email/Password sign-in and verify that email actions are allowed.",
    );
  }

  if (errorCode === "auth/too-many-requests") {
    return new Error(
      "Firebase temporarily blocked verification emails because too many requests were made. Wait a moment and try again.",
    );
  }

  return error instanceof Error ? error : new Error("Unable to send verification email.");
}

export function normalizeTotpError(error: unknown) {
  const errorCode = getFirebaseAuthErrorCode(error);

  if (errorCode === "auth/operation-not-allowed") {
    return new Error(
      "Google Authenticator 2-step verification is not enabled in Firebase. Enable Identity Platform and TOTP MFA in Firebase Authentication first.",
    );
  }

  if (errorCode === "auth/invalid-verification-code") {
    return new Error(
      "The Google Authenticator code is invalid. Enter the latest 6-digit code and try again.",
    );
  }

  if (errorCode === "auth/code-expired") {
    return new Error(
      "The Google Authenticator code has expired. Enter the newest 6-digit code and try again.",
    );
  }

  if (errorCode === "auth/requires-recent-login") {
    return new Error(
      "Re-enter your current password before setting up Google Authenticator 2-step verification.",
    );
  }

  if (errorCode === "auth/wrong-password" || errorCode === "auth/invalid-credential") {
    return new Error("Your current password is incorrect.");
  }

  return error instanceof Error
    ? error
    : new Error("Unable to complete Google Authenticator verification.");
}

export function isMultiFactorRequiredError(error: unknown): error is MultiFactorError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "auth/multi-factor-auth-required"
  );
}

export function buildTotpSignInChallenge(
  resolver: TotpSignInChallenge["resolver"],
): TotpSignInChallenge {
  const hint = resolver.hints.find(
    (factorHint) => factorHint.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  );

  if (!hint) {
    throw new Error("No TOTP second factor is available for this account.");
  }

  return {
    resolver,
    hint,
    factorId: hint.factorId,
    displayName: hint.displayName ?? null,
  };
}

export function getTotpEnrollmentDisplayName() {
  return "Google Authenticator";
}
