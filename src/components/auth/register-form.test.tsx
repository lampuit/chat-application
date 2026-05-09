import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { RegisterForm } from "@/components/auth/register-form";

const { registerWithEmailAndPassword } = vi.hoisted(() => ({
  registerWithEmailAndPassword: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  registerWithEmailAndPassword,
}));

describe("RegisterForm", () => {
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
});
