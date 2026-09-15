import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AuthProvider, useAuth } from "@/components/auth/auth-provider";

const { getFirebaseServices, multiFactor, onAuthStateChanged } = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  getFirebaseServices: vi.fn(),
  multiFactor: vi.fn((user: { multiFactor?: { enrolledFactors?: unknown[] } }) => ({
    enrolledFactors: user.multiFactor?.enrolledFactors ?? [],
  })),
}));

vi.mock("firebase/auth", () => ({
  multiFactor,
  onAuthStateChanged,
  TotpMultiFactorGenerator: {
    FACTOR_ID: "totp",
  },
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseServices,
}));

function AuthProbe() {
  const { status, user } = useAuth();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="email-verified">{String(user?.emailVerified ?? false)}</span>
      <span data-testid="has-totp">{String(user?.hasTotpEnrollment ?? false)}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the enrolled TOTP state from Firebase auth users", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback: (user: unknown) => void) => {
      callback({
        uid: "user-1",
        email: "user@example.com",
        emailVerified: true,
        displayName: "User One",
        photoURL: null,
        multiFactor: {
          enrolledFactors: [{ uid: "factor-1", factorId: "totp" }],
        },
      });

      return () => undefined;
    });

    getFirebaseServices.mockReturnValue({
      auth: {},
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("email-verified")).toHaveTextContent("true");
      expect(screen.getByTestId("has-totp")).toHaveTextContent("true");
    });
  });

  it("treats users without multi-factor metadata as not enrolled", async () => {
    onAuthStateChanged.mockImplementation((_auth, callback: (user: unknown) => void) => {
      callback({
        uid: "user-2",
        email: "plain@example.com",
        emailVerified: true,
        displayName: "Plain User",
        photoURL: null,
      });

      return () => undefined;
    });

    getFirebaseServices.mockReturnValue({
      auth: {},
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
      expect(screen.getByTestId("email-verified")).toHaveTextContent("true");
      expect(screen.getByTestId("has-totp")).toHaveTextContent("false");
    });
  });
});
