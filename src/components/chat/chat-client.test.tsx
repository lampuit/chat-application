import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AuthContext } from "@/components/auth/auth-provider";
import { ChatClient } from "@/components/chat/chat-client";

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
    handleSendMessage: vi.fn(),
  })),
}));

vi.mock("@/lib/auth/auth-service", () => ({
  logout: vi.fn(),
}));

describe("ChatClient", () => {
  it("renders the active session card and a 2-step verification card below it", () => {
    const { container } = render(
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

    expect(screen.getByText("Active Session")).toBeInTheDocument();
    expect(screen.getByText("2-step verification")).toBeInTheDocument();
    expect(screen.getByText("Verify your email before enabling 2-step verification.")).toBeInTheDocument();

    const wrappers = container.querySelectorAll("div.flex-1.min-h-0");
    expect(wrappers.length).toBeGreaterThan(0);
  });
});
