import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { MessageThread } from "@/components/chat/message-thread";

describe("MessageThread", () => {
  const scrollIntoViewMock = vi.fn();

  beforeEach(() => {
    scrollIntoViewMock.mockReset();
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(scrollIntoViewMock);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockReturnValue(400);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders own messages on the right and other messages on the left", () => {
    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
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
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
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

    expect(screen.getByRole("link", { name: /spec\.pdf/i })).toHaveAttribute(
      "href",
      "https://example.com/spec.pdf",
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders a receipt label for the current user's messages", () => {
    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-4",
            senderLabel: "You",
            text: "Seen message",
            createdAtLabel: "10:03",
            isOwnMessage: true,
            receiptLabel: "Seen",
          },
        ] as any}
      />,
    );

    expect(screen.getByText("Seen")).toBeInTheDocument();
  });

  it("renders distinct sent and seen receipt badges", () => {
    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-5",
            senderLabel: "You",
            text: "Sent message",
            createdAtLabel: "10:04",
            isOwnMessage: true,
            receiptLabel: "Sent",
          },
          {
            id: "message-6",
            senderLabel: "You",
            text: "Seen message",
            createdAtLabel: "10:05",
            isOwnMessage: true,
            receiptLabel: "Seen",
          },
        ] as any}
      />,
    );

    expect(screen.getByTestId("receipt-sent")).toHaveTextContent("Sent");
    expect(screen.getByTestId("receipt-seen")).toHaveTextContent("Seen");
  });

  it("renders a delivered receipt badge", () => {
    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-7",
            senderLabel: "You",
            text: "Delivered message",
            createdAtLabel: "10:06",
            isOwnMessage: true,
            receiptLabel: "Delivered",
          },
        ] as any}
      />,
    );

    expect(screen.getByTestId("receipt-delivered")).toHaveTextContent("Delivered");
  });

  it("renders one date separator for consecutive messages on the same day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0));

    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "Alice",
            text: "Morning update",
            createdAtLabel: "09:00",
            createdAtDate: new Date(2026, 4, 22, 9, 0),
            isOwnMessage: false,
          },
          {
            id: "message-2",
            senderLabel: "You",
            text: "Reply",
            createdAtLabel: "09:05",
            createdAtDate: new Date(2026, 4, 22, 9, 5),
            isOwnMessage: true,
          },
        ]}
      />,
    );

    expect(screen.getAllByText("22/05/2026")).toHaveLength(1);
  });

  it("renders a new date separator before the first message of a new day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 1, 12, 0));

    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "Alice",
            text: "Day one",
            createdAtLabel: "23:50",
            createdAtDate: new Date(2026, 4, 21, 23, 50),
            isOwnMessage: false,
          },
          {
            id: "message-2",
            senderLabel: "You",
            text: "Day two",
            createdAtLabel: "08:00",
            createdAtDate: new Date(2026, 4, 22, 8, 0),
            isOwnMessage: true,
          },
        ]}
      />,
    );

    const separators = screen.getAllByTestId("message-date-separator");
    expect(separators).toHaveLength(2);
    expect(separators[0]).toHaveTextContent("21/05/2026");
    expect(separators[1]).toHaveTextContent("22/05/2026");
  });

  it("renders 'Hôm nay' and 'Hôm qua' separators using local dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 22, 12, 0));

    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "Alice",
            text: "Yesterday message",
            createdAtLabel: "18:00",
            createdAtDate: new Date(2026, 4, 21, 18, 0),
            isOwnMessage: false,
          },
          {
            id: "message-2",
            senderLabel: "You",
            text: "Today message",
            createdAtLabel: "09:15",
            createdAtDate: new Date(2026, 4, 22, 9, 15),
            isOwnMessage: true,
          },
        ]}
      />,
    );

    expect(screen.getByText("Hôm qua")).toBeInTheDocument();
    expect(screen.getByText("Hôm nay")).toBeInTheDocument();
  });

  it("jumps to the latest message immediately when opening a conversation", () => {
    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "Alice",
            text: "Earlier",
            createdAtLabel: "10:00",
            isOwnMessage: false,
          },
          {
            id: "message-2",
            senderLabel: "You",
            text: "Latest",
            createdAtLabel: "10:01",
            isOwnMessage: true,
          },
        ]}
      />,
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "auto", block: "end" });
  });

  it("smoothly scrolls when a new latest message arrives", () => {
    const { rerender } = render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "Alice",
            text: "Earlier",
            createdAtLabel: "10:00",
            isOwnMessage: false,
          },
        ]}
      />,
    );

    scrollIntoViewMock.mockClear();

    rerender(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "Alice",
            text: "Earlier",
            createdAtLabel: "10:00",
            isOwnMessage: false,
          },
          {
            id: "message-2",
            senderLabel: "You",
            text: "Latest",
            createdAtLabel: "10:01",
            isOwnMessage: true,
          },
        ]}
      />,
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "end" });
  });

  it("still scrolls to a newly sent message without reloading even if the new height pushes it past the threshold", () => {
    let scrollHeightValue = 1000;
    let scrollTopValue = 400;

    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(() => scrollHeightValue);
    vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockImplementation(() => scrollTopValue);

    const { rerender } = render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "Alice",
            text: "Earlier",
            createdAtLabel: "10:00",
            isOwnMessage: false,
          },
        ]}
      />,
    );

    scrollIntoViewMock.mockClear();
    scrollHeightValue = 1120;

    rerender(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "Alice",
            text: "Earlier",
            createdAtLabel: "10:00",
            isOwnMessage: false,
          },
          {
            id: "message-2",
            senderLabel: "You",
            text: "My latest message",
            createdAtLabel: "10:01",
            isOwnMessage: true,
          },
        ]}
      />,
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "end" });
  });

  it("does not scroll again when only the message metadata changes", () => {
    const { rerender } = render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "You",
            text: "Latest",
            createdAtLabel: "10:01",
            isOwnMessage: true,
            receiptLabel: "Sent",
          },
        ]}
      />,
    );

    scrollIntoViewMock.mockClear();

    rerender(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "You",
            text: "Latest",
            createdAtLabel: "10:01",
            isOwnMessage: true,
            receiptLabel: "Seen",
          },
        ]}
      />,
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("keeps extra space below the latest message so the composer does not cover it", () => {
    render(
      <MessageThread
        conversationId="conversation-1"
        hasSelection
        isLoading={false}
        messages={[
          {
            id: "message-1",
            senderLabel: "You",
            text: "Latest",
            createdAtLabel: "10:01",
            isOwnMessage: true,
          },
        ]}
      />,
    );

    const scrollContainer = screen.getByText("Latest").closest("div.overflow-y-auto");
    expect(scrollContainer).toHaveClass("pb-8");
    expect(scrollContainer).toHaveClass("sm:pb-10");
  });
});
