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

describe("useChatData loading and subscriptions", () => {
  beforeEach(() => {
    listeners.length = 0;
    getFirebaseServicesMock.mockReset();
    getFirebaseServicesMock.mockReturnValue({
      db: { mocked: true },
    });
    markConversationMessagesSeenMock.mockReset();
    markConversationMessagesSeenMock.mockResolvedValue(undefined);
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
          createDoc(
            "pending-1",
            {
              memberIds: ["user-1", "user-2"],
              lastMessageText: "",
            },
            { hasPendingWrites: true },
          ),
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
          createDoc(
            "pending-1",
            {
              memberIds: ["user-1", "user-2"],
              lastMessageText: "",
            },
            { hasPendingWrites: false },
          ),
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
});
