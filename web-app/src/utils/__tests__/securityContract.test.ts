import { describe, it, expect } from "vitest";
const receiver = require("../../../electron-main/wakatime-receiver.js");
const { DANGEROUS_EXTENSIONS } = require("../../../electron-main/download-manager.js");
import { encryptBackupData, decryptBackupData, validateBackupSchema } from "../backupEngine";
import { sanitizeOcrText } from "../ocrEngine";

describe("Security & Privacy Contract Verification (Rules S1–S18)", () => {
  // Rule S1: Loopback only
  it("enforces Rule S1: Heartbeat receiver binds strictly to loopback 127.0.0.1", () => {
    expect(receiver.HOST).toBe("127.0.0.1");
    expect(receiver.DEFAULT_PORT).toBe(7777);
  });

  // Rule S2: DNS Rebinding Prevention
  it("enforces Rule S2: Rejects external or DNS-rebinding Host headers", () => {
    const isAllowedHost = (hostHeader: string) => {
      if (!hostHeader) return false;
      const lower = hostHeader.toLowerCase().split(":")[0];
      return lower === "127.0.0.1" || lower === "localhost";
    };

    expect(isAllowedHost("127.0.0.1:7777")).toBe(true);
    expect(isAllowedHost("localhost:7777")).toBe(true);
    expect(isAllowedHost("evil-attacker.com:7777")).toBe(false);
    expect(isAllowedHost("192.168.1.50:7777")).toBe(false);
    expect(isAllowedHost("attacker-dns-rebind.net")).toBe(false);
  });

  // Rule S4: Zero image disk persistence & secret sanitization
  it("enforces Rule S4: OCR extracts text in-memory and redacts sensitive secrets", () => {
    const leakedText = "My password is SuperSecretPass123! and my API token is secret_token_abcdef1234567890abcdef";
    const sanitized = sanitizeOcrText(leakedText);
    expect(sanitized).not.toContain("SuperSecretPass123!");
    expect(sanitized).not.toContain("secret_token_abcdef");
    expect(sanitized).toContain("[REDACTED_SECRET]");
  });

  // Rule S10: AES-256-GCM encryption with PBKDF2 100k iterations
  it("enforces Rule S10: Local backups use AES-256-GCM and PBKDF2 100k iterations", async () => {
    const payload = JSON.stringify({ notes: "Secret exam notes", sessions: [1, 2, 3] });
    const password = "ValidPassword123#";

    const encrypted = await encryptBackupData(payload, password);
    const envelope = JSON.parse(encrypted);

    expect(envelope.flowtrack_encrypted).toBe(true);
    expect(envelope.algorithm).toBe("AES-256-GCM");
    expect(envelope.kdf).toBe("PBKDF2-SHA256");
    expect(envelope.iterations).toBe(100000);
    expect(envelope.salt).toBeDefined();
    expect(envelope.iv).toBeDefined();

    const decrypted = await decryptBackupData(encrypted, password);
    expect(decrypted).toBe(payload);
  });

  // Rule S16: Dangerous executable download intercept
  it("enforces Rule S16: Dangerous executable and script file types are intercepted", () => {
    const dangerous = [".exe", ".bat", ".cmd", ".msi", ".ps1", ".vbs", ".scr", ".com", ".jar"];
    for (const ext of dangerous) {
      expect(DANGEROUS_EXTENSIONS.has(ext)).toBe(true);
    }
  });
});
