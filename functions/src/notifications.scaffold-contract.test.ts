import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testFilePath = fileURLToPath(import.meta.url);
const srcDir = path.dirname(testFilePath);
const functionsDir = path.resolve(srcDir, "..");
const repoRoot = path.resolve(functionsDir, "..");

function readFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("Firebase Functions notifications scaffold", () => {
  it("creates the Task 6 workspace contract for message notifications", () => {
    const firebaseConfig = JSON.parse(readFile("firebase.json"));
    const functionsPackageJson = JSON.parse(readFile("functions/package.json"));
    const functionsTsconfig = readFile("functions/tsconfig.json");
    const functionsGitignore = readFile("functions/.gitignore");
    const indexSource = readFile("functions/src/index.ts");
    const notificationsSource = readFile("functions/src/notifications.ts");

    expect(firebaseConfig.functions).toEqual(
      expect.objectContaining({
        source: "functions",
      }),
    );

    expect(functionsPackageJson).toEqual(
      expect.objectContaining({
        name: "functions",
        private: true,
        main: "lib/index.js",
      }),
    );
    expect(functionsPackageJson.dependencies).toEqual(
      expect.objectContaining({
        "firebase-admin": expect.any(String),
        "firebase-functions": expect.any(String),
      }),
    );

    expect(functionsTsconfig).toContain('"outDir": "lib"');
    expect(functionsTsconfig).toContain('"rootDir": "src"');
    expect(functionsGitignore).toContain("lib");

    expect(indexSource).toContain(
      'export { notifyOnMessageCreated } from "./notifications";',
    );

    expect(notificationsSource).toContain(
      "conversations/{conversationId}/messages/{messageId}",
    );
    expect(notificationsSource).toContain("onDocumentCreated(");
    expect(notificationsSource).toContain("notifyOnMessageCreated");
    expect(notificationsSource).toContain("processMessageCreated");
    expect(notificationsSource).toContain('from "firebase-admin"');
    expect(notificationsSource).toContain("admin.apps.length === 0");
    expect(notificationsSource).toContain("admin.initializeApp()");
    expect(notificationsSource).toContain("admin.app()");
  });
});
