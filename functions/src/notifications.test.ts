import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import * as notificationsModule from "./notifications";

const testFilePath = fileURLToPath(import.meta.url);
const srcDir = path.dirname(testFilePath);
const functionsDir = path.resolve(srcDir, "..");
const repoRoot = path.resolve(functionsDir, "..");

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

function readFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function getProcessMessageCreated(): ProcessMessageCreated {
  const processMessageCreated = (
    notificationsModule as unknown as {
      processMessageCreated?: ProcessMessageCreated;
    }
  ).processMessageCreated;

  expect(processMessageCreated).toBeTypeOf("function");

  return processMessageCreated as ProcessMessageCreated;
}

function createDeps(overrides?: {
  getConversation?: (conversationId: string) => Promise<ConversationRecord | null>;
  getUser?: (uid: string) => Promise<UserRecord | null>;
  sendEachForMulticast?: (message: {
    tokens: string[];
    data: Record<string, string>;
    notification?: {
      title: string;
      body: string;
    };
  }) => Promise<BatchResponse>;
  removeTokenFromUser?: (uid: string, token: string) => Promise<void>;
}) {
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
    ...overrides,
  };
}

describe("Firebase Functions notifications scaffold", () => {
  it("creates the Task 6 workspace contract for message notifications", () => {
    const firebaseConfig = JSON.parse(readFile("firebase.json"));
    const functionsPackageJson = JSON.parse(readFile("functions/package.json"));
    const functionsTsconfig = readFile("functions/tsconfig.json");
    const functionsGitignore = readFile("functions/.gitignore");
    const indexSource = readFile("functions/src/index.ts");
    const notificationsSource = readFile("functions/src/notifications.ts");

    expect(firebaseConfig.functions).toEqual(
      expect.objectContaining({
        source: "functions",
      }),
    );

    expect(functionsPackageJson).toEqual(
      expect.objectContaining({
        name: "functions",
        private: true,
        main: "lib/index.js",
      }),
    );
    expect(functionsPackageJson.dependencies).toEqual(
      expect.objectContaining({
        "firebase-admin": expect.any(String),
        "firebase-functions": expect.any(String),
      }),
    );

    expect(functionsTsconfig).toContain('"outDir": "lib"');
    expect(functionsTsconfig).toContain('"rootDir": "src"');
    expect(functionsGitignore).toContain("lib");

    expect(indexSource).toContain(
      'export { notifyOnMessageCreated } from "./notifications";',
    );

    expect(notificationsSource).toContain(
      "conversations/{conversationId}/messages/{messageId}",
    );
    expect(notificationsSource).toContain("onDocumentCreated(");
    expect(notificationsSource).toContain("notifyOnMessageCreated");
    expect(notificationsSource).toContain("processMessageCreated");
    expect(notificationsSource).toContain('from "firebase-admin/app"');
    expect(notificationsSource).toContain("getApps().length === 0");
    expect(notificationsSource).toContain("initializeApp()");
  });
});

describe("processMessageCreated", () => {
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

  it("removes permanently invalid tokens from recipient users after multicast send failures", async () => {
    const processMessageCreated = getProcessMessageCreated();
    const deps = createDeps();

    deps.getConversation.mockResolvedValue({
      memberIds: ["sender-1", "receiver-1", "receiver-2", "receiver-3"],
    });
    deps.getUser.mockImplementation(async (uid: string) => {
      if (uid === "receiver-1") {
        return {
          displayName: uid,
          fcmTokens: ["token-1"],
        };
      }

      if (uid === "receiver-2") {
        return {
          displayName: uid,
          fcmTokens: ["token-2"],
        };
      }

      return {
        displayName: uid,
        fcmTokens: ["token-3"],
      };
    });
    deps.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 2,
      responses: [
        {
          success: true,
        },
        {
          success: false,
          error: {
            code: "messaging/invalid-registration-token",
            message: "Token is not valid",
          },
        },
        {
          success: false,
          error: {
            code: "messaging/registration-token-not-registered",
            message: "Token not registered",
          },
        },
      ],
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

    expect(deps.sendEachForMulticast).toHaveBeenCalledOnce();
    expect(deps.removeTokenFromUser).toHaveBeenCalledTimes(2);
    expect(deps.removeTokenFromUser).toHaveBeenNthCalledWith(1, "receiver-2", "token-2");
    expect(deps.removeTokenFromUser).toHaveBeenNthCalledWith(2, "receiver-3", "token-3");
    expect(deps.logger.error).toHaveBeenCalledWith(
      "Message notification send failures",
      expect.objectContaining({
        conversationId: "conversation-1",
        messageId: "message-1",
        senderId: "sender-1",
        failureCount: 2,
        failures: [
          {
            token: "token-2",
            code: "messaging/invalid-registration-token",
            message: "Token is not valid",
          },
          {
            token: "token-3",
            code: "messaging/registration-token-not-registered",
            message: "Token not registered",
          },
        ],
      }),
    );
    expect(deps.logger.info).toHaveBeenCalledWith(
      "Message notification invalid token cleanup",
      expect.objectContaining({
        conversationId: "conversation-1",
        messageId: "message-1",
        senderId: "sender-1",
        cleanedUpTokens: [
          {
            uid: "receiver-2",
            token: "token-2",
            code: "messaging/invalid-registration-token",
          },
          {
            uid: "receiver-3",
            token: "token-3",
            code: "messaging/registration-token-not-registered",
          },
        ],
      }),
    );
  });

  it("does not remove tokens for transient send failures", async () => {
    const processMessageCreated = getProcessMessageCreated();
    const deps = createDeps();

    deps.getConversation.mockResolvedValue({
      memberIds: ["sender-1", "receiver-1", "receiver-2"],
    });
    deps.getUser.mockImplementation(async (uid: string) => ({
      displayName: uid,
      fcmTokens: uid === "receiver-1" ? ["token-1"] : ["token-2"],
    }));
    deps.sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        {
          success: true,
        },
        {
          success: false,
          error: {
            code: "messaging/internal-error",
            message: "Temporary messaging issue",
          },
        },
      ],
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

    expect(deps.removeTokenFromUser).not.toHaveBeenCalled();
    expect(deps.logger.error).toHaveBeenCalledWith(
      "Message notification send failures",
      expect.objectContaining({
        failureCount: 1,
        failures: [
          {
            token: "token-2",
            code: "messaging/internal-error",
            message: "Temporary messaging issue",
          },
        ],
      }),
    );
    expect(deps.logger.info).not.toHaveBeenCalledWith(
      "Message notification invalid token cleanup",
      expect.any(Object),
    );
  });
});
