import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/components/auth/public-only-route", () => ({
  PublicOnlyRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/auth/login-form", () => ({
  LoginForm: () => <div>Login form</div>,
}));

vi.mock("@/components/auth/register-form", () => ({
  RegisterForm: () => <div>Register form</div>,
}));

describe("auth pages", () => {
  it("shows a register link on the login page", async () => {
    const LoginPage = (await import("@/app/login/page")).default;

    render(<LoginPage />);

    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("shows a login link on the register page", async () => {
    const RegisterPage = (await import("@/app/register/page")).default;

    render(<RegisterPage />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});