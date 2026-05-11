import { describe, expect, it } from "vitest";
import {
  MAX_CHAT_UPLOAD_BYTES,
  validateChatUpload,
} from "@/lib/chat/upload-constraints";

describe("upload constraints", () => {
  it("rejects files larger than 1 MB", () => {
    expect(
      validateChatUpload({
        size: MAX_CHAT_UPLOAD_BYTES + 1,
        type: "image/jpeg",
      }),
    ).toBe("Files must be 1 MB or smaller.");
  });

  it("accepts non-image files within the size limit", () => {
    expect(
      validateChatUpload({
        size: 128,
        type: "application/pdf",
      }),
    ).toBeNull();
  });

  it("accepts image files up to 1 MB", () => {
    expect(
      validateChatUpload({
        size: MAX_CHAT_UPLOAD_BYTES,
        type: "image/png",
      }),
    ).toBeNull();
  });
});
