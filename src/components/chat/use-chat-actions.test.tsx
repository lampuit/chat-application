import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChatActions } from "./use-chat-actions";

const {
  createDirectConversationWithFirstMessage,
  createGroupConversation,
  sendMessageToConversation,
} = vi.hoisted(() => ({
  createDirectConversationWithFirstMessage: vi.fn(),
  createGroupConversation: vi.fn(),
  sendMessageToConversation: vi.fn(),
}));

vi.mock("@/lib/chat/conversations", () => ({
  createDirectConversationWithFirstMessage,
  createGroupConversation,
}));

vi.mock("@/lib/chat/messages", () => ({
  sendMessageToConversation,
}));

describe("useChatActions", () => {
  it("sends the first message in an existing group without rewriting it as a direct conversation", async () => {
    const setConversations = vi.fn();
    const setSelectedConversationId = vi.fn();

    const { result } = renderHook(() =>
      useChatActions({
        currentUserId: "user-1",
        conversations: [
          {
            id: "group-1",
            type: "group",
            name: "Product Squad",
            memberIds: ["user-1", "user-2", "user-3"],
            lastMessageText: "",
          },
        ],
        setConversations,
        selectedConversationId: "group-1",
        setSelectedConversationId,
        messages: [],
      }),
    );

    act(() => {
      result.current.setDraftMessage("Hello group");
    });

    await act(async () => {
      result.current.handleSendMessage();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createDirectConversationWithFirstMessage).not.toHaveBeenCalled();
    expect(sendMessageToConversation).toHaveBeenCalledWith({
      conversationId: "group-1",
      senderId: "user-1",
      text: "Hello group",
    });
  });

  it("adds a pending group to local state before the snapshot returns", async () => {
    const setSelectedConversationId = vi.fn();
    const setConversations = vi.fn();
    createGroupConversation.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useChatActions({
        currentUserId: "user-1",
        conversations: [],
        setConversations,
        selectedConversationId: null,
        setSelectedConversationId,
        messages: [],
      }),
    );

    await act(async () => {
      await result.current.handleCreateGroup({
        groupName: "Product Squad",
        memberIds: ["user-2", "user-3"],
      });
    });

    expect(setConversations).toHaveBeenCalledTimes(1);
    const updater = setConversations.mock.calls[0][0] as (value: unknown[]) => unknown[];
    expect(updater([])).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        type: "group",
        name: "Product Squad",
        memberIds: ["user-1", "user-2", "user-3"],
        lastMessageText: "",
      }),
    ]);
    expect(setSelectedConversationId).toHaveBeenCalledWith(expect.any(String));
  });
});
