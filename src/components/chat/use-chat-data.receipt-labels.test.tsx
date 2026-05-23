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

describe("useChatData receipt labels", () => {
  beforeEach(() => {
    listeners.length = 0;
    getFirebaseServicesMock.mockReset();
    getFirebaseServicesMock.mockReturnValue({
      db: { mocked: true },
    });
    markConversationMessagesSeenMock.mockReset();
    markConversationMessagesSeenMock.mockResolvedValue(undefined);
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
});
