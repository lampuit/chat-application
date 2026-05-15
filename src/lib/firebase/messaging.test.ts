import { describe, expect, it, vi } from "vitest";
import {
  initializeForegroundNotificationsForCurrentSession,
  registerFcmTokenFromUserAction,
} from "@/lib/firebase/messaging";
import { storeUserFcmToken } from "@/lib/firestore/users";

describe("registerFcmTokenFromUserAction", () => {
  it("exits safely when Firebase Messaging is unsupported", async () => {
    const requestPermission = vi.fn();

    const result = await registerFcmTokenFromUserAction("user-1", {
      windowObject: {},
      notificationApi: {
        requestPermission,
      },
      serviceWorkerApi: {
        register: vi.fn(),
      },
      isSupported: vi.fn().mockResolvedValue(false),
    });

    expect(result).toEqual({
      status: "unsupported",
    });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("exits safely when notification permission is not granted", async () => {
    const getToken = vi.fn();
    const persistUserToken = vi.fn();

    const result = await registerFcmTokenFromUserAction("user-1", {
      windowObject: {},
      notificationApi: {
        requestPermission: vi.fn().mockResolvedValue("denied"),
      },
      serviceWorkerApi: {
        register: vi.fn(),
      },
      isSupported: vi.fn().mockResolvedValue(true),
      getToken,
      persistUserToken,
    });

    expect(result).toEqual({
      status: "permission-not-granted",
      permission: "denied",
    });
    expect(getToken).not.toHaveBeenCalled();
    expect(persistUserToken).not.toHaveBeenCalled();
  });

  it("registers the service worker, requests a token, and persists it for granted permission", async () => {
    const originalEnv = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "demo-api-key";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "demo-auth-domain";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "demo-project-id";
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "demo-storage-bucket";
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "demo-sender-id";
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "demo-app-id";

    const serviceWorkerRegistration = { scope: "/" };
    const register = vi.fn().mockResolvedValue(serviceWorkerRegistration);
    const getMessaging = vi.fn().mockReturnValue("messaging-instance");
    const getToken = vi.fn().mockResolvedValue("token-123");
    const persistUserToken = vi.fn().mockResolvedValue(undefined);

    try {
      const result = await registerFcmTokenFromUserAction("user-1", {
        windowObject: {},
        notificationApi: {
          requestPermission: vi.fn().mockResolvedValue("granted"),
        },
        serviceWorkerApi: {
          register,
        },
        isSupported: vi.fn().mockResolvedValue(true),
        getFirebaseServices: vi.fn().mockReturnValue({
          app: "firebase-app",
        }),
        getFirebaseMessagingEnv: vi.fn().mockReturnValue({
          vapidKey: "demo-vapid-key",
        }),
        getMessaging,
        getToken,
        persistUserToken,
      });

      expect(register).toHaveBeenCalledTimes(1);

      const serviceWorkerUrl = register.mock.calls[0]?.[0];

      expect(typeof serviceWorkerUrl).toBe("string");

      const parsedUrl = new URL(String(serviceWorkerUrl), "https://example.test");

      expect(parsedUrl.pathname).toBe("/firebase-messaging-sw.js");
      expect(parsedUrl.searchParams.get("apiKey")).toBe("demo-api-key");
      expect(parsedUrl.searchParams.get("authDomain")).toBe("demo-auth-domain");
      expect(parsedUrl.searchParams.get("projectId")).toBe("demo-project-id");
      expect(parsedUrl.searchParams.get("storageBucket")).toBe("demo-storage-bucket");
      expect(parsedUrl.searchParams.get("messagingSenderId")).toBe("demo-sender-id");
      expect(parsedUrl.searchParams.get("appId")).toBe("demo-app-id");
      expect(getMessaging).toHaveBeenCalledWith("firebase-app");
      expect(getToken).toHaveBeenCalledWith("messaging-instance", {
        vapidKey: "demo-vapid-key",
        serviceWorkerRegistration,
      });
      expect(persistUserToken).toHaveBeenCalledWith("user-1", "token-123");
      expect(result).toEqual({
        status: "registered",
        token: "token-123",
      });
    } finally {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = originalEnv.NEXT_PUBLIC_FIREBASE_API_KEY;
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN =
        originalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = originalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
        originalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID =
        originalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = originalEnv.NEXT_PUBLIC_FIREBASE_APP_ID;
    }
  });
});

describe("initializeForegroundNotificationsForCurrentSession", () => {
  it("skips foreground initialization when permission is not granted", async () => {
    const getRegistration = vi.fn();
    const getFirebaseServices = vi.fn();

    const result = await initializeForegroundNotificationsForCurrentSession({
      windowObject: {},
      notificationApi: {
        permission: "default",
        requestPermission: vi.fn(),
      },
      serviceWorkerApi: {
        register: vi.fn(),
        getRegistration,
      },
      getFirebaseServices,
    });

    expect(result).toEqual({
      status: "permission-not-granted",
      permission: "default",
    });
    expect(getRegistration).not.toHaveBeenCalled();
    expect(getFirebaseServices).not.toHaveBeenCalled();
  });

  it("initializes foreground notifications when permission is already granted", async () => {
    const getRegistration = vi.fn().mockResolvedValue({
      showNotification: vi.fn(),
    });
    const getFirebaseServices = vi.fn().mockReturnValue({
      app: "firebase-app",
    });

    const result = await initializeForegroundNotificationsForCurrentSession({
      windowObject: {},
      notificationApi: {
        permission: "granted",
        requestPermission: vi.fn(),
      },
      serviceWorkerApi: {
        register: vi.fn(),
        getRegistration,
      },
      getFirebaseServices,
    });

    expect(result).toEqual({
      status: "initialized",
    });
    expect(getFirebaseServices).toHaveBeenCalledTimes(1);
  });
});

describe("storeUserFcmToken", () => {
  it("merges the token into the user document with arrayUnion and updates the timestamp", async () => {
    const doc = vi.fn().mockReturnValue("users/user-1");
    const setDoc = vi.fn().mockResolvedValue(undefined);
    const arrayUnion = vi.fn().mockReturnValue("array-union-token");
    const serverTimestamp = vi.fn().mockReturnValue("server-timestamp");

    await storeUserFcmToken("user-1", "token-123", {
      db: "db-instance",
      doc,
      setDoc,
      arrayUnion,
      serverTimestamp,
    });

    expect(doc).toHaveBeenCalledWith("db-instance", "users", "user-1");
    expect(arrayUnion).toHaveBeenCalledWith("token-123");
    expect(setDoc).toHaveBeenCalledWith(
      "users/user-1",
      {
        fcmTokens: "array-union-token",
        updatedAt: "server-timestamp",
      },
      { merge: true },
    );
  });
});
