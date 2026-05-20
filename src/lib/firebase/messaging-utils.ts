import { getFirebaseEnv } from "@/lib/firebase/config";

export const FOREGROUND_MESSAGE_EVENT = "chat:foreground-message";
export const NOTIFICATION_CLICK_EVENT = "chat:notification-click";

export type ServiceWorkerMessagePayload = {
  type?: string;
  detail?: {
    title?: string;
    body?: string;
    conversationId?: string | null;
    messageId?: string | null;
    senderId?: string | null;
  };
};

let serviceWorkerBridgeSetup = false;

export function getMessagingServiceWorkerUrl() {
  const firebaseConfig = getFirebaseEnv();
  const searchParams = new URLSearchParams(firebaseConfig);
  return `/firebase-messaging-sw.js?${searchParams.toString()}`;
}

export function getDefaultWindowObject() {
  return typeof window !== "undefined" ? window : undefined;
}

export function getDefaultNotificationApi() {
  return typeof Notification !== "undefined" ? Notification : undefined;
}

export function getDefaultServiceWorkerApi() {
  return typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
}

export function dispatchForegroundMessage(detail: ServiceWorkerMessagePayload["detail"]) {
  if (typeof window === "undefined") return;
  
  window.dispatchEvent(
    new CustomEvent(FOREGROUND_MESSAGE_EVENT, {
      detail: {
        title: detail?.title ?? "New message",
        body: detail?.body ?? "",
        conversationId: detail?.conversationId ?? null,
        messageId: detail?.messageId ?? null,
        senderId: detail?.senderId ?? null,
      },
    }),
  );
}

export function dispatchNotificationClick(detail: ServiceWorkerMessagePayload["detail"]) {
  if (typeof window === "undefined") return;
  
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_CLICK_EVENT, {
      detail: {
        conversationId: detail?.conversationId ?? null,
        messageId: detail?.messageId ?? null,
        senderId: detail?.senderId ?? null,
      },
    }),
  );
}

export type NotificationApi = Pick<typeof Notification, "requestPermission" | "permission">;
export type ServiceWorkerApi = Pick<
  ServiceWorkerContainer,
  "register" | "getRegistration" | "addEventListener"
>;

export function setupServiceWorkerMessageBridge(serviceWorkerApi: ServiceWorkerApi) {
  if (serviceWorkerBridgeSetup) {
    return;
  }

  serviceWorkerApi.addEventListener?.("message", (event: MessageEvent<ServiceWorkerMessagePayload>) => {
    const payload = event.data;
    if (!payload?.type) return;

    if (payload.type === "chat-background-message") {
      dispatchForegroundMessage(payload.detail);
      return;
    }

    if (payload.type === "chat-notification-click") {
      dispatchNotificationClick(payload.detail);
    }
  });

  serviceWorkerBridgeSetup = true;
}
