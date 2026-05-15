import { getFirebaseEnv, getFirebaseMessagingEnv } from "@/lib/firebase/config";
import { getFirebaseServices } from "@/lib/firebase/client";
import { storeUserFcmToken } from "@/lib/firestore/users";
import type { Messaging } from "firebase/messaging";

type NotificationApi = Pick<typeof Notification, "requestPermission">;
type ServiceWorkerApi = Pick<ServiceWorkerContainer, "register">;

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

  const serviceWorkerRegistration = await serviceWorkerApi.register(
    getMessagingServiceWorkerUrl(),
  );
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

  return {
    status: "registered",
    token,
  };
}
