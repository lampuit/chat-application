import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatActions } from "./use-chat-actions";

const {
  createDirectConversationWithFirstMessage,
  createGroupConversation,
  sendMessageToConversation,
  getFirebaseServices,
  setDoc,
  doc,
  serverTimestamp,
} = vi.hoisted(() => ({
  createDirectConversationWithFirstMessage: vi.fn(),
  createGroupConversation: vi.fn(),
  sendMessageToConversation: vi.fn(),
  getFirebaseServices: vi.fn(),
  setDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => "server-timestamp"),
}));

vi.mock("@/lib/chat/conversations", () => ({
  createDirectConversationWithFirstMessage,
  createGroupConversation,
}));

vi.mock("@/lib/chat/messages", () => ({
  sendMessageToConversation,
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseServices,
}));

vi.mock("firebase/firestore", () => ({
  setDoc,
  doc,
  serverTimestamp,
}));

describe("useChatActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFirebaseServices.mockReturnValue({
      db: { mocked: true },
    });
    doc.mockReturnValue("conversation-ref");
    setDoc.mockResolvedValue(undefined);
    createGroupConversation.mockResolvedValue(undefined);
    createDirectConversationWithFirstMessage.mockResolvedValue(undefined);
    sendMessageToConversation.mockResolvedValue(undefined);
  });

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

  it("rolls back a pending direct conversation and shows a readable error when creation fails", async () => {
    const setSelectedConversationId = vi.fn();
    const setConversations = vi.fn();
    setDoc.mockRejectedValue({
      code: "permission-denied",
    });

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
      await result.current.handleStartConversation("user-2");
    });

    expect(setConversations).toHaveBeenCalledTimes(2);
    const optimisticUpdater = setConversations.mock.calls[0][0] as (value: unknown[]) => Array<{ id: string }>;
    const optimisticState = optimisticUpdater([]);
    const pendingConversationId = optimisticState[0]?.id;
    const rollbackUpdater = setConversations.mock.calls[1][0] as (value: Array<{ id: string }>) => unknown[];
    expect(
      rollbackUpdater([
        { id: pendingConversationId },
        { id: "keep-me" },
      ]),
    ).toEqual([{ id: "keep-me" }]);
    expect(result.current.uploadError).toBe("You do not have permission to update this conversation.");
  });

  it("surfaces the underlying message send error instead of a generic upload failure", async () => {
    sendMessageToConversation.mockRejectedValue(new Error("Storage bucket is unavailable right now."));

    const { result } = renderHook(() =>
      useChatActions({
        currentUserId: "user-1",
        conversations: [
          {
            id: "conversation-1",
            type: "direct",
            memberIds: ["user-1", "user-2"],
            lastMessageText: "",
          },
        ],
        setConversations: vi.fn(),
        selectedConversationId: "conversation-1",
        setSelectedConversationId: vi.fn(),
        messages: [{ id: "message-existing", senderId: "user-2", text: "Hello" }],
      }),
    );

    act(() => {
      result.current.setDraftMessage("Reply");
    });

    await act(async () => {
      result.current.handleSendMessage();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.uploadError).toBe("Storage bucket is unavailable right now.");
  });
});
