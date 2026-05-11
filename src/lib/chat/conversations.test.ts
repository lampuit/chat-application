import { describe, expect, it, vi } from "vitest";
import {
  createDirectConversationWithFirstMessage,
  createMessageRecord,
} from "@/lib/chat/conversations";

describe("createMessageRecord", () => {
  it("includes the conversationId on every message", () => {
    const timestampToken = { ".sv": "serverTimestamp" };

    expect(
      createMessageRecord(
        {
          conversationId: "conversation-1",
          senderId: "user-1",
          text: "Hello",
        },
        timestampToken,
      ),
    ).toEqual({
      conversationId: "conversation-1",
      senderId: "user-1",
      type: "text",
      text: "Hello",
      createdAt: timestampToken,
    });
  });

  it("stores generic attachment metadata for non-image files", () => {
    const timestampToken = { ".sv": "serverTimestamp" };

    expect(
      createMessageRecord(
        {
          conversationId: "conversation-1",
          senderId: "user-1",
          fileUrl: "https://example.com/file.pdf",
          fileName: "file.pdf",
          fileType: "application/pdf",
          fileSize: 512,
          text: "See attached",
        } as any,
        timestampToken,
      ),
    ).toEqual({
      conversationId: "conversation-1",
      senderId: "user-1",
      type: "file",
      fileUrl: "https://example.com/file.pdf",
      fileName: "file.pdf",
      fileType: "application/pdf",
      fileSize: 512,
      text: "See attached",
      createdAt: timestampToken,
    });
  });
});

describe("createDirectConversationWithFirstMessage", () => {
  it("writes conversation metadata and first message in one batch", async () => {
    const set = vi.fn();
    const commit = vi.fn().mockResolvedValue(undefined);
    const writeBatch = vi.fn().mockReturnValue({ set, commit });
    const doc = vi
      .fn()
      .mockReturnValueOnce("conversation-ref")
      .mockReturnValueOnce("message-ref");
    const serverTimestamp = vi.fn(() => ({ ".sv": "serverTimestamp" }));

    await createDirectConversationWithFirstMessage(
      {
        conversationId: "conversation-1",
        currentUserId: "user-b",
        otherUserId: "user-a",
        text: "Hello",
      },
      {
        db: "db-instance",
        doc,
        writeBatch,
        serverTimestamp,
      },
    );

    expect(set).toHaveBeenNthCalledWith(
      1,
      "conversation-ref",
      expect.objectContaining({
        type: "direct",
        memberIds: ["user-a", "user-b"],
        memberKey: "user-a_user-b",
        lastMessageText: "Hello",
        lastMessageSenderId: "user-b",
      }),
    );
    expect(set).toHaveBeenNthCalledWith(
      2,
      "message-ref",
      expect.objectContaining({
        conversationId: "conversation-1",
        senderId: "user-b",
        text: "Hello",
      }),
    );
    expect(commit).toHaveBeenCalledTimes(1);
  });
});
