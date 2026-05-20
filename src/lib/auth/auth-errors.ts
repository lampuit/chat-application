import type { MultiFactorError } from "firebase/auth";

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

export function normalizeAuthError(error: unknown) {
  const errorCode = getFirebaseAuthErrorCode(error);

  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return new Error("Email or password is incorrect.");
    case "auth/email-already-in-use":
      return new Error("This email address is already in use.");
    case "auth/invalid-email":
      return new Error("Enter a valid email address.");
    case "auth/weak-password":
      return new Error("Choose a stronger password with at least 6 characters.");
    case "auth/too-many-requests":
      return new Error("Too many attempts were made. Please wait a moment and try again.");
    case "auth/network-request-failed":
      return new Error("Network error. Check your connection and try again.");
    case "auth/operation-not-allowed":
      return new Error(
        "Firebase Authentication is not fully enabled for this project. Turn on Email/Password sign-in and try again.",
      );
    default:
      return error instanceof Error ? error : new Error("Authentication failed. Please try again.");
  }
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
