import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AuthContext } from "@/components/auth/auth-provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { PublicOnlyRoute } from "@/components/auth/public-only-route";
import type { AuthStatus, AuthUserSummary } from "@/types/auth";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

function renderWithAuth(
  ui: React.ReactNode,
  {
    status,
    user = null,
  }: {
    status: AuthStatus;
    user?: AuthUserSummary | null;
  },
) {
  return render(
    <AuthContext.Provider
      value={{
        status,
        user,
      }}
    >
      {ui}
    </AuthContext.Provider>,
  );
}

describe("route guards", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("redirects unauthenticated users away from private routes", async () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Private chat shell</div>
      </ProtectedRoute>,
      {
        status: "unauthenticated",
      },
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });

    expect(screen.queryByText("Private chat shell")).not.toBeInTheDocument();
  });

  it("redirects authenticated users away from public auth routes", async () => {
    renderWithAuth(
      <PublicOnlyRoute>
        <div>Login form</div>
      </PublicOnlyRoute>,
      {
        status: "authenticated",
        user: {
          uid: "user-1",
          email: "user@example.com",
          emailVerified: true,
          displayName: "User One",
          photoURL: null,
        },
      },
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/chat");
    });

    expect(screen.queryByText("Login form")).not.toBeInTheDocument();
  });
});
