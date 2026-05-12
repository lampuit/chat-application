import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

const { applyEmailVerificationCode, reloadCurrentUser } = vi.hoisted(() => ({
  applyEmailVerificationCode: vi.fn().mockResolvedValue(undefined),
  reloadCurrentUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  applyEmailVerificationCode,
  reloadCurrentUser,
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies the verification code and shows success", async () => {
    const { VerifyEmailRoute } = await import("@/components/auth/verify-email-route");

    render(<VerifyEmailRoute mode="verifyEmail" oobCode="test-code" />);

    await waitFor(() => {
      expect(applyEmailVerificationCode).toHaveBeenCalledWith("test-code");
    });
    expect(reloadCurrentUser).toHaveBeenCalled();
    expect(
      await screen.findByText("Your email has been verified successfully."),
    ).toBeInTheDocument();
  });

  it("shows a recoverable error when the link is missing or invalid", async () => {
    const { VerifyEmailRoute } = await import("@/components/auth/verify-email-route");

    render(<VerifyEmailRoute mode="verifyEmail" />);

    expect(
      await screen.findByText("This verification link is invalid or incomplete."),
    ).toBeInTheDocument();
  });
});
