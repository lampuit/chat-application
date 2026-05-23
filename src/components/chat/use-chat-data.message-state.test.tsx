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

describe("useChatData message state", () => {
  beforeEach(() => {
    listeners.length = 0;
    getFirebaseServicesMock.mockReset();
    getFirebaseServicesMock.mockReturnValue({
      db: { mocked: true },
    });
    markConversationMessagesSeenMock.mockReset();
    markConversationMessagesSeenMock.mockResolvedValue(undefined);
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
          createDoc(
            "conversation-1",
            {
              memberIds: ["user-1", "user-2"],
              lastMessageText: "Hello",
            },
            { hasPendingWrites: false },
          ),
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
          createDoc(
            "conversation-1",
            {
              memberIds: ["user-1", "user-2"],
              lastMessageText: "Hello again",
            },
            { hasPendingWrites: true },
          ),
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
});
