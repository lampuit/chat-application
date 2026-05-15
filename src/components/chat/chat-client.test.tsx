import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/components/auth/auth-provider";
import { ChatClient } from "@/components/chat/chat-client";
import { registerFcmTokenFromUserAction } from "@/lib/firebase/messaging";

vi.mock("./use-chat-data", () => ({
  useChatData: vi.fn(() => ({
    users: [],
    conversations: [],
    setConversations: vi.fn(),
    messages: [],
    selectedConversationId: null,
    setSelectedConversationId: vi.fn(),
    conversationItems: [],
    messageItems: [],
  })),
}));

vi.mock("./use-chat-actions", () => ({
  useChatActions: vi.fn(() => ({
    draftMessage: "",
    setDraftMessage: vi.fn(),
    uploadError: null,
    isUploading: false,
    isPending: false,
    handleStartConversation: vi.fn(),
    handleCreateGroup: vi.fn(),
    handleSendMessage: vi.fn(),
  })),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  logout: vi.fn(),
}));

vi.mock("@/lib/firebase/messaging", () => ({
  registerFcmTokenFromUserAction: vi.fn(),
}));

function renderChatClient() {
  return render(
    <AuthContext.Provider
      value={{
        status: "authenticated",
        user: {
          uid: "user-1",
          email: "user@example.com",
          emailVerified: false,
          hasTotpEnrollment: false,
          displayName: "User One",
          photoURL: null,
        },
      }}
    >
      <ChatClient />
    </AuthContext.Provider>,
  );
}

describe("ChatClient", () => {
  beforeEach(() => {
    vi.mocked(registerFcmTokenFromUserAction).mockReset();
  });

  it("renders the active session card and a 2-step verification card below it", () => {
    const { container } = renderChatClient();

    expect(screen.getByText("Active Session")).toBeInTheDocument();
    expect(screen.getByText("2-step verification")).toBeInTheDocument();
    expect(screen.getByText("Verify your email before enabling 2-step verification.")).toBeInTheDocument();

    const wrappers = container.querySelectorAll("div.flex-1.min-h-0");
    expect(wrappers.length).toBeGreaterThan(0);
  });

  it("shows a small 2-step verification tab in the session card when already enabled", () => {
    render(
      <AuthContext.Provider
        value={{
          status: "authenticated",
          user: {
            uid: "user-1",
            email: "user@example.com",
            emailVerified: true,
            hasTotpEnrollment: true,
            displayName: "User One",
            photoURL: null,
          },
        }}
      >
        <ChatClient />
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Active Session")).toBeInTheDocument();
    expect(screen.getByText("2-step enabled")).toBeInTheDocument();
    expect(screen.queryByText("Protect your account with a 6-digit code from Google Authenticator.")).not.toBeInTheDocument();
    expect(screen.queryByText("2-step verification is now enabled.")).not.toBeInTheDocument();
  });

  it("does not auto-register notifications on render", () => {
    renderChatClient();

    expect(registerFcmTokenFromUserAction).not.toHaveBeenCalled();
  });

  it("registers notifications only after the user clicks enable notifications", async () => {
    const user = userEvent.setup();

    vi.mocked(registerFcmTokenFromUserAction).mockResolvedValue({
      status: "registered",
      token: "token-123",
    });

    renderChatClient();

    await user.click(screen.getByRole("button", { name: "Enable notifications" }));

    expect(registerFcmTokenFromUserAction).toHaveBeenCalledWith("user-1");
    expect(screen.getByText("Notifications enabled for this device.")).toBeInTheDocument();
  });
});
