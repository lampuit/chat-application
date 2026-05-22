import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatData } from "./use-chat-data";

const { getFirebaseServicesMock } = vi.hoisted(() => ({
  getFirebaseServicesMock: vi.fn(),
}));

const { markConversationMessagesSeenMock } = vi.hoisted(() => ({
  markConversationMessagesSeenMock: vi.fn(),
}));

type SnapshotDoc = {
  id: string;
  data: () => Record<string, unknown>;
  metadata?: {
    hasPendingWrites: boolean;
  };
};

type QueryTarget =
  | {
      kind: "collection";
      segments: string[];
    }
  | {
      kind: "query";
      source: QueryTarget;
      clauses: unknown[];
    };

const listeners: Array<{
  target: QueryTarget;
  callback: (snapshot: { docs: SnapshotDoc[] }) => void;
}> = [];

function createDoc(
  id: string,
  data: Record<string, unknown>,
  options?: { hasPendingWrites?: boolean },
): SnapshotDoc {
  return {
    id,
    data: () => data,
    metadata: {
      hasPendingWrites: options?.hasPendingWrites ?? false,
    },
  };
}

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, ...segments: string[]) => ({
    kind: "collection" as const,
    segments,
  }),
  where: (...args: unknown[]) => ({ type: "where", args }),
  orderBy: (...args: unknown[]) => ({ type: "orderBy", args }),
  query: (source: QueryTarget, ...clauses: unknown[]) => ({
    kind: "query" as const,
    source,
    clauses,
  }),
  onSnapshot: vi.fn((target: QueryTarget, callback: (snapshot: { docs: SnapshotDoc[] }) => void) => {
    listeners.push({ target, callback });
    return vi.fn();
  }),
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseServices: getFirebaseServicesMock,
}));

vi.mock("@/lib/chat/messages", () => ({
  markConversationMessagesSeen: markConversationMessagesSeenMock,
}));

function getConversationListener() {
  return listeners.find(
    (listener) =>
      listener.target.kind === "query" &&
      listener.target.source.kind === "collection" &&
      listener.target.source.segments.join("/") === "conversations",
  );
}

function getMessageListeners() {
  return listeners.filter(
    (listener) =>
      listener.target.kind === "query" &&
      listener.target.source.kind === "collection" &&
      listener.target.source.segments[0] === "conversations" &&
      listener.target.source.segments[2] === "messages",
  );
}

describe("useChatData", () => {
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    listeners.length = 0;
    getFirebaseServicesMock.mockReset();
    getFirebaseServicesMock.mockReturnValue({
      db: { mocked: true },
    });
    markConversationMessagesSeenMock.mockReset();
    markConversationMessagesSeenMock.mockResolvedValue(undefined);
    consoleErrorSpy.mockClear();
  });

  it("stops users and conversations loading when Firebase services are unavailable", async () => {
    getFirebaseServicesMock.mockReturnValue(null);

    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(result.current.isUsersLoading).toBe(false);
      expect(result.current.isConversationsLoading).toBe(false);
    });
  });

  it("does not recreate user and conversation subscriptions when the page is re-activated", async () => {
    renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(listeners).toHaveLength(2);
    });

    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(listeners).toHaveLength(2);
  });

  it("does not subscribe to messages for a pending conversation that is not in Firestore yet", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      result.current.setSelectedConversationId("pending-1");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(getMessageListeners()).toHaveLength(0);
  });

  it("does not subscribe to messages while the Firestore conversation snapshot still has pending writes", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      result.current.setConversations([
        {
          id: "pending-1",
          type: "direct",
          memberIds: ["user-1", "user-2"],
          lastMessageText: "",
          lastMessageAt: null,
          pending: true,
        },
      ]);
      result.current.setSelectedConversationId("pending-1");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(getMessageListeners()).toHaveLength(0);

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("pending-1", {
            memberIds: ["user-1", "user-2"],
            lastMessageText: "",
          }, { hasPendingWrites: true }),
        ],
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(getMessageListeners()).toHaveLength(0);

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("pending-1", {
            memberIds: ["user-1", "user-2"],
            lastMessageText: "",
          }, { hasPendingWrites: false }),
        ],
      });
    });

    await waitFor(() => {
      expect(getMessageListeners()).toHaveLength(1);
    });
  });

  it("subscribes to messages after the selected conversation appears in Firestore", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      result.current.setSelectedConversationId("conversation-1");
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("conversation-1", {
            memberIds: ["user-1", "user-2"],
            lastMessageText: "",
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(getMessageListeners()).toHaveLength(1);
    });
  });

  it("keeps the existing message subscription when a confirmed conversation gets pending writes from a new message", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      result.current.setSelectedConversationId("conversation-1");
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("conversation-1", {
            memberIds: ["user-1", "user-2"],
            lastMessageText: "Hello",
          }, { hasPendingWrites: false }),
        ],
      });
    });

    await waitFor(() => {
      expect(getMessageListeners()).toHaveLength(1);
    });

    act(() => {
      getMessageListeners()[0]?.callback({
        docs: [
          createDoc("message-1", {
            senderId: "user-1",
            text: "Hello",
            type: "text",
          }),
        ],
      });
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("conversation-1", {
            memberIds: ["user-1", "user-2"],
            lastMessageText: "Hello again",
          }, { hasPendingWrites: true }),
        ],
      });
    });

    expect(getMessageListeners()).toHaveLength(1);
    expect(result.current.isMessagesLoading).toBe(false);
    expect(result.current.messageItems).toHaveLength(1);
  });

  it("clears rendered messages immediately when switching to a different conversation", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("conversation-1", {
            memberIds: ["user-1", "user-2"],
            lastMessageText: "Hello",
          }),
          createDoc("conversation-2", {
            memberIds: ["user-1", "user-3"],
            lastMessageText: "Newest",
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(getMessageListeners()).toHaveLength(1);
    });

    act(() => {
      listeners[0]?.callback({
        docs: [
          createDoc("user-1", {
            email: "owner@example.com",
            displayName: "Owner User",
          }),
          createDoc("user-2", {
            email: "jane@example.com",
            displayName: "Jane Doe",
          }),
          createDoc("user-3", {
            email: "john@example.com",
            displayName: "John Smith",
          }),
        ],
      });
    });

    act(() => {
      getMessageListeners()[0]?.callback({
        docs: [
          createDoc("message-1", {
            senderId: "user-2",
            text: "Hello from conversation 1",
            type: "text",
          }),
        ],
      });
    });

    expect(result.current.selectedConversationId).toBe("conversation-1");
    expect(result.current.messageItems).toHaveLength(1);
    expect(result.current.messageItems[0]?.text).toBe("Hello from conversation 1");

    act(() => {
      result.current.setSelectedConversationId("conversation-2");
    });

    expect(result.current.selectedConversationId).toBe("conversation-2");
    expect(result.current.messageItems).toHaveLength(0);
  });

  it("stops messages loading when Firebase services are unavailable", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      result.current.setSelectedConversationId("conversation-1");
    });

    getFirebaseServicesMock.mockReturnValue(null);

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("conversation-1", {
            memberIds: ["user-1", "user-2"],
            lastMessageText: "",
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(result.current.isMessagesLoading).toBe(false);
    });

    expect(getMessageListeners()).toHaveLength(0);
  });

  it("maps group conversations to their group name instead of a direct-chat fallback", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      listeners[0]?.callback({
        docs: [
          createDoc("user-1", {
            email: "owner@example.com",
            displayName: "Owner User",
          }),
          createDoc("user-2", {
            email: "jane@example.com",
            displayName: "Jane Doe",
          }),
          createDoc("user-3", {
            email: "john@example.com",
            displayName: "John Smith",
          }),
        ],
      });
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("group-1", {
            type: "group",
            name: "Product Squad",
            memberIds: ["user-1", "user-2", "user-3"],
            lastMessageText: "",
          }),
        ],
      });
    });

    expect(result.current.conversationItems).toEqual([
      {
        id: "group-1",
        title: "Product Squad",
        memberSummary: "3 members: Jane Doe, John Smith, +1",
        lastMessageText: "No messages yet",
      },
    ]);
  });

  it("builds selected group details with full member names", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(listeners.length).toBeGreaterThan(0);
    });

    act(() => {
      listeners[0]?.callback({
        docs: [
          createDoc("user-1", {
            email: "owner@example.com",
            displayName: "Owner User",
          }),
          createDoc("user-2", {
            email: "jane@example.com",
            displayName: "Jane Doe",
          }),
          createDoc("user-3", {
            email: "john@example.com",
            displayName: "John Smith",
          }),
        ],
      });
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("group-1", {
            type: "group",
            name: "Product Squad",
            memberIds: ["user-1", "user-2", "user-3"],
            lastMessageText: "",
          }),
        ],
      });
    });

    expect(result.current.selectedConversationDetails).toEqual({
      id: "group-1",
      title: "Product Squad",
      subtitle: "Owner User, Jane Doe, John Smith",
    });
  });

  it("maps direct-chat own message receipts to sent and seen states", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      listeners[0]?.callback({
        docs: [
          createDoc("user-1", {
            email: "owner@example.com",
            displayName: "Owner User",
          }),
          createDoc("user-2", {
            email: "jane@example.com",
            displayName: "Jane Doe",
          }),
        ],
      });
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("conversation-1", {
            type: "direct",
            memberIds: ["user-1", "user-2"],
            lastMessageText: "Latest message",
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(getMessageListeners()).toHaveLength(1);
    });

    act(() => {
      getMessageListeners()[0]?.callback({
        docs: [
          createDoc("message-1", {
            senderId: "user-1",
            text: "Sent message",
            type: "text",
            deliveredTo: [],
            readBy: [],
          }),
          createDoc("message-2", {
            senderId: "user-2",
            text: "Reply",
            type: "text",
            deliveredTo: ["user-2"],
            readBy: ["user-2"],
          }),
          createDoc("message-3", {
            senderId: "user-1",
            text: "Seen message",
            type: "text",
            deliveredTo: ["user-2"],
            readBy: ["user-2"],
          }),
        ],
      });
    });

    expect(result.current.messageItems.map((message) => message.receiptLabel)).toEqual([
      "Sent",
      undefined,
      "Seen",
    ]);
  });

  it("maps direct-chat own message receipts to sent, delivered, and seen states", async () => {
    const { result } = renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      listeners[0]?.callback({
        docs: [
          createDoc("user-1", {
            email: "owner@example.com",
            displayName: "Owner User",
          }),
          createDoc("user-2", {
            email: "jane@example.com",
            displayName: "Jane Doe",
          }),
        ],
      });
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("conversation-1", {
            type: "direct",
            memberIds: ["user-1", "user-2"],
            lastMessageText: "Latest message",
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(getMessageListeners()).toHaveLength(1);
    });

    act(() => {
      getMessageListeners()[0]?.callback({
        docs: [
          createDoc("message-1", {
            senderId: "user-1",
            text: "Sent message",
            type: "text",
            deliveredTo: [],
            readBy: [],
          }),
          createDoc("message-2", {
            senderId: "user-2",
            text: "Reply",
            type: "text",
            deliveredTo: ["user-2"],
            readBy: ["user-2"],
          }),
          createDoc("message-3", {
            senderId: "user-1",
            text: "Delivered message",
            type: "text",
            deliveredTo: ["user-2"],
            readBy: [],
          }),
          createDoc("message-4", {
            senderId: "user-2",
            text: "Another reply",
            type: "text",
            deliveredTo: ["user-2"],
            readBy: ["user-2"],
          }),
          createDoc("message-5", {
            senderId: "user-1",
            text: "Seen message",
            type: "text",
            deliveredTo: ["user-2"],
            readBy: ["user-2"],
          }),
        ],
      });
    });

    expect(result.current.messageItems.map((message) => message.receiptLabel)).toEqual([
      "Sent",
      undefined,
      "Delivered",
      undefined,
      "Seen",
    ]);
  });

  it("marks messages seen only for direct conversations", async () => {
    renderHook(() => useChatData("user-1"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("group-1", {
            type: "group",
            name: "Team chat",
            memberIds: ["user-1", "user-2", "user-3"],
            lastMessageText: "Hello",
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(getMessageListeners()).toHaveLength(1);
    });

    act(() => {
      getMessageListeners()[0]?.callback({
        docs: [
          createDoc("message-1", {
            senderId: "user-2",
            text: "Hello team",
            type: "text",
            deliveredTo: ["user-2"],
            readBy: ["user-2"],
          }),
        ],
      });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(markConversationMessagesSeenMock).not.toHaveBeenCalled();
  });

  it("reports errors when marking direct message receipts fails", async () => {
    renderHook(() => useChatData("user-1"));
    markConversationMessagesSeenMock.mockRejectedValueOnce(new Error("permission-denied"));

    await waitFor(() => {
      expect(getConversationListener()).toBeDefined();
    });

    act(() => {
      getConversationListener()?.callback({
        docs: [
          createDoc("conversation-1", {
            type: "direct",
            memberIds: ["user-1", "user-2"],
            lastMessageText: "Hello",
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(getMessageListeners()).toHaveLength(1);
    });

    act(() => {
      getMessageListeners()[0]?.callback({
        docs: [
          createDoc("message-1", {
            senderId: "user-2",
            text: "Hello there",
            type: "text",
            deliveredTo: ["user-2"],
            readBy: ["user-2"],
          }),
        ],
      });
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to mark messages as seen",
        expect.objectContaining({
          conversationId: "conversation-1",
          currentUserId: "user-1",
          messageIds: ["message-1"],
          error: expect.any(Error),
        }),
      );
    });
  });

});
