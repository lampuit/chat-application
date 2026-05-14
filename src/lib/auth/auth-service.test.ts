import { describe, expect, it, vi } from "vitest";
import type { UserCredential } from "firebase/auth";
import {
  applyEmailVerificationCode,
  buildUserProfile,
  completeTotpSignIn,
  finalizeTotpEnrollment,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  reloadCurrentUser,
  sendCurrentUserVerificationEmail,
  startTotpEnrollment,
  syncUserProfile,
} from "@/lib/auth/auth-service";

describe("buildUserProfile", () => {
  it("builds a mirrored Firestore user profile with server-managed timestamps", () => {
    const timestampToken = { ".sv": "serverTimestamp" };

    expect(
      buildUserProfile(
        {
          uid: "user-1",
          email: "user@example.com",
          displayName: null,
          photoURL: null,
        },
        timestampToken,
      ),
    ).toEqual({
      uid: "user-1",
      email: "user@example.com",
      displayName: "user",
      photoURL: null,
      createdAt: timestampToken,
      updatedAt: timestampToken,
      lastSeenAt: timestampToken,
    });
  });
});

describe("syncUserProfile", () => {
  it("writes the profile document with merge semantics", async () => {
    const setDoc = vi.fn().mockResolvedValue(undefined);
    const doc = vi.fn().mockReturnValue("users/user-1");
    const timestampToken = { ".sv": "serverTimestamp" };

    await syncUserProfile(
      {
        uid: "user-1",
        email: "user@example.com",
        displayName: "User One",
        photoURL: null,
      },
      {
        db: "db-instance",
        doc,
        setDoc,
        serverTimestamp: () => timestampToken,
      },
    );

    expect(doc).toHaveBeenCalledWith("db-instance", "users", "user-1");
    expect(setDoc).toHaveBeenCalledWith(
      "users/user-1",
      {
        uid: "user-1",
        email: "user@example.com",
        displayName: "User One",
        photoURL: null,
        createdAt: timestampToken,
        updatedAt: timestampToken,
        lastSeenAt: timestampToken,
      },
      { merge: true },
    );
  });

  it("uses the Firebase auth email local part when displayName is missing", async () => {
    const setDoc = vi.fn().mockResolvedValue(undefined);
    const doc = vi.fn().mockReturnValue("users/user-2");
    const timestampToken = { ".sv": "serverTimestamp" };

    const credential = {
      user: {
        uid: "user-2",
        email: "hello.world@example.com",
        displayName: null,
        photoURL: null,
      },
    } as UserCredential;

    await syncUserProfile(credential.user, {
      db: "db-instance",
      doc,
      setDoc,
      serverTimestamp: () => timestampToken,
    });

    expect(setDoc).toHaveBeenCalledWith(
      "users/user-2",
      expect.objectContaining({
        displayName: "hello.world",
      }),
      { merge: true },
    );
  });
});

describe("registerWithEmailAndPassword", () => {
  it("stores the caller-provided display name instead of deriving it from email", async () => {
    const credential = {
      user: {
        uid: "user-3",
        email: "person@example.com",
        displayName: null,
        photoURL: null,
      },
    } as UserCredential;
    const createUser = vi.fn().mockResolvedValue(credential);
    const updateProfile = vi.fn().mockResolvedValue(undefined);
    const syncUser = vi.fn().mockResolvedValue(undefined);

    await registerWithEmailAndPassword("person@example.com", "secret123", "Captain", {
      auth: "auth-instance",
      createUserWithEmailAndPassword: createUser,
      updateProfile,
      syncUserProfile: syncUser,
    });

    expect(createUser).toHaveBeenCalledWith(
      "auth-instance",
      "person@example.com",
      "secret123",
    );
    expect(updateProfile).toHaveBeenCalledWith(credential.user, {
      displayName: "Captain",
    });
    expect(syncUser).toHaveBeenCalledWith({
      ...credential.user,
      displayName: "Captain",
    });
  });
});

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

describe("loginWithEmailAndPassword", () => {
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

describe("sendCurrentUserVerificationEmail", () => {
  it("sends a verification email with a continue URL back to the app", async () => {
    const sendEmailVerification = vi.fn().mockResolvedValue(undefined);

    await sendCurrentUserVerificationEmail({
      currentUser: { email: "user@example.com" },
      sendEmailVerification,
      appBaseUrl: "https://chat.example.com",
    });

    expect(sendEmailVerification).toHaveBeenCalledWith(
      { email: "user@example.com" },
      expect.objectContaining({
        url: "https://chat.example.com/verify-email",
        handleCodeInApp: false,
      }),
    );
  });

  it("prefers NEXT_PUBLIC_APP_URL over the current browser origin", async () => {
    const sendEmailVerification = vi.fn().mockResolvedValue(undefined);
    const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

    vi.stubGlobal("window", {
      location: {
        origin: "https://preview.example.com",
      },
    });

    process.env.NEXT_PUBLIC_APP_URL = "https://chat.example.com";

    try {
      await sendCurrentUserVerificationEmail({
        currentUser: { email: "user@example.com" },
        sendEmailVerification,
      });

      expect(sendEmailVerification).toHaveBeenCalledWith(
        { email: "user@example.com" },
        expect.objectContaining({
          url: "https://chat.example.com/verify-email",
          handleCodeInApp: false,
        }),
      );
    } finally {
      if (originalAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL;
      } else {
        process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
      }

      vi.unstubAllGlobals();
    }
  });

  it("surfaces a clear error when Firebase blocks the continue URL domain", async () => {
    const sendEmailVerification = vi.fn().mockRejectedValue({
      code: "auth/unauthorized-continue-uri",
    });

    await expect(
      sendCurrentUserVerificationEmail({
        currentUser: { email: "user@example.com", emailVerified: false },
        sendEmailVerification,
        appBaseUrl: "http://localhost:3000",
      }),
    ).rejects.toThrow(
      "Firebase blocked the verification email because this app URL is not authorized.",
    );
  });

  it("explains when Firebase auth email operations are disabled", async () => {
    const sendEmailVerification = vi.fn().mockRejectedValue({
      code: "auth/operation-not-allowed",
    });

    await expect(
      sendCurrentUserVerificationEmail({
        currentUser: { email: "user@example.com", emailVerified: false },
        sendEmailVerification,
        appBaseUrl: "http://localhost:3000",
      }),
    ).rejects.toThrow(
      "Firebase Authentication is not fully enabled for this project.",
    );
  });
});

describe("applyEmailVerificationCode", () => {
  it("applies the Firebase action code", async () => {
    const applyActionCode = vi.fn().mockResolvedValue(undefined);

    await applyEmailVerificationCode("test-oob-code", {
      auth: "auth-instance",
      applyActionCode,
    });

    expect(applyActionCode).toHaveBeenCalledWith("auth-instance", "test-oob-code");
  });
});

describe("reloadCurrentUser", () => {
  it("reloads and returns the current Firebase user", async () => {
    const currentUser = {
      emailVerified: true,
      reload: vi.fn().mockResolvedValue(undefined),
    };

    const result = await reloadCurrentUser({
      currentUser,
    });

    expect(currentUser.reload).toHaveBeenCalled();
    expect(result).toBe(currentUser);
  });
});
