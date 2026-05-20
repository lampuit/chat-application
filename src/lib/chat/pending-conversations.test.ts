import { describe, expect, it } from "vitest";
import {
  createPendingConversationRecord,
  createPendingConversationTracker,
} from "@/lib/chat/pending-conversations";

describe("createPendingConversationRecord", () => {
  it("builds an optimistic direct conversation entry", () => {
    expect(
      createPendingConversationRecord("conversation-1", "user-b", "user-a"),
    ).toEqual({
      id: "conversation-1",
      type: "direct",
      memberIds: ["user-a", "user-b"],
      lastMessageText: "",
      lastMessageAt: null,
      pending: true,
    });
  });
});

describe("createPendingConversationTracker", () => {
  it("waits for an in-flight conversation write before continuing", async () => {
    const tracker = createPendingConversationTracker();
    let resolveWrite: (() => void) | null = null;
    let finished = false;

    tracker.trackWrite(
      "conversation-1",
      new Promise<void>((resolve) => {
        resolveWrite = resolve;
      }),
    );

    const waitPromise = tracker.waitForWrite("conversation-1")?.then(() => {
      finished = true;
    });

    await Promise.resolve();
    expect(finished).toBe(false);

    resolveWrite?.();
    await waitPromise;

    expect(finished).toBe(true);
    expect(tracker.waitForWrite("conversation-1")).toBeUndefined();
  });

  it("uses the remembered partner when the conversation snapshot is still empty", () => {
    const tracker = createPendingConversationTracker();
    tracker.rememberPartner("conversation-1", "user-b");

    expect(tracker.resolveOtherUserId("conversation-1", "user-a", [])).toBe("user-b");
  });

  it("falls back to the conversation member list once it is available", () => {
    const tracker = createPendingConversationTracker();

    expect(
      tracker.resolveOtherUserId("conversation-1", "user-a", [
        {
          id: "conversation-1",
          memberIds: ["user-a", "user-b"],
        },
      ]),
    ).toBe("user-b");
  });
});
