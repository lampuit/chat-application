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

function createDoc(id: string, data: Record<string, unknown>): SnapshotDoc {
  return {
    id,
    data: () => data,
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

describe("useChatData seen receipts", () => {
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
