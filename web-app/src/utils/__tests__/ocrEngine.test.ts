import { describe, it, expect } from "vitest";
import { sanitizeOcrText } from "../ocrEngine";

describe("Local OCR Engine & Privacy Guard (Rule S4 - Commit F1)", () => {
  it("sanitizes API keys and bearer tokens from extracted text before indexing", () => {
    const raw = "Authorization: Bearer secret_token_abc123456789012345678901234567890\npassword: MySuperSecretPassword123\nconst key = 'sk-proj-1234567890abcdef1234567890abcdef';";
    const sanitized = sanitizeOcrText(raw);

    expect(sanitized).not.toContain("secret_token_abc");
    expect(sanitized).not.toContain("MySuperSecretPassword123");
    expect(sanitized).toContain("[REDACTED_SECRET]");
  });

  it("preserves study and code content that does not match sensitive token patterns", () => {
    const normal = "function binarySearch(arr, target) { let left = 0; let right = arr.length - 1; }";
    const sanitized = sanitizeOcrText(normal);
    expect(sanitized).toBe(normal);
  });
});
