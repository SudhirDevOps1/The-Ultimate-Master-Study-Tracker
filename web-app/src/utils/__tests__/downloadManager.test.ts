import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
const isDesktop = fs.existsSync(path.resolve(__dirname, "../../../electron-main"));
const { DANGEROUS_EXTENSIONS } = isDesktop ? require("../../../electron-main/download-manager.js") : { DANGEROUS_EXTENSIONS: new Set() };

describe.skipIf(!isDesktop)("Download Manager & Security Guard (Rule S16)", () => {
  it("includes all critical executable and script extensions in DANGEROUS_EXTENSIONS", () => {
    const dangerous = [".exe", ".bat", ".cmd", ".msi", ".ps1", ".vbs", ".scr", ".com", ".jar"];
    for (const ext of dangerous) {
      expect(DANGEROUS_EXTENSIONS.has(ext)).toBe(true);
    }
  });

  it("permits safe study file extensions without triggering executable warnings", () => {
    const safe = [".pdf", ".png", ".jpg", ".epub", ".txt", ".json", ".csv", ".mp4", ".zip"];
    for (const ext of safe) {
      expect(DANGEROUS_EXTENSIONS.has(ext)).toBe(false);
    }
  });
});
