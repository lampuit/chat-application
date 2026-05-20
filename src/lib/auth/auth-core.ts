import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  applyActionCode,
  sendEmailVerification,
  reload,
  getMultiFactorResolver,
  type User,
} from "firebase/auth";
import {
  getDefaultUserDocumentDeps,
  upsertUserProfile,
  type UserDocumentDeps,
} from "@/lib/firestore/users";
import type { LoginResult } from "@/types/auth";
import { buildUserProfile } from "./auth-utils";
import { normalizeAuthError, normalizeVerificationEmailError } from "./auth-errors";
import { buildEmailVerificationActionCodeSettings, getAppBaseUrl } from "./auth-utils";
import { isMultiFactorRequiredError, buildTotpSignInChallenge } from "./auth-mfa";

type FirebaseUserLike = Pick<User, "uid" | "email" | "displayName" | "photoURL">;
type FirebaseVerificationUserLike = Pick<User, "email" | "emailVerified"> & {
  reload?: () => Promise<void>;
};

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

export async function syncUserProfile(
  user: FirebaseUserLike,
  deps?: UserDocumentDeps,
) {
  const resolvedDeps = deps ?? (await getDefaultUserDocumentDeps());
  const timestamp = resolvedDeps.serverTimestamp();
  const profile = buildUserProfile(user, timestamp);

  await upsertUserProfile(user.uid, profile, resolvedDeps);
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
  try {
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
  } catch (error) {
    throw normalizeAuthError(error);
  }
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

    throw normalizeAuthError(error);
  }
}

export async function logout() {
  const auth = await getAuthInstance();
  await signOut(auth);
}

export { getAuthInstance, getCurrentUser };
