import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("delivery docs", () => {
  it("includes all required Firebase variables in the env example", () => {
    const envExample = fs.readFileSync(
      path.resolve(process.cwd(), ".env.example"),
      "utf8",
    );

    expect(envExample).toContain("NEXT_PUBLIC_FIREBASE_API_KEY=");
    expect(envExample).toContain("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=");
    expect(envExample).toContain("NEXT_PUBLIC_FIREBASE_PROJECT_ID=");
    expect(envExample).toContain("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=");
    expect(envExample).toContain("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=");
    expect(envExample).toContain("NEXT_PUBLIC_FIREBASE_APP_ID=");
    expect(envExample).toContain("NEXT_PUBLIC_FIREBASE_VAPID_KEY=");
  });

  it("marks every required core feature in the checklist", () => {
    const checklist = fs.readFileSync(
      path.resolve(process.cwd(), "docs/feature-checklist.md"),
      "utf8",
    );

    expect(checklist).toContain("- [x] User registration");
    expect(checklist).toContain("- [x] User login");
    expect(checklist).toContain("- [x] User logout");
    expect(checklist).toContain("- [x] Direct 1-to-1 conversation creation/opening");
    expect(checklist).toContain("- [x] Firestore security rules");
  });

  it("includes a Firebase messaging service worker that preserves message metadata", () => {
    const worker = fs.readFileSync(
      path.resolve(process.cwd(), "public/firebase-messaging-sw.js"),
      "utf8",
    );

    expect(worker).toContain("firebase-app-compat.js");
    expect(worker).toContain("firebase-messaging-compat.js");
    expect(worker).toContain("messaging.onBackgroundMessage");
    expect(worker).toContain("conversationId");
    expect(worker).toContain("messageId");
    expect(worker).toContain("senderId");
  });

  it("documents Firebase Cloud Messaging setup and functions deployment", () => {
    const readme = fs.readFileSync(path.resolve(process.cwd(), "README.md"), "utf8");
    const deploymentGuide = fs.readFileSync(
      path.resolve(process.cwd(), "docs/deployment-guide.md"),
      "utf8",
    );

    expect(readme).toContain("NEXT_PUBLIC_FIREBASE_VAPID_KEY");
    expect(readme).toContain("Firebase Cloud Messaging");
    expect(deploymentGuide).toContain("NEXT_PUBLIC_FIREBASE_VAPID_KEY");
    expect(deploymentGuide).toContain("firebase deploy --only firestore,storage,functions");
  });
});
