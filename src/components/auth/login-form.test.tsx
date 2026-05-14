import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LoginForm } from "@/components/auth/login-form";

const { completeTotpSignIn, loginWithEmailAndPassword } = vi.hoisted(() => ({
  loginWithEmailAndPassword: vi.fn(),
  completeTotpSignIn: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  loginWithEmailAndPassword,
  completeTotpSignIn,
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("switches to the OTP step when Firebase requires multi-factor auth", async () => {
    const user = userEvent.setup();
    const challenge = {
      resolver: { resolveSignIn: vi.fn() },
      hint: {
        uid: "enrollment-1",
        factorId: "totp",
        displayName: "Google Authenticator",
      },
      factorId: "totp",
      displayName: "Google Authenticator",
    };

    loginWithEmailAndPassword.mockResolvedValue({
      status: "mfa-required",
      challenge,
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(loginWithEmailAndPassword).toHaveBeenCalledWith(
      "user@example.com",
      "secret123",
    );

    expect(await screen.findByLabelText("Authentication code")).toBeInTheDocument();
    expect(
      screen.getByText("Enter the 6-digit code from Google Authenticator."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify code" })).toBeInTheDocument();
  });

  it("submits the OTP with the stored challenge after the MFA step appears", async () => {
    const user = userEvent.setup();
    const challenge = {
      resolver: { resolveSignIn: vi.fn() },
      hint: {
        uid: "enrollment-1",
        factorId: "totp",
        displayName: "Google Authenticator",
      },
      factorId: "totp",
      displayName: "Google Authenticator",
    };

    loginWithEmailAndPassword.mockResolvedValue({
      status: "mfa-required",
      challenge,
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Login" }));
    await user.type(await screen.findByLabelText("Authentication code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    await waitFor(() => {
      expect(completeTotpSignIn).toHaveBeenCalledWith(challenge, "123456");
    });
  });
});
