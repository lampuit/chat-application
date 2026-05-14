import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { RegisterForm } from "@/components/auth/register-form";

const {
  registerWithEmailAndPassword,
  reloadCurrentUser,
  sendCurrentUserVerificationEmail,
} = vi.hoisted(() => ({
  registerWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: {
      email: "person@example.com",
    },
  }),
  sendCurrentUserVerificationEmail: vi.fn().mockResolvedValue(undefined),
  reloadCurrentUser: vi.fn().mockResolvedValue({
    emailVerified: true,
  }),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  registerWithEmailAndPassword,
  sendCurrentUserVerificationEmail,
  reloadCurrentUser,
}));

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collects a required display name and submits it with email and password", async () => {
    const user = userEvent.setup();

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Display name"), "Captain");
    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(registerWithEmailAndPassword).toHaveBeenCalledWith(
      "person@example.com",
      "secret123",
      "Captain",
    );
  });

  it("shows a check-email state after successful registration and can resend the email", async () => {
    const user = userEvent.setup();

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Display name"), "Captain");
    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    expect(sendCurrentUserVerificationEmail).toHaveBeenCalledWith({
      currentUser: expect.objectContaining({
        email: "person@example.com",
      }),
    });

    await user.click(screen.getByRole("button", { name: "Resend verification email" }));

    await waitFor(() => {
      expect(sendCurrentUserVerificationEmail).toHaveBeenCalledTimes(2);
    });
  });

  it("refreshes the verification status after the user confirms they have verified", async () => {
    const user = userEvent.setup();

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Display name"), "Captain");
    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Register" }));
    await user.click(screen.getByRole("button", { name: "I've verified my email" }));

    await waitFor(() => {
      expect(reloadCurrentUser).toHaveBeenCalled();
    });

    expect(
      await screen.findByText("Email verified. You can now enable 2-step verification."),
    ).toBeInTheDocument();
  });
});
