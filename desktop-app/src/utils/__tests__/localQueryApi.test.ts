import { describe, it, expect } from "vitest";
const receiver = require("../../../electron-main/wakatime-receiver.js");

describe("Local Read-Only Query API (Rule S1, S2, S11 - Commit E5)", () => {
  it("exports receiver instance and query functions cleanly", () => {
    expect(receiver).toBeDefined();
    expect(typeof receiver.startReceiver).toBe("function");
    expect(typeof receiver.stopReceiver).toBe("function");
    expect(typeof receiver.getHeartbeatStats).toBe("function");
  });

  it("ensures default receiver port is 7777 and bound strictly to localhost", () => {
    expect(receiver.DEFAULT_PORT).toBe(7777);
    expect(receiver.HOST).toBe("127.0.0.1");
  });
});
