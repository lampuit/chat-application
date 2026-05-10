"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { ChatShell } from "@/components/chat/chat-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { createDirectConversationWithFirstMessage } from "@/lib/chat/conversations";
import { buildDirectMemberKey } from "@/lib/chat/member-key";
import { sendMessageToConversation } from "@/lib/chat/messages";
import { logout } from "@/lib/auth/auth-service";

type UserRecord = {
  uid: string;
  email: string;
  displayName: string;
};

type ConversationRecord = {
  id: string;
  memberIds: string[];
  lastMessageText: string;
  lastMessageAt?: { toDate?: () => Date } | null;
};

type MessageRecord = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: { toDate?: () => Date } | null;
};

export function ChatClient() {
  const { user } = useAuth();
  const currentUser = user;
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null,
  );
  const [draftMessage, setDraftMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const currentUserId = currentUser?.uid ?? null;

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let unsubscribeUsers: () => void = () => undefined;
    let unsubscribeConversations: () => void = () => undefined;

    async function subscribe() {
      const firestore = await import("firebase/firestore");
      const { getFirebaseServices } = await import("@/lib/firebase/client");
      const services = getFirebaseServices();

      if (!services) {
        return;
      }

      unsubscribeUsers = firestore.onSnapshot(
        firestore.collection(services.db, "users"),
        (snapshot) => {
          setUsers(
            snapshot.docs.map((doc) => ({
              uid: doc.id,
              ...(doc.data() as Omit<UserRecord, "uid">),
            })),
          );
        },
      );

      unsubscribeConversations = firestore.onSnapshot(
        firestore.query(
          firestore.collection(services.db, "conversations"),
          firestore.where("memberIds", "array-contains", currentUserId),
          firestore.orderBy("lastMessageAt", "desc"),
        ),
        (snapshot) => {
          const nextConversations = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ConversationRecord, "id">),
          }));
          setConversations(nextConversations);

          setSelectedConversationId((currentSelection) => {
            if (currentSelection) {
              return currentSelection;
            }

            return nextConversations[0]?.id ?? null;
          });
        },
      );
    }

    void subscribe();

    return () => {
      unsubscribeUsers();
      unsubscribeConversations();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    const conversationId = selectedConversationId;
    let unsubscribe: () => void = () => undefined;

    async function subscribeToMessages() {
      const firestore = await import("firebase/firestore");
      const { getFirebaseServices } = await import("@/lib/firebase/client");
      const services = getFirebaseServices();

      if (!services) {
        return;
      }

      unsubscribe = firestore.onSnapshot(
        firestore.query(
          firestore.collection(
            services.db,
            "conversations",
            conversationId,
            "messages",
          ),
          firestore.orderBy("createdAt", "asc"),
        ),
        (snapshot) => {
          setMessages(
            snapshot.docs.map((doc) => ({
              id: doc.id,
              ...(doc.data() as Omit<MessageRecord, "id">),
            })),
          );
        },
      );
    }

    void subscribeToMessages();

    return () => {
      unsubscribe();
    };
  }, [selectedConversationId]);

  const conversationItems = useMemo(() => {
    return conversations.map((conversation) => {
      const otherUserId =
        conversation.memberIds.find((memberId) => memberId !== currentUserId) ?? null;
      const otherUser = users.find((entry) => entry.uid === otherUserId);

      return {
        id: conversation.id,
        title: otherUser?.displayName ?? otherUser?.email ?? "Direct chat",
        lastMessageText: conversation.lastMessageText || "No messages yet",
      };
    });
  }, [conversations, currentUserId, users]);

  const messageItems = useMemo(() => {
    return messages.map((message) => {
      const sender = users.find((entry) => entry.uid === message.senderId);

      return {
        id: message.id,
        senderLabel: sender?.displayName ?? sender?.email ?? "Unknown user",
        text: message.text,
        createdAtLabel: message.createdAt?.toDate?.().toLocaleTimeString() ?? "Sending...",
        isOwnMessage: message.senderId === currentUserId,
      };
    });
  }, [currentUserId, messages, users]);

  async function handleStartConversation(otherUserId: string) {
    if (!currentUserId) {
      return;
    }

    const existingConversation = conversations.find((conversation) =>
      buildDirectMemberKey(currentUserId, otherUserId) ===
      buildDirectMemberKey(conversation.memberIds[0] ?? "", conversation.memberIds[1] ?? ""),
    );

    if (existingConversation) {
      setSelectedConversationId(existingConversation.id);
      return;
    }

    const conversationId = crypto.randomUUID();
    setSelectedConversationId(conversationId);

    const { setDoc, doc, serverTimestamp } = await import("firebase/firestore");
    const { getFirebaseServices } = await import("@/lib/firebase/client");
    const services = getFirebaseServices();

    if (!services) {
      return;
    }

    await setDoc(doc(services.db, "conversations", conversationId), {
      type: "direct",
      memberIds: [currentUserId, otherUserId].sort(),
      memberKey: buildDirectMemberKey(currentUserId, otherUserId),
      lastMessageText: "",
      lastMessageSenderId: "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  function handleSendMessage() {
    if (!currentUserId || !selectedConversationId || !draftMessage.trim()) {
      return;
    }

    const hasMessages = messages.length > 0;
    const nextMessage = draftMessage.trim();
    setDraftMessage("");

    startTransition(async () => {
      if (!hasMessages) {
        const selectedConversation = conversations.find(
          (conversation) => conversation.id === selectedConversationId,
        );
        const otherUserId =
          selectedConversation?.memberIds.find((memberId) => memberId !== currentUserId) ?? "";

        await createDirectConversationWithFirstMessage({
          conversationId: selectedConversationId,
          currentUserId,
          otherUserId,
          text: nextMessage,
        });
        return;
      }

      await sendMessageToConversation({
        conversationId: selectedConversationId,
        senderId: currentUserId,
        text: nextMessage,
      });
    });
  }

  if (!currentUserId || !currentUser) {
    return null;
  }

  const displayName = currentUser.displayName ?? currentUser.email ?? "Realtime Chat";
  const displayNameInitials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-black/5 bg-white/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-950 text-base font-semibold text-white shadow-[0_14px_30px_rgba(5,46,22,0.18)]">
            {displayNameInitials || "RC"}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-700">
              Signed in
            </p>
            <h1 className="truncate text-2xl font-semibold text-slate-950 sm:text-3xl">
              {displayName}
            </h1>
            <p className="truncate text-sm text-slate-500">
              {currentUser.email ?? "Active account"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentUser.displayName ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              Profile ready
            </span>
          ) : null}
          <button
            className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            onClick={() => void logout()}
            type="button"
          >
            Logout
          </button>
        </div>
      </div>
      <ChatShell
        conversations={conversationItems}
        currentUserId={currentUserId}
        draftMessage={draftMessage}
        messages={messageItems}
        onDraftMessageChange={setDraftMessage}
        onSelectConversation={setSelectedConversationId}
        onSendMessage={handleSendMessage}
        onStartConversation={(otherUserId) => void handleStartConversation(otherUserId)}
        selectedConversationId={selectedConversationId}
        users={users}
      />
      {isPending ? <p className="text-sm text-slate-500">Sending...</p> : null}
    </div>
  );
}
