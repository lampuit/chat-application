import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rulesPath = path.resolve(process.cwd(), "firestore.rules");
const rules = fs.readFileSync(rulesPath, "utf8");

describe("firestore rules", () => {
  it("restricts conversation reads to members", () => {
    expect(rules).toContain("allow read: if isConversationMember();");
  });

  it("requires direct conversations to include the authenticated user", () => {
    expect(rules).toContain("request.auth.uid in request.resource.data.memberIds");
    expect(rules).toContain('request.resource.data.type == "direct"');
  });

  it("allows group conversations only when the creator is the owner and a member", () => {
    expect(rules).toContain('request.resource.data.type == "group"');
    expect(rules).toContain("request.resource.data.ownerId == request.auth.uid");
    expect(rules).toContain("request.resource.data.name is string");
    expect(rules).toContain("request.resource.data.name.size() > 0");
  });

  it("requires messages to match the authenticated sender and conversation", () => {
    expect(rules).toContain("request.resource.data.senderId == request.auth.uid");
    expect(rules).toContain(
      "request.resource.data.conversationId == conversationId",
    );
  });

  it("checks conversation membership from the parent conversation for message access", () => {
    expect(rules).toContain(
      "get(/databases/$(database)/documents/conversations/$(conversationId)).data.memberIds",
    );
  });

  it("allows self-managed user profile updates only for known document keys including fcmTokens", () => {
    expect(rules).toContain("function allowedUserDocumentKeys()");
    expect(rules).toContain('"uid"');
    expect(rules).toContain('"email"');
    expect(rules).toContain('"displayName"');
    expect(rules).toContain('"photoURL"');
    expect(rules).toContain('"createdAt"');
    expect(rules).toContain('"updatedAt"');
    expect(rules).toContain('"lastSeenAt"');
    expect(rules).toContain('"fcmTokens"');
  });

  it("prevents arbitrary self-update field injection on user documents", () => {
    expect(rules).toContain("function isSafeUserSelfUpdate()");
    expect(rules).toContain("request.resource.data.uid == userId");
    expect(rules).toContain("request.resource.data.keys().hasOnly(allowedUserDocumentKeys())");
    expect(rules).toContain(
      "request.resource.data.diff(resource.data).affectedKeys().hasOnly(allowedUserDocumentKeys())",
    );
    expect(rules).toContain("allow update: if isSignedIn() && request.auth.uid == userId && isSafeUserSelfUpdate();");
  });
});
