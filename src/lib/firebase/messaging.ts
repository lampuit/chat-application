import { getFirebaseMessagingEnv } from "@/lib/firebase/config";
import { getFirebaseServices } from "@/lib/firebase/client";
import { storeUserFcmToken } from "@/lib/firestore/users";
import type { Messaging } from "firebase/messaging";
import type { FirebaseApp } from "firebase/app";
import {
  FOREGROUND_MESSAGE_EVENT,
  NOTIFICATION_CLICK_EVENT,
  getDefaultWindowObject,
  getDefaultNotificationApi,
  getDefaultServiceWorkerApi,
  setupServiceWorkerMessageBridge,
  getMessagingServiceWorkerUrl,
  dispatchForegroundMessage,
  type NotificationApi,
  type ServiceWorkerApi,
} from "./messaging-utils";

let foregroundHandlerSetup = false;
let activeMessagingServiceWorkerRegistration: ServiceWorkerRegistration | null = null;

export { FOREGROUND_MESSAGE_EVENT, NOTIFICATION_CLICK_EVENT };

export type RegisterFcmTokenResult =
  | { status: "unsupported" }
  | { status: "permission-not-granted"; permission: NotificationPermission }
  | { status: "no-token" }
  | { status: "registered"; token: string };

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
    options: { vapidKey: string; serviceWorkerRegistration: ServiceWorkerRegistration },
  ) => Promise<string | null>;
  persistUserToken?: (uid: string, token: string) => Promise<void>;
};

export type InitializeForegroundNotificationsResult =
  | { status: "unsupported" }
  | { status: "permission-not-granted"; permission: NotificationPermission | "unavailable" }
  | { status: "initialized" };

async function getMessagingModule() {
  return import("firebase/messaging");
}

async function setupForegroundMessageHandler(firebaseApp: unknown) {
  if (foregroundHandlerSetup) return;
  try {
    const { getMessaging, isSupported, onMessage } = await getMessagingModule();
    if (!(await isSupported())) return;
    const messaging = getMessaging(firebaseApp as FirebaseApp);
    onMessage(messaging, (payload) => {
      const notification = payload.notification ?? {};
      const data = payload.data ?? {};
      dispatchForegroundMessage({
        title: notification.title ?? data.title ?? "New message",
        body: notification.body ?? data.body ?? "",
        conversationId: data.conversationId ?? null,
        messageId: data.messageId ?? null,
        senderId: data.senderId ?? null,
      });
      if ("Notification" in window && Notification.permission === "granted") {
        const title = notification.title ?? data.title ?? "New message";
        const notifyOpts = {
          body: notification.body ?? data.body ?? "",
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
          void activeMessagingServiceWorkerRegistration.showNotification(title, notifyOpts);
          return;
        }
        new Notification(title, notifyOpts);
      }
    });
    foregroundHandlerSetup = true;
  } catch {
    // Foreground messaging is optional; fail silently if the browser/runtime rejects setup.
  }
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
  if (!windowObject || !notificationApi || !serviceWorkerApi) return { status: "unsupported" };
  setupServiceWorkerMessageBridge(serviceWorkerApi);
  const permission = notificationApi.permission ?? "unavailable";
  if (permission !== "granted") return { status: "permission-not-granted", permission };
  const services = deps.getFirebaseServices?.() ?? getFirebaseServices();
  if (!services) return { status: "unsupported" };
  try {
    activeMessagingServiceWorkerRegistration =
      activeMessagingServiceWorkerRegistration ?? (await serviceWorkerApi.getRegistration()) ?? null;
  } catch {
    // Ignore registration lookup issues
  }
  await setupForegroundMessageHandler(services.app);
  return { status: "initialized" };
}

export async function registerFcmTokenFromUserAction(
  uid: string,
  deps: RegisterFcmTokenDeps = {},
): Promise<RegisterFcmTokenResult> {
  const windowObject = deps.windowObject ?? getDefaultWindowObject();
  const notificationApi = deps.notificationApi ?? getDefaultNotificationApi();
  const serviceWorkerApi = deps.serviceWorkerApi ?? getDefaultServiceWorkerApi();
  if (!windowObject || !notificationApi || !serviceWorkerApi) return { status: "unsupported" };
  setupServiceWorkerMessageBridge(serviceWorkerApi);
  const messagingModule =
    deps.isSupported && deps.getMessaging && deps.getToken ? null : await getMessagingModule();
  const isSupported = deps.isSupported ?? messagingModule?.isSupported;
  if (!isSupported || !(await isSupported())) return { status: "unsupported" };
  const permission = await notificationApi.requestPermission();
  if (permission !== "granted") return { status: "permission-not-granted", permission };
  const services = deps.getFirebaseServices?.() ?? getFirebaseServices();
  if (!services) return { status: "unsupported" };
  const serviceWorkerUrl = getMessagingServiceWorkerUrl();
  const serviceWorkerRegistration = await serviceWorkerApi.register(serviceWorkerUrl);
  activeMessagingServiceWorkerRegistration = serviceWorkerRegistration;
  const vapidKey = (deps.getFirebaseMessagingEnv?.() ?? getFirebaseMessagingEnv()).vapidKey;
  const getMessaging = deps.getMessaging ?? messagingModule?.getMessaging;
  const getToken = deps.getToken ?? messagingModule?.getToken;
  if (!getMessaging || !getToken) return { status: "unsupported" };
  const messaging = getMessaging(services.app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  if (!token) return { status: "no-token" };
  await (deps.persistUserToken ?? storeUserFcmToken)(uid, token);
  await setupForegroundMessageHandler(services.app);
  return { status: "registered", token };
}
