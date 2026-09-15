import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageThread } from "@/components/chat/message-thread";

describe("MessageThread date separators", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, "scrollTop", "get").mockReturnValue(400);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
});
