import { describe, expect, it } from "vitest";
import { resolveVerifyEmailParams } from "@/app/verify-email/page-params";

describe("resolveVerifyEmailParams", () => {
  it("keeps top-level verification params when they are already present", () => {
    expect(
      resolveVerifyEmailParams({
        mode: "verifyEmail",
        oobCode: "top-level-code",
      }),
    ).toEqual({
      mode: "verifyEmail",
      oobCode: "top-level-code",
    });
  });

  it("extracts verification params from a nested continueUrl", () => {
    expect(
      resolveVerifyEmailParams({
        continueUrl:
          "https://chat.example.com/verify-email?mode=verifyEmail&oobCode=nested-code",
      }),
    ).toEqual({
      mode: "verifyEmail",
      oobCode: "nested-code",
    });
  });

  it("extracts verification params from a nested Firebase link payload", () => {
    expect(
      resolveVerifyEmailParams({
        link: "https://project-id.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=link-code",
      }),
    ).toEqual({
      mode: "verifyEmail",
      oobCode: "link-code",
    });
  });
});
