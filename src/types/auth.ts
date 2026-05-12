import type { MultiFactorInfo, MultiFactorResolver, TotpSecret, UserCredential } from "firebase/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthUserSummary = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
};

export type TotpEnrollment = {
  secret: TotpSecret;
  secretKey: string;
  qrCodeUrl: string;
  codeLength: number;
  codeIntervalSeconds: number;
};

export type TotpSignInChallenge = {
  resolver: MultiFactorResolver;
  hint: MultiFactorInfo;
  factorId: string;
  displayName: string | null;
};

export type LoginResult =
  | {
      status: "authenticated";
      credential: UserCredential;
    }
  | {
      status: "mfa-required";
      challenge: TotpSignInChallenge;
    };
