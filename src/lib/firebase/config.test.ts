import { describe, expect, it } from "vitest";
import { getFirebaseEnv, tryGetFirebaseEnv } from "@/lib/firebase/config";

describe("getFirebaseEnv", () => {
  it("throws when a required Firebase variable is missing", () => {
    expect(() =>
      getFirebaseEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: "",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-project",
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-project.appspot.com",
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:abcdef",
      }),
    ).toThrow("Missing Firebase environment variable: NEXT_PUBLIC_FIREBASE_API_KEY");
  });

  it("returns a typed Firebase config when all required variables exist", () => {
    expect(
      getFirebaseEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-project",
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-project.appspot.com",
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:abcdef",
      }),
    ).toEqual({
      apiKey: "api-key",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo-project.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef",
    });
  });

  it("returns null instead of throwing for optional runtime bootstrap", () => {
    expect(
      tryGetFirebaseEnv({
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo.firebaseapp.com",
      }),
    ).toBeNull();
  });
});
