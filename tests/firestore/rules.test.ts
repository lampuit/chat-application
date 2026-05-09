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
});
