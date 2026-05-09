import React from "react";
import { render, screen } from "@testing-library/react";
import { MessageThread } from "@/components/chat/message-thread";

describe("MessageThread", () => {
  it("renders own messages on the right and other messages on the left", () => {
    render(
      <MessageThread
        hasSelection
        messages={[
          {
            id: "message-1",
            senderLabel: "You",
            text: "My message",
            createdAtLabel: "10:00",
            isOwnMessage: true,
          },
          {
            id: "message-2",
            senderLabel: "Alice",
            text: "Other message",
            createdAtLabel: "10:01",
            isOwnMessage: false,
          },
        ]}
      />,
    );

    const ownMessage = screen.getByText("My message").closest("li");
    const otherMessage = screen.getByText("Other message").closest("li");

    expect(ownMessage).toHaveClass("justify-end");
    expect(otherMessage).toHaveClass("justify-start");
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });
});
