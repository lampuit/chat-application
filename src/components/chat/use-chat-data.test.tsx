import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatData } from "./use-chat-data";

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
  getFirebaseServices: () => ({
    db: { mocked: true },
  }),
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
  beforeEach(() => {
    listeners.length = 0;
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
