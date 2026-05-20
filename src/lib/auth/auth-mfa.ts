import {
  multiFactor,
  TotpMultiFactorGenerator,
  EmailAuthProvider,
  reauthenticateWithCredential,
  type User,
  type TotpSecret,
  type MultiFactorError,
} from "firebase/auth";
import type { TotpEnrollment, TotpSignInChallenge } from "@/types/auth";
import { normalizeTotpError } from "./auth-errors";
import { getTotpEnrollmentDisplayName } from "./auth-utils";

type FirebaseTotpUserLike = Pick<User, "email" | "emailVerified">;

export function isMultiFactorRequiredError(error: unknown): error is MultiFactorError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "auth/multi-factor-auth-required"
  );
}

export function buildTotpSignInChallenge(resolver: TotpSignInChallenge["resolver"]): TotpSignInChallenge {
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

type StartTotpEnrollmentDeps = {
  currentUser?: FirebaseTotpUserLike;
  getMultiFactorUser?: typeof multiFactor;
  generateSecret?: typeof TotpMultiFactorGenerator.generateSecret;
  emailProviderCredential?: typeof EmailAuthProvider.credential;
  reauthenticateWithCredential?: typeof reauthenticateWithCredential;
  issuer?: string;
};

async function getCurrentUser() {
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    throw new Error("Firebase is not configured. Add the required environment variables.");
  }

  const auth = services.auth;
  const user = auth.currentUser;

  if (!user) {
    throw new Error("You need to sign in before managing 2-step verification.");
  }

  return user;
}

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
  currentUser?: FirebaseTotpUserLike;
  getMultiFactorUser?: typeof multiFactor;
  assertionForEnrollment?: typeof TotpMultiFactorGenerator.assertionForEnrollment;
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
  syncUserProfile?: any;
};

export async function completeTotpSignIn(
  challenge: TotpSignInChallenge,
  verificationCode: string,
  deps?: Partial<CompleteTotpSignInDeps>,
) {
  const assertionForSignIn =
    deps?.assertionForSignIn ?? TotpMultiFactorGenerator.assertionForSignIn;

  let credential: Awaited<ReturnType<TotpSignInChallenge["resolver"]["resolveSignIn"]>>;

  try {
    const assertion = assertionForSignIn(challenge.hint.uid, verificationCode);
    credential = await challenge.resolver.resolveSignIn(assertion);
  } catch (error) {
    throw normalizeTotpError(error);
  }

  if (deps?.syncUserProfile) {
    await deps.syncUserProfile(credential.user);
  }

  return credential;
}
