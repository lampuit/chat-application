"use client";

import React, { useLayoutEffect, useRef } from "react";
import { isNearBottom } from "./message-thread-icons";
import { NoConversationSelected, MessageThreadSkeleton, NoMessages } from "./message-thread-empty-states";
import { MessageList } from "./message-thread-list";

type MessageThreadProps = {
  conversationId: string | null;
  hasSelection: boolean;
  isLoading: boolean;
  messages: Array<{
    id: string;
    senderLabel: string;
    text: string;
    createdAtLabel: string;
    isOwnMessage: boolean;
    receiptLabel?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
  }>;
};

export function MessageThread({
  conversationId,
  hasSelection,
  isLoading,
  messages,
}: MessageThreadProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const hasScrolledToConversationRef = useRef(false);
  const wasNearBottomRef = useRef(true);

  useLayoutEffect(() => {
    if (!conversationId || messages.length === 0) {
      previousConversationIdRef.current = conversationId;
      previousLastMessageIdRef.current = messages.at(-1)?.id ?? null;
      hasScrolledToConversationRef.current = false;
      wasNearBottomRef.current = true;
      return;
    }

    const scrollContainer = scrollContainerRef.current;
    const bottomElement = bottomRef.current;

    if (!scrollContainer || !bottomElement) {
      return;
    }

    const lastMessageId = messages.at(-1)?.id ?? null;
    const isConversationChanged = previousConversationIdRef.current !== conversationId;
    const isInitialScrollForConversation =
      isConversationChanged || !hasScrolledToConversationRef.current;
    const hasNewLatestMessage = previousLastMessageIdRef.current !== lastMessageId;
    const shouldKeepLatestOwnMessageVisible = Boolean(messages.at(-1)?.isOwnMessage);

    if (isInitialScrollForConversation) {
      bottomElement.scrollIntoView({ behavior: "auto", block: "end" });
      hasScrolledToConversationRef.current = true;
      wasNearBottomRef.current = true;
    } else if (
      hasNewLatestMessage &&
      (wasNearBottomRef.current || shouldKeepLatestOwnMessageVisible)
    ) {
      bottomElement.scrollIntoView({ behavior: "smooth", block: "end" });
      wasNearBottomRef.current = true;
    } else {
      wasNearBottomRef.current = isNearBottom(scrollContainer);
    }

    previousConversationIdRef.current = conversationId;
    previousLastMessageIdRef.current = lastMessageId;
  }, [conversationId, messages]);

  if (!hasSelection) {
    return <NoConversationSelected />;
  }

  if (isLoading) {
    return <MessageThreadSkeleton />;
  }

  if (messages.length === 0) {
    return <NoMessages />;
  }

  return (
    <MessageList
      messages={messages}
      scrollContainerRef={scrollContainerRef}
      bottomRef={bottomRef}
      onScroll={(event) => {
        wasNearBottomRef.current = isNearBottom(event.currentTarget);
      }}
    />
  );
}
