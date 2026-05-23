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

describe("processMessageCreated payload delivery", () => {
  it("loads the conversation, excludes the sender, deduplicates tokens, and sends a data payload", async () => {
    const processMessageCreated = getProcessMessageCreated();
    const deps = createDeps();

    deps.getConversation.mockResolvedValue({
      memberIds: ["sender-1", "receiver-1", "receiver-2"],
    });
    deps.getUser.mockImplementation(async (uid: string) => {
      if (uid === "receiver-1") {
        return {
          displayName: "Receiver One",
          fcmTokens: ["token-1", "token-2"],
        };
      }

      if (uid === "receiver-2") {
        return {
          displayName: "Receiver Two",
          fcmTokens: ["token-2", "token-3"],
        };
      }

      return {
        displayName: "Sender",
        fcmTokens: ["sender-token"],
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

    expect(deps.getConversation).toHaveBeenCalledWith("conversation-1");
    expect(deps.getUser).toHaveBeenCalledTimes(2);
    expect(deps.getUser).toHaveBeenNthCalledWith(1, "receiver-1");
    expect(deps.getUser).toHaveBeenNthCalledWith(2, "receiver-2");
    expect(deps.sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ["token-1", "token-2", "token-3"],
      notification: {
        title: "New message",
        body: "Hello there",
      },
      data: {
        conversationId: "conversation-1",
        messageId: "message-1",
        senderId: "sender-1",
        title: "New message",
        body: "Hello there",
      },
    });
  });
});
