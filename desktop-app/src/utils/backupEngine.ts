import { exportDB, importInto } from "dexie-export-import";
import { db } from "@/lib/db";

export interface EncryptedBackupEnvelope {
  flowtrack_encrypted: true;
  version: number;
  algorithm: "AES-256-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

// Helper: array buffer <-> hex
function bufToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Helper: array buffer <-> base64
function bufToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives an AES-GCM 256-bit CryptoKey using PBKDF2 with 100,000 iterations.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts arbitrary text using AES-256-GCM and a user-provided passphrase.
 */
export async function encryptBackupData(plainText: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const encodedPlain = enc.encode(plainText);

  const cipherBuf = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encodedPlain
  );

  const envelope: EncryptedBackupEnvelope = {
    flowtrack_encrypted: true,
    version: 1,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 100000,
    salt: bufToHex(salt.buffer),
    iv: bufToHex(iv.buffer),
    ciphertext: bufToBase64(cipherBuf),
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Decrypts an AES-256-GCM encrypted backup payload.
 */
export async function decryptBackupData(envelopeJson: string, password: string): Promise<string> {
  const parsed = JSON.parse(envelopeJson);
  if (!parsed.flowtrack_encrypted || parsed.algorithm !== "AES-256-GCM") {
    throw new Error("Invalid or unsupported encrypted backup format.");
  }

  const salt = hexToBuf(parsed.salt);
  const iv = hexToBuf(parsed.iv);
  const cipherBytes = base64ToBuf(parsed.ciphertext);

  const key = await deriveKey(password, salt);

  const plainBuf = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    key,
    cipherBytes as any
  );

  const dec = new TextDecoder();
  return dec.decode(plainBuf);
}

/**
 * Validates the schema of a FlowTrack Dexie backup.
 */
export function validateBackupSchema(jsonStr: string): { valid: boolean; tableCount: number; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== "object") {
      return { valid: false, tableCount: 0, error: "Backup file is not a valid JSON object." };
    }

    if (!data.data || !Array.isArray(data.data.tables)) {
      return { valid: false, tableCount: 0, error: "Missing Dexie table manifest in backup file." };
    }

    const tableNames: string[] = data.data.tables.map((t: any) => t.name);
    return { valid: true, tableCount: tableNames.length };
  } catch (err: any) {
    return { valid: false, tableCount: 0, error: err?.message || "Invalid JSON format." };
  }
}

/**
 * Exports the live local Dexie database to a downloadable JSON or encrypted JSON blob.
 */
export async function exportLocalDatabase(password?: string): Promise<{ blob: Blob; filename: string }> {
  const rawBlob = await exportDB(db, { prettyJson: true });
  const rawText = await rawBlob.text();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  if (password && password.trim().length > 0) {
    const encrypted = await encryptBackupData(rawText, password.trim());
    const blob = new Blob([encrypted], { type: "application/json" });
    return { blob, filename: `flowtrack-backup-${timestamp}.enc.json` };
  }

  return { blob: rawBlob, filename: `flowtrack-backup-${timestamp}.json` };
}

/**
 * Imports a JSON or encrypted JSON backup into the local Dexie database.
 */
export async function importLocalDatabase(fileText: string, password?: string): Promise<{ success: boolean; tableCount: number; message: string }> {
  let jsonText = fileText.trim();

  // If encrypted, decrypt first
  if (jsonText.includes('"flowtrack_encrypted": true') || jsonText.includes('"flowtrack_encrypted":true')) {
    if (!password || password.trim().length === 0) {
      throw new Error("Password required to decrypt this encrypted backup file.");
    }
    jsonText = await decryptBackupData(jsonText, password.trim());
  }

  // Validate schema
  const validation = validateBackupSchema(jsonText);
  if (!validation.valid) {
    throw new Error(validation.error || "Backup failed schema validation.");
  }

  const importBlob = new Blob([jsonText], { type: "application/json" });
  await importInto(db, importBlob, {
    clearTablesBeforeImport: true,
    overwriteValues: true,
    acceptMissingTables: true,
    acceptNameDiff: true,
  });

  return {
    success: true,
    tableCount: validation.tableCount,
    message: `Database successfully restored (${validation.tableCount} tables restored).`,
  };
}
