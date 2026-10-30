// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import path from "path";
import fs from "fs";
import os from "os";

const receiver = require("../../../electron-main/wakatime-receiver.js");

function postHeartbeat(port: number, payload: any, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: "/api/v1/users/current/heartbeats?api_key=00000000-0000-4000-8000-000000000000",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Host: `127.0.0.1:${port}`,
        ...headers,
      },
    }, (res) => {
      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => {
        resolve({ status: res.statusCode || 0, body });
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

describe("WakaTime Receiver Correctness (Part F / F4)", () => {
  let tempDir: string;
  let serverPort: number;

  beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `wakatime-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Start on ephemeral port (port 0)
    await receiver.startReceiver(tempDir, 0);
    serverPort = receiver.getActivePort();
  });

  afterAll(async () => {
    await receiver.stopReceiver();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("starts on dynamic port and is bound to 127.0.0.1", () => {
    expect(serverPort).toBeGreaterThan(0);
    const status = receiver.getStatus();
    expect(status.isRunning).toBe(true);
    expect(status.port).toBe(serverPort);
  });

  it("accepts valid JSON heartbeat and responds with 201 created", async () => {
    const payload = {
      entity: "D:/workspace/src/App.tsx",
      type: "file",
      time: Math.floor(Date.now() / 1000),
      project: "FlowTrackPro",
      branch: "main",
      language: "TypeScript",
      category: "coding",
      is_write: true,
    };

    const res = await postHeartbeat(serverPort, payload);
    expect(res.status).toBe(201);

    const todayHeartbeats = receiver.getDayHeartbeats();
    expect(todayHeartbeats.length).toBeGreaterThanOrEqual(1);
    expect(todayHeartbeats.some((h: any) => h.entity.includes("App.tsx"))).toBe(true);
  });

  it("rejects requests with foreign Origin with 403 Forbidden", async () => {
    const payload = { entity: "test.ts" };
    const res = await postHeartbeat(serverPort, payload, { Origin: "http://evil-attacker.com" });
    expect(res.status).toBe(403);
  });

  it("rejects requests with non-JSON Content-Type with 415 Unsupported Media Type", async () => {
    const res = await new Promise<{ status: number }>((resolve, reject) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: serverPort,
        path: "/api/v1/users/current/heartbeats?api_key=00000000-0000-4000-8000-000000000000",
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Host: `127.0.0.1:${serverPort}`,
        },
      }, (r) => {
        resolve({ status: r.statusCode || 0 });
      });
      req.on("error", reject);
      req.write("plain text");
      req.end();
    });

    expect(res.status).toBe(415);
  });

  it("stats duration is 0 for an isolated single heartbeat", () => {
    const singleHeartbeat = [
      {
        entity: "D:/repo/main.py",
        time: 1700000000,
        project: "PythonProject",
        language: "Python",
        editor: "VS Code",
      },
    ];

    const stats = receiver.getHeartbeatStats(undefined, singleHeartbeat);
    expect(stats.totalSeconds).toBe(0);
    expect(stats.byLanguage.Python).toBe(0);
  });

  it("stats duration accurately calculates interval capped at 120s for subsequent pulses", () => {
    const pulses = [
      { entity: "main.py", time: 1700000000, project: "Proj", language: "Python", editor: "VS Code" },
      { entity: "main.py", time: 1700000045, project: "Proj", language: "Python", editor: "VS Code" }, // +45s
      { entity: "main.py", time: 1700000100, project: "Proj", language: "Python", editor: "VS Code" }, // +55s
    ];

    const stats = receiver.getHeartbeatStats(undefined, pulses);
    // 0: gapToNext = 45s; 1: gapFromPrev = 45s; 2: gapFromPrev = 55s
    expect(stats.totalSeconds).toBe(145);
    expect(stats.byLanguage.Python).toBe(145);
  });

  it("excludes diagnostic pulses from statistics and allows purging them", () => {
    const withDiag = [
      { entity: "main.py", time: 1700000000, project: "Proj", language: "Python", editor: "VS Code" },
      { entity: "main.py", time: 1700000030, project: "Proj", language: "Python", editor: "VS Code" },
      { entity: "test.ts", time: 1700000060, project: "FlowTrack Pro Workspace", language: "TypeScript", editor: "VS Code (Simulated)", isDiagnostic: true },
    ];

    const stats = receiver.getHeartbeatStats(undefined, withDiag);
    expect(stats.byProject["FlowTrack Pro Workspace"]).toBeUndefined();
    expect(stats.byLanguage["TypeScript"]).toBeUndefined();

    const purgeRes = receiver.purgeDiagnosticHeartbeats();
    expect(purgeRes.success).toBe(true);
  });

  it("clearHeartbeats with scope 'today' unlinks today's file and preserves other days", () => {
    // Write a dummy historical day file
    const histDate = "2026-01-01";
    const histFile = path.join(tempDir, `${histDate}.json`);
    fs.writeFileSync(histFile, JSON.stringify([{ entity: "old.ts", time: 1600000000 }]), "utf8");

    const clearRes = receiver.clearHeartbeats({ scope: "today" });
    expect(clearRes.scope).toBe("today");
    expect(fs.existsSync(histFile)).toBe(true); // Historical preserved!
  });
});
