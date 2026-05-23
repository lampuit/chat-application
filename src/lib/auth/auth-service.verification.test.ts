import { describe, expect, it, vi } from "vitest";
import {
  applyEmailVerificationCode,
  reloadCurrentUser,
  sendCurrentUserVerificationEmail,
} from "@/lib/auth/auth-service";

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
