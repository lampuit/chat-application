import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AuthContext } from "@/components/auth/auth-provider";
import { AuthEntryRoute } from "@/components/auth/auth-entry-route";
import type { AuthStatus, AuthUserSummary } from "@/types/auth";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

function renderWithAuth(
  status: AuthStatus,
  user: AuthUserSummary | null = null,
) {
  return render(
    <AuthContext.Provider
      value={{
        status,
        user,
      }}
    >
      <AuthEntryRoute />
    </AuthContext.Provider>,
  );
}

describe("AuthEntryRoute", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("redirects unauthenticated users to login", async () => {
    renderWithAuth("unauthenticated");

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
  });

  it("redirects authenticated users to chat", async () => {
    renderWithAuth("authenticated", {
      uid: "user-1",
      email: "user@example.com",
      emailVerified: true,
      displayName: "User One",
      photoURL: null,
    });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/chat");
    });
  });

  it("waits while auth is loading", async () => {
    renderWithAuth("loading");

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(replace).not.toHaveBeenCalled();
  });
});
