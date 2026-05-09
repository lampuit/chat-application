import React from "react";
import { render, screen } from "@testing-library/react";
import { ChatShell } from "@/components/chat/chat-shell";

describe("ChatShell", () => {
  it("renders empty states and disables sending when no conversation is selected", () => {
    render(
      <ChatShell
        currentUserId="user-1"
        users={[]}
        conversations={[]}
        messages={[]}
        selectedConversationId={null}
        draftMessage=""
        onDraftMessageChange={() => undefined}
        onSelectConversation={() => undefined}
        onStartConversation={() => undefined}
        onSendMessage={() => undefined}
      />,
    );

    expect(screen.getByText("No registered users yet.")).toBeInTheDocument();
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Choose a conversation to start messaging."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });
});
