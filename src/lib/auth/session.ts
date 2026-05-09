import type { AuthStatus } from "@/types/auth";

export function shouldRedirectToLogin(status: AuthStatus) {
  return status === "unauthenticated";
}

export function shouldRedirectToChat(status: AuthStatus) {
  return status === "authenticated";
}

