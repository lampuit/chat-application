import { describe, expect, it, vi } from "vitest";
import { loginWithEmailAndPassword } from "@/lib/auth/auth-service";

describe("loginWithEmailAndPassword", () => {
  it("normalizes Firebase auth error codes into a friendly login message", async () => {
    const signIn = vi.fn().mockRejectedValue({
      code: "auth/invalid-credential",
    });

    await expect(
      loginWithEmailAndPassword("user@example.com", "secret123", {
        auth: "auth-instance",
        signInWithEmailAndPassword: signIn,
      }).catch((error) => error),
    ).resolves.toMatchObject({
      message: "Email or password is incorrect.",
    });
  });

  it("returns an MFA challenge when Firebase requires a second factor", async () => {
    const signIn = vi.fn().mockRejectedValue({ code: "auth/multi-factor-auth-required" });
    const resolver = {
      hints: [
        {
          uid: "enrollment-1",
          factorId: "totp",
          displayName: "Google Authenticator",
        },
      ],
    };
    const getResolver = vi.fn().mockReturnValue(resolver);

    const result = await loginWithEmailAndPassword("user@example.com", "secret123", {
      auth: "auth-instance",
      signInWithEmailAndPassword: signIn,
      getMultiFactorResolver: getResolver,
    });

    expect(result).toEqual({
      status: "mfa-required",
      challenge: {
        resolver,
        hint: resolver.hints[0],
        factorId: "totp",
        displayName: "Google Authenticator",
      },
    });
  });
});
