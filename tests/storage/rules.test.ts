import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rulesPath = path.resolve(process.cwd(), "storage.rules");
const rules = fs.readFileSync(rulesPath, "utf8");

describe("storage rules", () => {
  it("limits conversation uploads to 1 MB", () => {
    expect(rules).toContain("request.resource.size < 1 * 1024 * 1024");
  });

  it("only allows image uploads for conversation files", () => {
    expect(rules).not.toContain("request.resource.contentType.matches('image/.*')");
  });
});
