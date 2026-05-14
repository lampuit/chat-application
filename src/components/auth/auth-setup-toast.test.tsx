import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AuthContext } from "@/components/auth/auth-provider";
import { AuthSetupToast } from "@/components/auth/auth-setup-toast";

const {
  finalizeTotpEnrollment,
  reloadCurrentUser,
  renderQrCodeToCanvas,
  sendCurrentUserVerificationEmail,
  startTotpEnrollment,
} = vi.hoisted(() => ({
  sendCurrentUserVerificationEmail: vi.fn().mockResolvedValue(undefined),
  reloadCurrentUser: vi.fn().mockResolvedValue({
    emailVerified: true,
  }),
  startTotpEnrollment: vi.fn(),
  finalizeTotpEnrollment: vi.fn().mockResolvedValue(undefined),
  renderQrCodeToCanvas: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  sendCurrentUserVerificationEmail,
  reloadCurrentUser,
  startTotpEnrollment,
  finalizeTotpEnrollment,
}));

vi.mock("@/lib/auth/qr-code", () => ({
  renderQrCodeToCanvas,
}));

function renderToast({
  emailVerified,
  hasTotpEnrollment = false,
  displayName = null,
  refreshUser = vi.fn().mockResolvedValue(undefined),
}: {
  emailVerified: boolean;
  hasTotpEnrollment?: boolean;
  displayName?: string | null;
  refreshUser?: () => Promise<void>;
}) {
  return render(
    <AuthContext.Provider
      value={{
        status: "authenticated",
        refreshUser,
        user: {
          uid: "user-1",
          email: "user@example.com",
          emailVerified,
          hasTotpEnrollment,
          displayName,
          photoURL: null,
        },
      }}
    >
      <AuthSetupToast />
    </AuthContext.Provider>,
  );
}

describe("AuthSetupToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the email verification toast for unverified users", () => {
    renderToast({ emailVerified: false });

    expect(screen.getByText("Verify your email")).toBeInTheDocument();
    expect(
      screen.getByText(/before enabling Google Authenticator 2-step verification\./),
    ).toBeInTheDocument();
  });

  it("moves from email verification into the 2-step verification toast", async () => {
    const user = userEvent.setup();
    const refreshUser = vi.fn().mockResolvedValue(undefined);

    renderToast({
      emailVerified: false,
      refreshUser,
    });

    await user.click(screen.getByRole("button", { name: "Resend verification email" }));

    await waitFor(() => {
      expect(sendCurrentUserVerificationEmail).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("Verification email sent. Check your inbox."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "I've verified my email" }));

    await waitFor(() => {
      expect(reloadCurrentUser).toHaveBeenCalled();
      expect(refreshUser).toHaveBeenCalled();
    });

    expect(await screen.findByText("2-step verification")).toBeInTheDocument();
    expect(
      screen.getByText("Protect your account with a 6-digit code from Google Authenticator."),
    ).toBeInTheDocument();
  });

  it("shows the 2-step verification setup flow and completes enrollment", async () => {
    const user = userEvent.setup();
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    const setup = {
      secret: { secretKey: "SECRET123" },
      secretKey: "SECRET123",
      qrCodeUrl: "otpauth://totp/chat-app",
      codeLength: 6,
      codeIntervalSeconds: 30,
    };

    startTotpEnrollment.mockResolvedValue(setup);

    renderToast({
      emailVerified: true,
      refreshUser,
    });

    expect(screen.getByText("2-step verification")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Current password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Set up Google Authenticator" }));

    expect(await screen.findByText("SECRET123")).toBeInTheDocument();

    await waitFor(() => {
      expect(startTotpEnrollment).toHaveBeenCalledWith("secret123");
      expect(renderQrCodeToCanvas).toHaveBeenCalled();
    });

    await user.type(screen.getByLabelText("Authenticator code"), "123456");
    await user.click(screen.getByRole("button", { name: "Enable 2-step verification" }));

    await waitFor(() => {
      expect(finalizeTotpEnrollment).toHaveBeenCalledWith({
        secret: setup.secret,
        verificationCode: "123456",
        displayName: "Google Authenticator",
      });
      expect(refreshUser).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("2-step verification is now enabled."),
    ).toBeInTheDocument();
  });

  it("stays hidden once the profile is ready", () => {
    renderToast({ emailVerified: true, displayName: "User One" });

    expect(screen.queryByText("Verify your email")).not.toBeInTheDocument();
    expect(screen.queryByText("2-step verification")).not.toBeInTheDocument();
  });
});
