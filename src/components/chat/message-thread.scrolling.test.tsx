import React from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageThread } from "@/components/chat/message-thread";

describe("MessageThread scrolling", () => {
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
});
