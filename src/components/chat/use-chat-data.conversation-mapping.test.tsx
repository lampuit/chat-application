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

describe("useChatData conversation mapping", () => {
  beforeEach(() => {
    listeners.length = 0;
    getFirebaseServicesMock.mockReset();
    getFirebaseServicesMock.mockReturnValue({
      db: { mocked: true },
    });
    markConversationMessagesSeenMock.mockReset();
    markConversationMessagesSeenMock.mockResolvedValue(undefined);
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
});
