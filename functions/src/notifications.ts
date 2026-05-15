import * as admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

const adminApp = admin.apps.length === 0 ? admin.initializeApp() : admin.app();

export const MESSAGE_DOCUMENT_PATH =
  "conversations/{conversationId}/messages/{messageId}";

type MessageRecord = {
  senderId?: string;
  text?: string;
};

type ConversationRecord = {
  memberIds?: string[];
};

type UserRecord = {
  fcmTokens?: string[];
};

type BatchResponse = {
  successCount: number;
  failureCount: number;
  responses: Array<{
    success: boolean;
    error?: {
      code?: string;
      message?: string;
    };
  }>;
};

type NotificationDeps = {
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
  logger: Pick<typeof logger, "info" | "error">;
};

function logSkip(
  sink: Pick<typeof logger, "info">,
  details: Record<string, unknown>,
) {
  sink.info("Skipping message notification", details);
}

function collectUniqueTokens(users: Array<UserRecord | null>): string[] {
  return [...new Set(users.flatMap((user) => user?.fcmTokens ?? []))];
}

function buildMulticastPayload(input: {
  conversationId: string;
  messageId: string;
  senderId: string;
  text?: string;
  tokens: string[];
}) {
  const title = "New message";
  const body = input.text?.trim() || "Open the conversation";

  return {
    tokens: input.tokens,
    notification: {
      title,
      body,
    },
    data: {
      conversationId: input.conversationId,
      messageId: input.messageId,
      senderId: input.senderId,
      title,
      body,
    },
  };
}

function collectTokenOwners(
  recipientIds: string[],
  users: Array<UserRecord | null>,
): Map<string, string[]> {
  const tokenOwners = new Map<string, string[]>();

  recipientIds.forEach((uid, index) => {
    const userTokens = [...new Set(users[index]?.fcmTokens ?? [])];

    userTokens.forEach((token) => {
      const owners = tokenOwners.get(token) ?? [];
      owners.push(uid);
      tokenOwners.set(token, owners);
    });
  });

  return tokenOwners;
}

function isPermanentTokenFailure(code?: string): boolean {
  return (
    code === "messaging/invalid-registration-token" ||
    code === "messaging/registration-token-not-registered"
  );
}

export async function processMessageCreated(
  input: {
    conversationId: string;
    messageId: string;
    message?: MessageRecord | null;
  },
  deps: NotificationDeps,
): Promise<void> {
  const { conversationId, messageId, message } = input;

  if (!message) {
    logSkip(deps.logger, {
      reason: "missing_snapshot",
      conversationId,
      messageId,
    });
    return;
  }

  const senderId = message.senderId;

  if (!senderId) {
    logSkip(deps.logger, {
      reason: "missing_sender",
      conversationId,
      messageId,
    });
    return;
  }

  const conversation = await deps.getConversation(conversationId);

  if (!conversation) {
    logSkip(deps.logger, {
      reason: "missing_conversation",
      conversationId,
      messageId,
      senderId,
    });
    return;
  }

  const recipients = (conversation.memberIds ?? []).filter(
    (memberId) => memberId !== senderId,
  );

  if (recipients.length === 0) {
    logSkip(deps.logger, {
      reason: "missing_recipients",
      conversationId,
      messageId,
      senderId,
    });
    return;
  }

  const recipientUsers = await Promise.all(
    recipients.map((recipientId) => deps.getUser(recipientId)),
  );
  const tokenOwners = collectTokenOwners(recipients, recipientUsers);
  const tokens = collectUniqueTokens(recipientUsers);

  if (tokens.length === 0) {
    logSkip(deps.logger, {
      reason: "missing_tokens",
      conversationId,
      messageId,
      senderId,
    });
    return;
  }

  const payload = buildMulticastPayload({
    conversationId,
    messageId,
    senderId,
    text: message.text,
    tokens,
  });

  try {
    const response = await deps.sendEachForMulticast(payload);

    if (response.failureCount > 0) {
      const failures = response.responses.flatMap((result, index) => {
        if (result.success) {
          return [];
        }

        return [
          {
            token: tokens[index],
            code: result.error?.code,
            message: result.error?.message ?? "Unknown messaging error",
          },
        ];
      });

      deps.logger.error("Message notification send failures", {
        conversationId,
        messageId,
        senderId,
        failureCount: response.failureCount,
        failures,
      });

      const permanentlyInvalidFailures = failures.filter((failure) =>
        isPermanentTokenFailure(failure.code),
      );

      if (permanentlyInvalidFailures.length > 0) {
        const cleanedUpTokens: Array<{
          uid: string;
          token: string;
          code?: string;
        }> = [];
        const cleanupFailures: Array<{
          uid: string;
          token: string;
          code?: string;
          error: string;
        }> = [];

        for (const failure of permanentlyInvalidFailures) {
          const ownerIds = tokenOwners.get(failure.token) ?? [];

          for (const uid of ownerIds) {
            try {
              await deps.removeTokenFromUser(uid, failure.token);
              cleanedUpTokens.push({
                uid,
                token: failure.token,
                code: failure.code,
              });
            } catch (cleanupError) {
              cleanupFailures.push({
                uid,
                token: failure.token,
                code: failure.code,
                error:
                  cleanupError instanceof Error
                    ? cleanupError.message
                    : String(cleanupError),
              });
            }
          }
        }

        if (cleanedUpTokens.length > 0 || cleanupFailures.length > 0) {
          deps.logger.info("Message notification invalid token cleanup", {
            conversationId,
            messageId,
            senderId,
            cleanedUpTokens,
            cleanupFailures,
          });
        }
      }
    }
  } catch (error) {
    deps.logger.error("Message notification send failed", {
      conversationId,
      messageId,
      senderId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export const notifyOnMessageCreated = onDocumentCreated(
  MESSAGE_DOCUMENT_PATH,
  async (event) => {
    const firestore = getFirestore(adminApp);
    const messaging = getMessaging(adminApp);
    const parentConversationRef = event.data?.ref.parent.parent;

    await processMessageCreated(
      {
        conversationId: event.params.conversationId,
        messageId: event.params.messageId,
        message: event.data?.data() as MessageRecord | undefined,
      },
      {
        getConversation: async (conversationId) => {
          const conversationSnapshot = parentConversationRef
            ? await parentConversationRef.get()
            : await firestore.doc(`conversations/${conversationId}`).get();

          return conversationSnapshot.exists
            ? (conversationSnapshot.data() as ConversationRecord)
            : null;
        },
        getUser: async (uid) => {
          const userSnapshot = await firestore.doc(`users/${uid}`).get();

          return userSnapshot.exists ? (userSnapshot.data() as UserRecord) : null;
        },
        sendEachForMulticast: async (payload) =>
          (await messaging.sendEachForMulticast(payload)) as BatchResponse,
        removeTokenFromUser: async (uid, token) => {
          await firestore.doc(`users/${uid}`).update({
            fcmTokens: FieldValue.arrayRemove(token),
          });
        },
        logger,
      },
    );
  },
);
