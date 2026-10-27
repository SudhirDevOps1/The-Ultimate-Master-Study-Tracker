import { describe, it, expect } from "vitest";
import {
  encryptBackupData,
  decryptBackupData,
  validateBackupSchema,
} from "../backupEngine";

describe("Backup & Restore Engine (Rule S10)", () => {
  it("validates Dexie backup schema correctly", () => {
    const validJson = JSON.stringify({
      formatName: "dexie",
      formatVersion: 1,
      data: {
        databaseName: "FlowTrackDatabase",
        databaseVersion: 1,
        tables: [
          { name: "flashcards", schema: "++id,deckId" },
          { name: "studySessions", schema: "++id,date" },
        ],
        data: [],
      },
    });

    const res = validateBackupSchema(validJson);
    expect(res.valid).toBe(true);
    expect(res.tableCount).toBe(2);

    const invalid = validateBackupSchema('{"invalid": true}');
    expect(invalid.valid).toBe(false);
  });

  it("encrypts and decrypts backup payload round-trip with correct password", async () => {
    const secretData = JSON.stringify({ message: "Sensitive study statistics & notes", count: 42 });
    const password = "SuperSecretPassword123!";

    const encryptedEnvelope = await encryptBackupData(secretData, password);
    expect(encryptedEnvelope).toContain('"flowtrack_encrypted": true');
    expect(encryptedEnvelope).toContain('"algorithm": "AES-256-GCM"');
    expect(encryptedEnvelope).toContain('"iterations": 100000');

    const decrypted = await decryptBackupData(encryptedEnvelope, password);
    expect(decrypted).toBe(secretData);
  });

  it("fails decryption when an incorrect password is provided", async () => {
    const secretData = "Confidential study notes";
    const encrypted = await encryptBackupData(secretData, "RightPassword");

    await expect(decryptBackupData(encrypted, "WrongPassword")).rejects.toThrow();
  });
});
