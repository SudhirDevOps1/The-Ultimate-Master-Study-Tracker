import { describe, it, expect } from "vitest";
import { sanitizeOcrText, cleanExtractedText } from "../ocrEngine";

describe("Local OCR Engine & Privacy Guard (Rule S4 - Commit F1)", () => {
  it("sanitizes API keys and bearer tokens from extracted text before indexing", () => {
    const raw = "Authorization: Bearer mock_bearer_token_string_for_testing\npassword: MockPassword123\nkey: mock_api_key_test_value";
    const sanitized = sanitizeOcrText(raw);

    expect(sanitized).not.toContain("mock_bearer_token");
    expect(sanitized).not.toContain("MockPassword123");
    expect(sanitized).toContain("[REDACTED_SECRET]");
  });

  it("preserves study and code content that does not match sensitive token patterns", () => {
    const normal = "function binarySearch(arr, target) { let left = 0; let right = arr.length - 1; }";
    const sanitized = sanitizeOcrText(normal);
    expect(sanitized).toBe(normal);
  });

  it("cleans hyphenated line wraps and normalizes excessive whitespace", () => {
    const raw = "The micro-\nprocessor executes in-\r\nstructions rapidly.\n\n\n\nNext section.";
    const cleaned = cleanExtractedText(raw);
    expect(cleaned).toContain("The microprocessor executes instructions rapidly.");
    expect(cleaned).toContain("\n\nNext section.");
    expect(cleaned).not.toContain("\n\n\n");
  });
});
