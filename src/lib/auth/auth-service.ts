export { buildUserProfile } from "./auth-utils";
export { getDisplayName, getTotpEnrollmentDisplayName, getAppBaseUrl, buildEmailVerificationActionCodeSettings } from "./auth-utils";

export {
  normalizeAuthError,
  normalizeVerificationEmailError,
  normalizeTotpError,
  getFirebaseAuthErrorCode,
} from "./auth-errors";

export {
  syncUserProfile,
  registerWithEmailAndPassword,
  sendCurrentUserVerificationEmail,
  applyEmailVerificationCode,
  reloadCurrentUser,
  loginWithEmailAndPassword,
  logout,
} from "./auth-core";

export {
  startTotpEnrollment,
  finalizeTotpEnrollment,
  completeTotpSignIn,
  buildTotpSignInChallenge,
  isMultiFactorRequiredError,
} from "./auth-mfa";
