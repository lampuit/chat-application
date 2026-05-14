import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ChatShell } from "@/components/chat/chat-shell";

describe("ChatShell", () => {
  it("renders empty states and disables sending when no conversation is selected", () => {
    const onOpenCreateGroup = vi.fn();

    render(
      <ChatShell
        currentUserId="user-1"
        users={[]}
        isUsersLoading={false}
        conversations={[]}
        isConversationsLoading={false}
        messages={[]}
        isMessagesLoading={false}
        selectedConversationId={null}
        draftMessage=""
        errorMessage={null}
        isUploading={false}
        onDraftMessageChange={() => undefined}
        onSelectConversation={() => undefined}
        onStartConversation={() => undefined}
        onSendMessage={() => undefined}
        onOpenCreateGroup={onOpenCreateGroup}
      />,
    );

    expect(screen.getByText("No registered users yet.")).toBeInTheDocument();
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
    const directorySection = screen.getByText("Directory").closest("section");
    expect(directorySection).not.toBeNull();
    expect(
      within(directorySection as HTMLElement).getByRole("button", { name: "New group" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select a conversation from the sidebar to start messaging, or create a new one.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("opens group creation when the header action is clicked", async () => {
    const user = userEvent.setup();
    const onOpenCreateGroup = vi.fn();

    render(
      <ChatShell
        currentUserId="user-1"
        users={[]}
        isUsersLoading={false}
        conversations={[]}
        isConversationsLoading={false}
        messages={[]}
        isMessagesLoading={false}
        selectedConversationId={null}
        draftMessage=""
        errorMessage={null}
        isUploading={false}
        onDraftMessageChange={() => undefined}
        onSelectConversation={() => undefined}
        onStartConversation={() => undefined}
        onSendMessage={() => undefined}
        onOpenCreateGroup={onOpenCreateGroup}
      />,
    );

    await user.click(screen.getByRole("button", { name: "New group" }));

    expect(onOpenCreateGroup).toHaveBeenCalledTimes(1);
  });

  it("shows group member context in the conversation list and chat header", () => {
    render(
      <ChatShell
        currentUserId="user-1"
        users={[]}
        isUsersLoading={false}
        conversations={[
          {
            id: "group-1",
            title: "Product Squad",
            memberSummary: "3 members: Jane Doe, John Smith, +1",
            lastMessageText: "No messages yet",
          },
        ]}
        isConversationsLoading={false}
        messages={[]}
        isMessagesLoading={false}
        selectedConversationId="group-1"
        selectedConversationDetails={{
          id: "group-1",
          title: "Product Squad",
          subtitle: "Owner User, Jane Doe, John Smith",
        }}
        draftMessage=""
        errorMessage={null}
        isUploading={false}
        onDraftMessageChange={() => undefined}
        onSelectConversation={() => undefined}
        onStartConversation={() => undefined}
        onSendMessage={() => undefined}
        onOpenCreateGroup={() => undefined}
      />,
    );

    expect(screen.getByText("3 members: Jane Doe, John Smith, +1")).toBeInTheDocument();
    expect(screen.getByText("Owner User, Jane Doe, John Smith")).toBeInTheDocument();
  });

  it("renders skeleton placeholders while chat data is loading", () => {
    render(
      <ChatShell
        currentUserId="user-1"
        users={[]}
        isUsersLoading={true}
        conversations={[]}
        isConversationsLoading={true}
        messages={[]}
        isMessagesLoading={true}
        selectedConversationId="conversation-1"
        draftMessage=""
        errorMessage={null}
        isUploading={false}
        onDraftMessageChange={() => undefined}
        onSelectConversation={() => undefined}
        onStartConversation={() => undefined}
        onSendMessage={() => undefined}
        onOpenCreateGroup={() => undefined}
      />,
    );

    expect(screen.getByTestId("user-list-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("conversation-list-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("message-thread-skeleton")).toBeInTheDocument();
    expect(screen.queryByText("No registered users yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("No conversations yet.")).not.toBeInTheDocument();
    expect(screen.queryByText("It's quiet here")).not.toBeInTheDocument();
  });
});
