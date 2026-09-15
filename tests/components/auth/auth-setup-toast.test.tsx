import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AuthContext } from "@/components/auth/auth-provider";
import { AuthSetupToast } from "@/components/auth/auth-setup-toast";

const {
  reloadCurrentUser,
  sendCurrentUserVerificationEmail,
} = vi.hoisted(() => ({
  sendCurrentUserVerificationEmail: vi.fn().mockResolvedValue(undefined),
  reloadCurrentUser: vi.fn().mockResolvedValue({
    emailVerified: true,
  }),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  sendCurrentUserVerificationEmail,
  reloadCurrentUser,
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
    expect(screen.getByRole("button", { name: "Dismiss email verification reminder" })).toBeInTheDocument();
  });

  it("stays as a verify-email toast after refreshing verification status", async () => {
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

    const toast = await screen.findByRole("region", { name: "Email verification reminder" });
    expect(within(toast).getByText("Verify your email")).toBeInTheDocument();
    expect(
      screen.queryByText("2-step verification"),
    ).not.toBeInTheDocument();
  });

  it("can be dismissed by the user", async () => {
    const user = userEvent.setup();

    renderToast({ emailVerified: false, displayName: "User One" });

    await user.click(screen.getByRole("button", { name: "Dismiss email verification reminder" }));

    expect(screen.queryByText("Verify your email")).not.toBeInTheDocument();
  });

  it("stays hidden when the user is already verified", () => {
    renderToast({ emailVerified: true, displayName: "User One" });

    expect(screen.queryByText("Verify your email")).not.toBeInTheDocument();
    expect(screen.queryByText("2-step verification")).not.toBeInTheDocument();
  });
});
