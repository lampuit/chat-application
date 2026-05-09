export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthUserSummary = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

