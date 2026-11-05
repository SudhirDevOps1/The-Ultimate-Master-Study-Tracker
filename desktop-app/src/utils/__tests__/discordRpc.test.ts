import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
const isDesktop = fs.existsSync(path.resolve(__dirname, "../../../electron-main"));
const { DiscordRpcClient } = isDesktop ? require("../../../electron-main/discord-rpc.js") : { DiscordRpcClient: null };

describe.skipIf(!isDesktop)("Discord Rich Presence (RPC) Client (Rule S11 / Pillar 2)", () => {
  let client: any;

  beforeEach(() => {
    client = new DiscordRpcClient();
  });

  afterEach(() => {
    client.disconnect();
    vi.restoreAllMocks();
  });

  it("determines correct OS IPC named pipe path on Windows", () => {
    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      const pipePath = client.getIpcPath(0);
      expect(pipePath).toBe("\\\\.\\pipe\\discord-ipc-0");

      const pipePath3 = client.getIpcPath(3);
      expect(pipePath3).toBe("\\\\.\\pipe\\discord-ipc-3");
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
  });

  it("encodes binary packet with 8-byte LE header correctly", () => {
    const opcode = 1; // OP_FRAME
    const payload = { cmd: "SET_ACTIVITY", test: true };
    const packet = client.encodePacket(opcode, payload);

    expect(packet.length).toBeGreaterThan(8);
    const decodedOpcode = packet.readInt32LE(0);
    const decodedLength = packet.readInt32LE(4);

    expect(decodedOpcode).toBe(1);
    expect(decodedLength).toBe(packet.length - 8);

    const jsonStr = packet.slice(8).toString("utf8");
    expect(JSON.parse(jsonStr)).toEqual(payload);
  });

  it("decodes binary packet with opcode and payload", () => {
    const jsonStr = JSON.stringify({ v: 1, client_id: "test-client" });
    const dataBuf = Buffer.from(jsonStr, "utf8");
    const header = Buffer.alloc(8);
    header.writeInt32LE(0, 0); // OP_HANDSHAKE
    header.writeInt32LE(dataBuf.length, 4);

    const rawBuf = Buffer.concat([header, dataBuf]);
    const { opcode, payload } = client.decodePacket(rawBuf);

    expect(opcode).toBe(0);
    expect(payload).toEqual({ v: 1, client_id: "test-client" });
  });

  it("respects privacy masking when maskSubject is enabled", () => {
    client.enabled = true;
    client.isConnected = true;
    client.maskSubject = true;

    // Mock sendPacket to inspect payload
    const sendPacketSpy = vi.spyOn(client, "sendPacket").mockReturnValue(true);

    const activity = {
      state: "Algorithms: Binary Search Trees",
      details: "LeetCode Hard Drill 4/10",
      timestamps: { start: 1730000000 }
    };

    client.sendActivityNow(activity);

    expect(sendPacketSpy).toHaveBeenCalledTimes(1);
    const callArgs = sendPacketSpy.mock.calls[0];
    const framePayload = callArgs[1] as any;

    expect(framePayload.args.activity.state).toBe("Deep Focus Study Session");
    expect(framePayload.args.activity.details).toBe("Focused Learning");
    expect(framePayload.args.activity.timestamps.start).toBe(1730000000);
  });

  it("disables connection and clears activity on updateSettings({ enabled: false })", () => {
    const disconnectSpy = vi.spyOn(client, "disconnect");
    client.updateSettings({ enabled: false });
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(client.enabled).toBe(false);
  });
});
