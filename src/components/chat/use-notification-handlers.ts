import React from "react";
import {
  FOREGROUND_MESSAGE_EVENT,
  NOTIFICATION_CLICK_EVENT,
  registerFcmTokenFromUserAction,
  initializeForegroundNotificationsForCurrentSession,
} from "@/lib/firebase/messaging";

export function useNotificationHandlers(setSelectedConversationId: (id: string | null) => void) {
  const [foregroundToast, setForegroundToast] = React.useState<{
    title: string;
    body: string;
    conversationId: string | null;
    messageId: string | null;
    senderId: string | null;
  } | null>(null);
  const [isRegisteringNotifications, setIsRegisteringNotifications] = React.useState(false);
  const [notificationFeedback, setNotificationFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    void initializeForegroundNotificationsForCurrentSession();
  }, []);

  React.useEffect(() => {
    const handleForegroundMessage = (event: Event) => {
      const customEvent = event as CustomEvent<{
        title?: string;
        body?: string;
        conversationId?: string | null;
        messageId?: string | null;
        senderId?: string | null;
      }>;
      const detail = customEvent.detail;

      if (!detail?.title && !detail?.body) {
        return;
      }

      setForegroundToast({
        title: detail.title ?? "New message",
        body: detail.body ?? "",
        conversationId: detail.conversationId ?? null,
        messageId: detail.messageId ?? null,
        senderId: detail.senderId ?? null,
      });
    };

    window.addEventListener(FOREGROUND_MESSAGE_EVENT, handleForegroundMessage as EventListener);

    return () => {
      window.removeEventListener(FOREGROUND_MESSAGE_EVENT, handleForegroundMessage as EventListener);
    };
  }, []);

  React.useEffect(() => {
    const handleNotificationClick = (event: Event) => {
      const customEvent = event as CustomEvent<{
        conversationId?: string | null;
      }>;
      const conversationId = customEvent.detail?.conversationId;

      if (!conversationId) {
        return;
      }

      setSelectedConversationId(conversationId);
    };

    window.addEventListener(NOTIFICATION_CLICK_EVENT, handleNotificationClick as EventListener);

    return () => {
      window.removeEventListener(NOTIFICATION_CLICK_EVENT, handleNotificationClick as EventListener);
    };
  }, [setSelectedConversationId]);

  const handleEnableNotifications = async (currentUserId: string) => {
    setIsRegisteringNotifications(true);
    setNotificationFeedback(null);

    try {
      const result = await registerFcmTokenFromUserAction(currentUserId);

      if (result.status === "registered") {
        setNotificationFeedback("Notifications enabled for this device.");
        return;
      }

      if (result.status === "permission-not-granted") {
        setNotificationFeedback("Notifications stayed off. You can enable them later from this device.");
        return;
      }

      setNotificationFeedback("Notifications are not available on this browser right now.");
    } catch {
      setNotificationFeedback("Notifications are not available on this browser right now.");
    } finally {
      setIsRegisteringNotifications(false);
    }
  };

  return {
    foregroundToast,
    setForegroundToast,
    isRegisteringNotifications,
    notificationFeedback,
    handleEnableNotifications,
  };
}
