import { describe, expect, it } from "vitest";
import { buildDirectMemberKey } from "@/lib/chat/member-key";

describe("buildDirectMemberKey", () => {
  it("sorts user IDs so direct conversations are deterministic", () => {
    expect(buildDirectMemberKey("user-b", "user-a")).toBe("user-a_user-b");
  });
});
