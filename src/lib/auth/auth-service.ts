import {
  applyActionCode,
  EmailAuthProvider,
  getMultiFactorResolver,
  multiFactor,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  TotpMultiFactorGenerator,
  updateProfile,
  type User,
  type TotpSecret,
} from "firebase/auth";
import {
  getDefaultUserDocumentDeps,
  upsertUserProfile,
  type UserDocumentDeps,
} from "@/lib/firestore/users";
import type { FirestoreTimestamp, UserProfile } from "@/types/chat";
import type { LoginResult, TotpEnrollment, TotpSignInChallenge } from "@/types/auth";
import {
  buildEmailVerificationActionCodeSettings,
  buildTotpSignInChallenge,
  getAppBaseUrl,
  getDisplayName,
  getTotpEnrollmentDisplayName,
  isMultiFactorRequiredError,
  normalizeTotpError,
  normalizeVerificationEmailError,
  type FirebaseTotpUserLike,
  type FirebaseUserLike,
  type FirebaseVerificationUserLike,
} from "./auth-service-helpers";

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
  emailProviderCredential: typeof EmailAuthProvider.credential;
  reauthenticateWithCredential: typeof reauthenticateWithCredential;
  issuer: string;
};

export async function startTotpEnrollment(
  currentPassword: string,
  deps?: Partial<StartTotpEnrollmentDeps>,
): Promise<TotpEnrollment> {
  const currentUser = deps?.currentUser ?? (await getCurrentUser());
  const getMultiFactorUser = deps?.getMultiFactorUser ?? multiFactor;
  const generateSecret = deps?.generateSecret ?? TotpMultiFactorGenerator.generateSecret;
  const emailProviderCredential =
    deps?.emailProviderCredential ?? EmailAuthProvider.credential;
  const reauthenticateUser =
    deps?.reauthenticateWithCredential ?? reauthenticateWithCredential;
  const issuer = deps?.issuer ?? "Chat App";

  if (!currentUser.emailVerified) {
    throw new Error("Verify your email before enabling 2-step verification.");
  }

  if (!currentPassword.trim()) {
    throw new Error("Enter your current password to continue setting up 2-step verification.");
  }

  if (!currentUser.email) {
    throw new Error("Your account is missing an email address required for 2-step verification.");
  }

  try {
    const credential = emailProviderCredential(currentUser.email, currentPassword);
    await reauthenticateUser(currentUser as User, credential);
  } catch (error) {
    throw normalizeTotpError(error);
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
