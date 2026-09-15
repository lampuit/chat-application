import { describe, expect, it, vi } from "vitest";
import type { UserCredential } from "firebase/auth";
import {
  completeTotpSignIn,
  finalizeTotpEnrollment,
  startTotpEnrollment,
} from "@/lib/auth/auth-service";

describe("startTotpEnrollment", () => {
  it("re-authenticates the current user before creating a TOTP secret", async () => {
    const credential = { providerId: "password" };
    const emailProviderCredential = vi.fn().mockReturnValue(credential);
    const reauthenticateWithCredential = vi.fn().mockResolvedValue(undefined);
    const getSession = vi.fn().mockResolvedValue("mfa-session");
    const generateQrCodeUrl = vi.fn().mockReturnValue("otpauth://totp/chat-app");
    const generateSecret = vi.fn().mockResolvedValue({
      secretKey: "SECRET123",
      codeLength: 6,
      codeIntervalSeconds: 30,
      generateQrCodeUrl,
    });
    const getMultiFactorUser = vi.fn().mockReturnValue({
      getSession,
    });
    const currentUser = {
      email: "user@example.com",
      emailVerified: true,
    };

    await startTotpEnrollment("secret123", {
      currentUser,
      emailProviderCredential,
      reauthenticateWithCredential,
      getMultiFactorUser,
      generateSecret,
      issuer: "Chat App",
    });

    expect(emailProviderCredential).toHaveBeenCalledWith("user@example.com", "secret123");
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(currentUser, credential);
    expect(getSession).toHaveBeenCalled();
  });

  it("rejects enrollment when the signed-in user's email is not verified", async () => {
    await expect(
      startTotpEnrollment("secret123", {
        currentUser: {
          email: "user@example.com",
          emailVerified: false,
        },
      }),
    ).rejects.toThrow("Verify your email before enabling 2-step verification.");
  });

  it("returns a secret key and QR code URL for verified users", async () => {
    const emailProviderCredential = vi.fn().mockReturnValue("password-credential");
    const reauthenticateWithCredential = vi.fn().mockResolvedValue(undefined);
    const getSession = vi.fn().mockResolvedValue("mfa-session");
    const generateQrCodeUrl = vi.fn().mockReturnValue("otpauth://totp/chat-app");
    const generateSecret = vi.fn().mockResolvedValue({
      secretKey: "SECRET123",
      codeLength: 6,
      codeIntervalSeconds: 30,
      generateQrCodeUrl,
    });
    const getMultiFactorUser = vi.fn().mockReturnValue({
      getSession,
    });

    const setup = await startTotpEnrollment("secret123", {
      currentUser: {
        email: "user@example.com",
        emailVerified: true,
      },
      emailProviderCredential,
      reauthenticateWithCredential,
      getMultiFactorUser,
      generateSecret,
      issuer: "Chat App",
    });

    expect(getMultiFactorUser).toHaveBeenCalled();
    expect(getSession).toHaveBeenCalled();
    expect(generateSecret).toHaveBeenCalledWith("mfa-session");
    expect(generateQrCodeUrl).toHaveBeenCalledWith("user@example.com", "Chat App");
    expect(setup).toMatchObject({
      secretKey: "SECRET123",
      qrCodeUrl: "otpauth://totp/chat-app",
      codeLength: 6,
      codeIntervalSeconds: 30,
    });
  });

  it("surfaces a clear error when TOTP MFA is not enabled in Firebase", async () => {
    const emailProviderCredential = vi.fn().mockReturnValue("password-credential");
    const reauthenticateWithCredential = vi.fn().mockResolvedValue(undefined);
    const getSession = vi.fn().mockResolvedValue("mfa-session");
    const generateSecret = vi.fn().mockRejectedValue({
      code: "auth/operation-not-allowed",
    });
    const getMultiFactorUser = vi.fn().mockReturnValue({
      getSession,
    });

    await expect(
      startTotpEnrollment("secret123", {
        currentUser: {
          email: "user@example.com",
          emailVerified: true,
        },
        emailProviderCredential,
        reauthenticateWithCredential,
        getMultiFactorUser,
        generateSecret,
      }),
    ).rejects.toThrow(
      "Google Authenticator 2-step verification is not enabled in Firebase.",
    );
  });

  it("normalizes REST-style Firebase errors when TOTP MFA is disabled", async () => {
    const emailProviderCredential = vi.fn().mockReturnValue("password-credential");
    const reauthenticateWithCredential = vi.fn().mockResolvedValue(undefined);
    const getSession = vi.fn().mockResolvedValue("mfa-session");
    const generateSecret = vi.fn().mockRejectedValue({
      error: {
        code: 400,
        message: "OPERATION_NOT_ALLOWED : TOTP based MFA not enabled.",
        status: "INVALID_ARGUMENT",
      },
    });
    const getMultiFactorUser = vi.fn().mockReturnValue({
      getSession,
    });

    await expect(
      startTotpEnrollment("secret123", {
        currentUser: {
          email: "user@example.com",
          emailVerified: true,
        },
        emailProviderCredential,
        reauthenticateWithCredential,
        getMultiFactorUser,
        generateSecret,
      }),
    ).rejects.toThrow(
      "Google Authenticator 2-step verification is not enabled in Firebase.",
    );
  });

  it("asks for the current password before starting setup", async () => {
    await expect(
      startTotpEnrollment("", {
        currentUser: {
          email: "user@example.com",
          emailVerified: true,
        },
      }),
    ).rejects.toThrow(
      "Enter your current password to continue setting up 2-step verification.",
    );
  });
});

describe("finalizeTotpEnrollment", () => {
  it("creates an enrollment assertion and enrolls it for the current user", async () => {
    const enroll = vi.fn().mockResolvedValue(undefined);
    const assertion = { kind: "totp-assertion" };
    const assertionForEnrollment = vi.fn().mockReturnValue(assertion);
    const getMultiFactorUser = vi.fn().mockReturnValue({
      enroll,
    });

    await finalizeTotpEnrollment(
      {
        secret: { secretKey: "SECRET123" },
        verificationCode: "123456",
        displayName: "Google Authenticator",
      },
      {
        currentUser: {
          email: "user@example.com",
          emailVerified: true,
        },
        assertionForEnrollment,
        getMultiFactorUser,
      },
    );

    expect(getMultiFactorUser).toHaveBeenCalled();
    expect(assertionForEnrollment).toHaveBeenCalledWith(
      { secretKey: "SECRET123" },
      "123456",
    );
    expect(enroll).toHaveBeenCalledWith(assertion, "Google Authenticator");
  });
});

describe("completeTotpSignIn", () => {
  it("resolves sign-in with the selected TOTP factor", async () => {
    const assertion = { kind: "totp-sign-in" };
    const assertionForSignIn = vi.fn().mockReturnValue(assertion);
    const credential = { user: { uid: "user-4" } } as UserCredential;
    const resolveSignIn = vi.fn().mockResolvedValue(credential);
    const syncUser = vi.fn().mockResolvedValue(undefined);
    const challenge = {
      resolver: {
        resolveSignIn,
      },
      hint: {
        uid: "enrollment-1",
        factorId: "totp",
        displayName: "Google Authenticator",
      },
      factorId: "totp",
      displayName: "Google Authenticator",
    };

    const result = await completeTotpSignIn(
      challenge,
      "123456",
      {
        assertionForSignIn,
        syncUserProfile: syncUser,
      },
    );

    expect(assertionForSignIn).toHaveBeenCalledWith("enrollment-1", "123456");
    expect(resolveSignIn).toHaveBeenCalledWith(assertion);
    expect(syncUser).toHaveBeenCalledWith(credential.user);
    expect(result).toBe(credential);
  });

  it("explains when the authenticator code is invalid", async () => {
    const assertionForSignIn = vi.fn().mockImplementation(() => {
      throw { code: "auth/invalid-verification-code" };
    });
    const syncUser = vi.fn().mockResolvedValue(undefined);
    const challenge = {
      resolver: {
        resolveSignIn: vi.fn(),
      },
      hint: {
        uid: "enrollment-1",
        factorId: "totp",
        displayName: "Google Authenticator",
      },
      factorId: "totp",
      displayName: "Google Authenticator",
    };

    await expect(
      completeTotpSignIn(challenge, "000000", {
        assertionForSignIn,
        syncUserProfile: syncUser,
      }),
    ).rejects.toThrow(
      "The Google Authenticator code is invalid. Enter the latest 6-digit code and try again.",
    );
  });
});
