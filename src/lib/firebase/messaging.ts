import { getFirebaseEnv, getFirebaseMessagingEnv } from "@/lib/firebase/config";
import { getFirebaseServices } from "@/lib/firebase/client";
import { storeUserFcmToken } from "@/lib/firestore/users";
import type { Messaging } from "firebase/messaging";
import type { FirebaseApp } from "firebase/app";

let foregroundHandlerSetup = false;
let activeMessagingServiceWorkerRegistration: ServiceWorkerRegistration | null = null;

export const FOREGROUND_MESSAGE_EVENT = "chat:foreground-message";

type NotificationApi = Pick<typeof Notification, "requestPermission" | "permission">;
type ServiceWorkerApi = Pick<ServiceWorkerContainer, "register" | "getRegistration">;

export type RegisterFcmTokenResult =
  | {
      status: "unsupported";
    }
  | {
      status: "permission-not-granted";
      permission: NotificationPermission;
    }
  | {
      status: "no-token";
    }
  | {
      status: "registered";
      token: string;
    };

export type RegisterFcmTokenDeps = {
  windowObject?: object;
  notificationApi?: NotificationApi;
  serviceWorkerApi?: ServiceWorkerApi;
  isSupported?: () => Promise<boolean>;
  getFirebaseServices?: typeof getFirebaseServices;
  getFirebaseMessagingEnv?: typeof getFirebaseMessagingEnv;
  getMessaging?: (app: unknown) => Messaging;
  getToken?: (
    messaging: Messaging,
    options: {
      vapidKey: string;
      serviceWorkerRegistration: ServiceWorkerRegistration;
    },
  ) => Promise<string | null>;
  persistUserToken?: (uid: string, token: string) => Promise<void>;
};

export type InitializeForegroundNotificationsResult =
  | {
      status: "unsupported";
    }
  | {
      status: "permission-not-granted";
      permission: NotificationPermission | "unavailable";
    }
  | {
      status: "initialized";
    };

async function getMessagingModule() {
  return import("firebase/messaging");
}

function getMessagingServiceWorkerUrl() {
  const firebaseConfig = getFirebaseEnv();
  const searchParams = new URLSearchParams(firebaseConfig);

  return `/firebase-messaging-sw.js?${searchParams.toString()}`;
}

function getDefaultWindowObject() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window;
}

function getDefaultNotificationApi() {
  if (typeof Notification === "undefined") {
    return undefined;
  }

  return Notification;
}

function getDefaultServiceWorkerApi() {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return navigator.serviceWorker;
}

export async function initializeForegroundNotificationsForCurrentSession(
  deps: Pick<
    RegisterFcmTokenDeps,
    "windowObject" | "notificationApi" | "serviceWorkerApi" | "getFirebaseServices"
  > = {},
): Promise<InitializeForegroundNotificationsResult> {
  const windowObject = deps.windowObject ?? getDefaultWindowObject();
  const notificationApi = deps.notificationApi ?? getDefaultNotificationApi();
  const serviceWorkerApi = deps.serviceWorkerApi ?? getDefaultServiceWorkerApi();

  if (!windowObject || !notificationApi || !serviceWorkerApi) {
    return {
      status: "unsupported",
    };
  }

  const permission = notificationApi.permission ?? "unavailable";

  if (permission !== "granted") {
    return {
      status: "permission-not-granted",
      permission,
    };
  }

  const services = deps.getFirebaseServices?.() ?? getFirebaseServices();

  if (!services) {
    return {
      status: "unsupported",
    };
  }

  try {
    activeMessagingServiceWorkerRegistration =
      activeMessagingServiceWorkerRegistration ??
      (await serviceWorkerApi.getRegistration()) ??
      null;
  } catch {
    // Ignore registration lookup issues and continue with in-app foreground handling.
  }

  await setupForegroundMessageHandler(services.app);

  return {
    status: "initialized",
  };
}

/**
 * Call this only from an explicit user action, such as clicking an "Enable notifications" button.
 */
export async function registerFcmTokenFromUserAction(
  uid: string,
  deps: RegisterFcmTokenDeps = {},
): Promise<RegisterFcmTokenResult> {
  const windowObject = deps.windowObject ?? getDefaultWindowObject();
  const notificationApi = deps.notificationApi ?? getDefaultNotificationApi();
  const serviceWorkerApi = deps.serviceWorkerApi ?? getDefaultServiceWorkerApi();

  if (!windowObject || !notificationApi || !serviceWorkerApi) {
    return {
      status: "unsupported",
    };
  }

  const messagingModule =
    deps.isSupported && deps.getMessaging && deps.getToken ? null : await getMessagingModule();
  const isSupported = deps.isSupported ?? messagingModule?.isSupported;

  if (!isSupported || !(await isSupported())) {
    return {
      status: "unsupported",
    };
  }

  const permission = await notificationApi.requestPermission();

  if (permission !== "granted") {
    return {
      status: "permission-not-granted",
      permission,
    };
  }

  const services = deps.getFirebaseServices?.() ?? getFirebaseServices();

  if (!services) {
    return {
      status: "unsupported",
    };
  }

  const serviceWorkerUrl = getMessagingServiceWorkerUrl();
  const serviceWorkerRegistration = await serviceWorkerApi.register(serviceWorkerUrl);
  activeMessagingServiceWorkerRegistration = serviceWorkerRegistration;
  const vapidKey = (deps.getFirebaseMessagingEnv?.() ?? getFirebaseMessagingEnv()).vapidKey;
  const getMessaging = deps.getMessaging ?? messagingModule?.getMessaging;
  const getToken = deps.getToken ?? messagingModule?.getToken;

  if (!getMessaging || !getToken) {
    return {
      status: "unsupported",
    };
  }

  const messaging = getMessaging(services.app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  if (!token) {
    return {
      status: "no-token",
    };
  }

  await (deps.persistUserToken ?? storeUserFcmToken)(uid, token);

  // Setup foreground message handler (notifications when app is open)
  await setupForegroundMessageHandler(services.app);

  return {
    status: "registered",
    token,
  };
}

/**
 * Setup handler for foreground messages (when app is open)
 */
async function setupForegroundMessageHandler(firebaseApp: unknown) {
  if (foregroundHandlerSetup) {
    return;
  }

  try {
    const { getMessaging, isSupported, onMessage } = await import("firebase/messaging");

    if (!(await isSupported())) {
      return;
    }

    const messaging = getMessaging(firebaseApp as FirebaseApp);

    onMessage(messaging, (payload) => {
      const notification = payload.notification ?? {};
      const data = payload.data ?? {};
      const title = notification.title ?? data.title ?? "New message";
      const body = notification.body ?? data.body ?? "";
      window.dispatchEvent(
        new CustomEvent(FOREGROUND_MESSAGE_EVENT, {
          detail: {
            title,
            body,
            conversationId: data.conversationId ?? null,
            messageId: data.messageId ?? null,
            senderId: data.senderId ?? null,
          },
        }),
      );

      // Show notification in the foreground
      if ("Notification" in window && Notification.permission === "granted") {
        const notificationOptions = {
          body,
          icon: notification.icon ?? data.icon,
          image: notification.image ?? data.image,
          tag: data.conversationId ?? "default",
          data: {
            conversationId: data.conversationId ?? null,
            messageId: data.messageId ?? null,
            senderId: data.senderId ?? null,
          },
        };

        if (activeMessagingServiceWorkerRegistration?.showNotification) {
          void activeMessagingServiceWorkerRegistration.showNotification(
            title,
            notificationOptions,
          );
          return;
        }

        new Notification(title, notificationOptions);
      }
    });

    foregroundHandlerSetup = true;
  } catch {
    // Foreground messaging is optional; fail silently if the browser/runtime rejects setup.
  }
}
