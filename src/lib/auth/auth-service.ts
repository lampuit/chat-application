import {
  applyActionCode,
  getMultiFactorResolver,
  multiFactor,
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  TotpMultiFactorGenerator,
  updateProfile,
  type ActionCodeSettings,
  type User,
  type MultiFactorError,
  type TotpSecret,
} from "firebase/auth";
import {
  getDefaultUserDocumentDeps,
  upsertUserProfile,
  type UserDocumentDeps,
} from "@/lib/firestore/users";
import type { FirestoreTimestamp, UserProfile } from "@/types/chat";
import type { LoginResult, TotpEnrollment, TotpSignInChallenge } from "@/types/auth";

type FirebaseUserLike = Pick<User, "uid" | "email" | "displayName" | "photoURL">;
type FirebaseTotpUserLike = Pick<User, "email" | "emailVerified">;
type FirebaseVerificationUserLike = Pick<User, "email" | "emailVerified"> & {
  reload?: () => Promise<void>;
};

function getFirebaseAuthErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

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

async function getCurrentUser() {
  const auth = await getAuthInstance();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You need to sign in before managing 2-step verification.");
  }

  return user;
}

function getTotpEnrollmentDisplayName() {
  return "Google Authenticator";
}

function getAppBaseUrl() {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return "http://localhost:3000";
}

function buildEmailVerificationActionCodeSettings(
  appBaseUrl: string,
): ActionCodeSettings {
  return {
    url: new URL("/verify-email", appBaseUrl).toString(),
    handleCodeInApp: false,
  };
}

function normalizeVerificationEmailError(error: unknown) {
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

function normalizeTotpError(error: unknown) {
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

  return error instanceof Error
    ? error
    : new Error("Unable to complete Google Authenticator verification.");
}

function isMultiFactorRequiredError(error: unknown): error is MultiFactorError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "auth/multi-factor-auth-required"
  );
}

function buildTotpSignInChallenge(resolver: TotpSignInChallenge["resolver"]): TotpSignInChallenge {
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

type SendCurrentUserVerificationEmailDeps = {
  currentUser: FirebaseVerificationUserLike;
  sendEmailVerification: typeof sendEmailVerification;
  appBaseUrl: string;
};

export async function sendCurrentUserVerificationEmail(
  deps?: Partial<SendCurrentUserVerificationEmailDeps>,
) {
  const currentUser = deps?.currentUser ?? (await getCurrentUser());
  const sendVerification = deps?.sendEmailVerification ?? sendEmailVerification;
  const appBaseUrl = deps?.appBaseUrl ?? getAppBaseUrl();

  try {
    await sendVerification(
      currentUser as User,
      buildEmailVerificationActionCodeSettings(appBaseUrl),
    );
  } catch (error) {
    throw normalizeVerificationEmailError(error);
  }
}

type ApplyEmailVerificationCodeDeps = {
  auth: unknown;
  applyActionCode: typeof applyActionCode;
};

export async function applyEmailVerificationCode(
  oobCode: string,
  deps?: Partial<ApplyEmailVerificationCodeDeps>,
) {
  const auth = deps?.auth ?? (await getAuthInstance());
  const applyCode = deps?.applyActionCode ?? applyActionCode;
  await applyCode(auth as never, oobCode);
}

type ReloadCurrentUserDeps = {
  currentUser: FirebaseVerificationUserLike & { reload: () => Promise<void> };
};

export async function reloadCurrentUser(
  deps?: Partial<ReloadCurrentUserDeps>,
) {
  const currentUser = deps?.currentUser ?? (await getCurrentUser());

  if ("reload" in currentUser && typeof currentUser.reload === "function") {
    await currentUser.reload();
  } else {
    await reload(currentUser as User);
  }

  return currentUser;
}

type LoginDeps = {
  auth: unknown;
  signInWithEmailAndPassword: typeof signInWithEmailAndPassword;
  syncUserProfile: typeof syncUserProfile;
  getMultiFactorResolver: typeof getMultiFactorResolver;
};

export async function loginWithEmailAndPassword(
  email: string,
  password: string,
  deps?: Partial<LoginDeps>,
): Promise<LoginResult> {
  const auth = deps?.auth ?? (await getAuthInstance());
  const signIn = deps?.signInWithEmailAndPassword ?? signInWithEmailAndPassword;
  const syncUser = deps?.syncUserProfile ?? syncUserProfile;
  const getResolver = deps?.getMultiFactorResolver ?? getMultiFactorResolver;

  try {
    const credential = await signIn(auth as never, email, password);
    await syncUser(credential.user);

    return {
      status: "authenticated",
      credential,
    };
  } catch (error) {
    if (isMultiFactorRequiredError(error)) {
      return {
        status: "mfa-required",
        challenge: buildTotpSignInChallenge(getResolver(auth as never, error)),
      };
    }

    throw error;
  }
}

type StartTotpEnrollmentDeps = {
  currentUser: FirebaseTotpUserLike;
  getMultiFactorUser: typeof multiFactor;
  generateSecret: typeof TotpMultiFactorGenerator.generateSecret;
  issuer: string;
};

export async function startTotpEnrollment(
  deps?: Partial<StartTotpEnrollmentDeps>,
): Promise<TotpEnrollment> {
  const currentUser = deps?.currentUser ?? (await getCurrentUser());
  const getMultiFactorUser = deps?.getMultiFactorUser ?? multiFactor;
  const generateSecret = deps?.generateSecret ?? TotpMultiFactorGenerator.generateSecret;
  const issuer = deps?.issuer ?? "Chat App";

  if (!currentUser.emailVerified) {
    throw new Error("Verify your email before enabling 2-step verification.");
  }

  let multiFactorSession: Awaited<ReturnType<ReturnType<typeof multiFactor>["getSession"]>>;

  try {
    multiFactorSession = await getMultiFactorUser(currentUser as User).getSession();
  } catch (error) {
    throw normalizeTotpError(error);
  }

  let secret: TotpSecret;

  try {
    secret = await generateSecret(multiFactorSession);
  } catch (error) {
    throw normalizeTotpError(error);
  }

  const qrCodeUrl = secret.generateQrCodeUrl(currentUser.email ?? "user", issuer);

  return {
    secret,
    secretKey: secret.secretKey,
    qrCodeUrl,
    codeLength: secret.codeLength,
    codeIntervalSeconds: secret.codeIntervalSeconds,
  };
}

type FinalizeTotpEnrollmentArgs = {
  secret: TotpSecret;
  verificationCode: string;
  displayName?: string;
};

type FinalizeTotpEnrollmentDeps = {
  currentUser: FirebaseTotpUserLike;
  getMultiFactorUser: typeof multiFactor;
  assertionForEnrollment: typeof TotpMultiFactorGenerator.assertionForEnrollment;
};

export async function finalizeTotpEnrollment(
  args: FinalizeTotpEnrollmentArgs,
  deps?: Partial<FinalizeTotpEnrollmentDeps>,
) {
  const currentUser = deps?.currentUser ?? (await getCurrentUser());
  const getMultiFactorUser = deps?.getMultiFactorUser ?? multiFactor;
  const assertionForEnrollment =
    deps?.assertionForEnrollment ?? TotpMultiFactorGenerator.assertionForEnrollment;

  try {
    const assertion = assertionForEnrollment(args.secret, args.verificationCode);
    await getMultiFactorUser(currentUser as User).enroll(
      assertion,
      args.displayName ?? getTotpEnrollmentDisplayName(),
    );
  } catch (error) {
    throw normalizeTotpError(error);
  }
}

type CompleteTotpSignInDeps = {
  assertionForSignIn: typeof TotpMultiFactorGenerator.assertionForSignIn;
  syncUserProfile: typeof syncUserProfile;
};

export async function completeTotpSignIn(
  challenge: TotpSignInChallenge,
  verificationCode: string,
  deps?: Partial<CompleteTotpSignInDeps>,
) {
  const assertionForSignIn =
    deps?.assertionForSignIn ?? TotpMultiFactorGenerator.assertionForSignIn;
  const syncUser = deps?.syncUserProfile ?? syncUserProfile;
  let credential: Awaited<ReturnType<TotpSignInChallenge["resolver"]["resolveSignIn"]>>;

  try {
    const assertion = assertionForSignIn(challenge.hint.uid, verificationCode);
    credential = await challenge.resolver.resolveSignIn(assertion);
  } catch (error) {
    throw normalizeTotpError(error);
  }

  await syncUser(credential.user);

  return credential;
}

export async function logout() {
  const auth = await getAuthInstance();
  await signOut(auth);
}
