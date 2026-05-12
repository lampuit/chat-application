import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AuthContext } from "@/components/auth/auth-provider";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";

const {
  finalizeTotpEnrollment,
  renderQrCodeToCanvas,
  startTotpEnrollment,
} = vi.hoisted(() => ({
  startTotpEnrollment: vi.fn(),
  finalizeTotpEnrollment: vi.fn().mockResolvedValue(undefined),
  renderQrCodeToCanvas: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/qr-code", () => ({
  renderQrCodeToCanvas,
}));

vi.mock("@/lib/auth/auth-service", () => ({
  startTotpEnrollment,
  finalizeTotpEnrollment,
}));

function renderSettings(emailVerified: boolean) {
  return render(
    <AuthContext.Provider
      value={{
        status: "authenticated",
        user: {
          uid: "user-1",
          email: "user@example.com",
          emailVerified,
          displayName: "User One",
          photoURL: null,
        },
      }}
    >
      <TwoFactorSettings />
    </AuthContext.Provider>,
  );
}

describe("TwoFactorSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks enrollment when the user's email is not verified", () => {
    renderSettings(false);

    expect(
      screen.getByText("Verify your email before enabling 2-step verification."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Set up Google Authenticator" }),
    ).not.toBeInTheDocument();
  });

  it("shows the QR setup and submits the OTP to finalize enrollment", async () => {
    const user = userEvent.setup();
    const setup = {
      secret: { secretKey: "SECRET123" },
      secretKey: "SECRET123",
      qrCodeUrl: "otpauth://totp/chat-app",
      codeLength: 6,
      codeIntervalSeconds: 30,
    };

    startTotpEnrollment.mockResolvedValue(setup);

    renderSettings(true);

    await user.click(screen.getByRole("button", { name: "Set up Google Authenticator" }));

    expect(await screen.findByText("SECRET123")).toBeInTheDocument();
    expect(screen.getByLabelText("Authenticator code")).toBeInTheDocument();

    await waitFor(() => {
      expect(renderQrCodeToCanvas).toHaveBeenCalled();
    });

    await user.type(screen.getByLabelText("Authenticator code"), "123456");
    await user.click(screen.getByRole("button", { name: "Enable 2-step verification" }));

    await waitFor(() => {
      expect(finalizeTotpEnrollment).toHaveBeenCalledWith(
        {
          secret: setup.secret,
          verificationCode: "123456",
          displayName: "Google Authenticator",
        },
      );
    });

    expect(
      await screen.findByText("2-step verification is now enabled."),
    ).toBeInTheDocument();
  });
});
