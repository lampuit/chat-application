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

  it("renders a download link for non-image attachments", () => {
    render(
      <MessageThread
        hasSelection
        messages={[
          {
            id: "message-3",
            senderLabel: "Alice",
            text: "Please download",
            createdAtLabel: "10:02",
            isOwnMessage: false,
            fileUrl: "https://example.com/spec.pdf",
            fileName: "spec.pdf",
            fileType: "application/pdf",
          },
        ] as any}
      />,
    );

    expect(screen.getByRole("link", { name: "spec.pdf" })).toHaveAttribute(
      "href",
      "https://example.com/spec.pdf",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
