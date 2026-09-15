import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AuthContext } from "@/components/auth/auth-provider";
import { EmailVerificationCard } from "@/components/auth/email-verification-card";

const { reloadCurrentUser, sendCurrentUserVerificationEmail } = vi.hoisted(() => ({
  sendCurrentUserVerificationEmail: vi.fn().mockResolvedValue(undefined),
  reloadCurrentUser: vi.fn().mockResolvedValue({
    emailVerified: true,
  }),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  sendCurrentUserVerificationEmail,
  reloadCurrentUser,
}));

function renderCard(emailVerified: boolean) {
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
      <EmailVerificationCard />
    </AuthContext.Provider>,
  );
}

describe("EmailVerificationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only appears for users whose email is not verified", () => {
    const { rerender } = renderCard(false);

    expect(screen.getByText("Verify your email")).toBeInTheDocument();

    rerender(
      <AuthContext.Provider
        value={{
          status: "authenticated",
          user: {
            uid: "user-1",
            email: "user@example.com",
            emailVerified: true,
            displayName: "User One",
            photoURL: null,
          },
        }}
      >
        <EmailVerificationCard />
      </AuthContext.Provider>,
    );

    expect(screen.queryByText("Verify your email")).not.toBeInTheDocument();
  });

  it("can resend the email and refresh the verification status", async () => {
    const user = userEvent.setup();

    renderCard(false);

    await user.click(screen.getByRole("button", { name: "Resend verification email" }));

    await waitFor(() => {
      expect(sendCurrentUserVerificationEmail).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: "I've verified my email" }));

    await waitFor(() => {
      expect(reloadCurrentUser).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("Email verified. 2-step verification is now available."),
    ).toBeInTheDocument();
  });
});
