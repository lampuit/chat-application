import { describe, expect, it, vi } from "vitest";
import * as notificationsModule from "./notifications";

type MessageRecord = {
  senderId: string;
  text?: string;
};

type ConversationRecord = {
  memberIds?: string[];
};

type UserRecord = {
  displayName?: string;
  fcmTokens?: string[];
};

type BatchResponse = {
  successCount: number;
  failureCount: number;
  responses: Array<{
    success: boolean;
    error?: {
      code?: string;
      message: string;
    };
  }>;
};

type ProcessMessageCreated = (
  input: {
    conversationId: string;
    messageId: string;
    message?: MessageRecord | null;
  },
  deps: {
    getConversation: (conversationId: string) => Promise<ConversationRecord | null>;
    getUser: (uid: string) => Promise<UserRecord | null>;
    sendEachForMulticast: (message: {
      tokens: string[];
      data: Record<string, string>;
      notification?: {
        title: string;
        body: string;
      };
    }) => Promise<BatchResponse>;
    removeTokenFromUser: (uid: string, token: string) => Promise<void>;
    logger: {
      info: (message: string, data: Record<string, unknown>) => void;
      error: (message: string, data: Record<string, unknown>) => void;
    };
  },
) => Promise<void>;

function getProcessMessageCreated(): ProcessMessageCreated {
  const processMessageCreated = (
    notificationsModule as unknown as {
      processMessageCreated?: ProcessMessageCreated;
    }
  ).processMessageCreated;

  expect(processMessageCreated).toBeTypeOf("function");

  return processMessageCreated as ProcessMessageCreated;
}

function createDeps() {
  return {
    getConversation: vi
      .fn<(conversationId: string) => Promise<ConversationRecord | null>>()
      .mockResolvedValue(null),
    getUser: vi.fn<(uid: string) => Promise<UserRecord | null>>().mockResolvedValue(null),
    sendEachForMulticast: vi
      .fn<
        (message: {
          tokens: string[];
          data: Record<string, string>;
          notification?: {
            title: string;
            body: string;
          };
        }) => Promise<BatchResponse>
      >()
      .mockResolvedValue({
        successCount: 0,
        failureCount: 0,
        responses: [],
      }),
    removeTokenFromUser: vi.fn<(uid: string, token: string) => Promise<void>>(),
    logger: {
      info: vi.fn<(message: string, data: Record<string, unknown>) => void>(),
      error: vi.fn<(message: string, data: Record<string, unknown>) => void>(),
    },
  };
}

describe("processMessageCreated skips", () => {
  it("logs a structured skip when the message snapshot is missing", async () => {
    const processMessageCreated = getProcessMessageCreated();
    const deps = createDeps();

    await processMessageCreated(
      {
        conversationId: "conversation-1",
        messageId: "message-1",
        message: null,
      },
      deps,
    );

    expect(deps.getConversation).not.toHaveBeenCalled();
    expect(deps.sendEachForMulticast).not.toHaveBeenCalled();
    expect(deps.logger.info).toHaveBeenCalledWith(
      "Skipping message notification",
      expect.objectContaining({
        reason: "missing_snapshot",
        conversationId: "conversation-1",
        messageId: "message-1",
      }),
    );
  });

  it("logs a structured skip when the parent conversation does not exist", async () => {
    const processMessageCreated = getProcessMessageCreated();
    const deps = createDeps();

    deps.getConversation.mockResolvedValue(null);

    await processMessageCreated(
      {
        conversationId: "conversation-1",
        messageId: "message-1",
        message: {
          senderId: "sender-1",
          text: "Hello there",
        },
      },
      deps,
    );

    expect(deps.getConversation).toHaveBeenCalledWith("conversation-1");
    expect(deps.getUser).not.toHaveBeenCalled();
    expect(deps.sendEachForMulticast).not.toHaveBeenCalled();
    expect(deps.logger.info).toHaveBeenCalledWith(
      "Skipping message notification",
      expect.objectContaining({
        reason: "missing_conversation",
        conversationId: "conversation-1",
        messageId: "message-1",
        senderId: "sender-1",
      }),
    );
  });

  it("logs a structured skip when there are no recipients besides the sender", async () => {
    const processMessageCreated = getProcessMessageCreated();
    const deps = createDeps();

    deps.getConversation.mockResolvedValue({
      memberIds: ["sender-1"],
    });

    await processMessageCreated(
      {
        conversationId: "conversation-1",
        messageId: "message-1",
        message: {
          senderId: "sender-1",
          text: "Hello there",
        },
      },
      deps,
    );

    expect(deps.getUser).not.toHaveBeenCalled();
    expect(deps.sendEachForMulticast).not.toHaveBeenCalled();
    expect(deps.logger.info).toHaveBeenCalledWith(
      "Skipping message notification",
      expect.objectContaining({
        reason: "missing_recipients",
        conversationId: "conversation-1",
        messageId: "message-1",
        senderId: "sender-1",
      }),
    );
  });

  it("logs a structured skip when recipients have no FCM tokens", async () => {
    const processMessageCreated = getProcessMessageCreated();
    const deps = createDeps();

    deps.getConversation.mockResolvedValue({
      memberIds: ["sender-1", "receiver-1", "receiver-2"],
    });
    deps.getUser.mockImplementation(async (uid: string) => {
      if (uid === "receiver-1") {
        return {
          fcmTokens: [],
        };
      }

      return {
        displayName: "Receiver Two",
      };
    });

    await processMessageCreated(
      {
        conversationId: "conversation-1",
        messageId: "message-1",
        message: {
          senderId: "sender-1",
          text: "Hello there",
        },
      },
      deps,
    );

    expect(deps.getUser).toHaveBeenCalledTimes(2);
    expect(deps.sendEachForMulticast).not.toHaveBeenCalled();
    expect(deps.logger.info).toHaveBeenCalledWith(
      "Skipping message notification",
      expect.objectContaining({
        reason: "missing_tokens",
        conversationId: "conversation-1",
        messageId: "message-1",
        senderId: "sender-1",
      }),
    );
  });
});
