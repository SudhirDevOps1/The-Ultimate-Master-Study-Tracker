// @vitest-environment node
import { describe, it, expect } from "vitest";
const receiver = require("../../../electron-main/wakatime-receiver.js");

describe("Local Read-Only Query API (Part H / F6 - Real WakaTime Integration)", () => {
  it("exports receiver instance and query functions cleanly", () => {
    expect(receiver).toBeDefined();
    expect(typeof receiver.startReceiver).toBe("function");
    expect(typeof receiver.stopReceiver).toBe("function");
    expect(typeof receiver.getHeartbeatStats).toBe("function");
    expect(typeof receiver.getDayHeartbeats).toBe("function");
    expect(typeof receiver.getStatus).toBe("function");
    expect(typeof receiver.getActivePort).toBe("function");
  });

  it("ensures default receiver port is 7777 and bound strictly to localhost", () => {
    expect(receiver.DEFAULT_PORT).toBe(7777);
    expect(receiver.HOST).toBe("127.0.0.1");
  });

  it("queries non-existent date and returns empty array without throwing", () => {
    const records = receiver.getDayHeartbeats("1999-01-01");
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBe(0);
  });

  it("returns zeroed statistics for an empty date", () => {
    const stats = receiver.getHeartbeatStats("1999-01-01");
    expect(stats.totalSeconds).toBe(0);
    expect(Object.keys(stats.byProject).length).toBe(0);
    expect(stats.topFiles.length).toBe(0);
  });
});
