import type { UserRecord, ConversationRecord, MessageRecord } from "./use-chat-data";

export async function subscribeToUsers(
  currentUserId: string,
  onSnapshot: (users: UserRecord[]) => void,
  onError: () => void,
) {
  const firestore = await import("firebase/firestore");
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    onError();
    return undefined;
  }

  return firestore.onSnapshot(
    firestore.collection(services.db, "users"),
    (snapshot) => {
      onSnapshot(
        snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...(doc.data() as Omit<UserRecord, "uid">),
        })),
      );
    },
  );
}

export async function subscribeToConversations(
  currentUserId: string,
  onSnapshot: (conversations: ConversationRecord[], confirmedIds: string[]) => void,
  onError: () => void,
) {
  const firestore = await import("firebase/firestore");
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    onError();
    return undefined;
  }

  return firestore.onSnapshot(
    firestore.query(
      firestore.collection(services.db, "conversations"),
      firestore.where("memberIds", "array-contains", currentUserId),
      firestore.orderBy("lastMessageAt", "desc"),
    ),
    (snapshot) => {
      const nextConfirmedIds = new Set<string>();
      const nextConversations = snapshot.docs.map((doc) => ({
        id: doc.id,
        pending: Boolean(doc.metadata?.hasPendingWrites),
        ...(doc.data() as Omit<ConversationRecord, "id">),
      }));

      snapshot.docs.forEach((doc) => {
        if (!doc.metadata?.hasPendingWrites) {
          nextConfirmedIds.add(doc.id);
        }
      });

      onSnapshot(nextConversations, Array.from(nextConfirmedIds));
    },
  );
}

export async function subscribeToMessages(
  conversationId: string,
  currentUserId: string | null,
  onSnapshot: (messages: MessageRecord[]) => void,
  onError: () => void,
) {
  const firestore = await import("firebase/firestore");
  const { getFirebaseServices } = await import("@/lib/firebase/client");
  const services = getFirebaseServices();

  if (!services) {
    onError();
    return undefined;
  }

  return firestore.onSnapshot(
    firestore.query(
      firestore.collection(services.db, "conversations", conversationId, "messages"),
      firestore.orderBy("createdAt", "asc"),
    ),
    (snapshot) => {
      onSnapshot(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<MessageRecord, "id">),
        })),
      );
    },
    onError,
  );
}
