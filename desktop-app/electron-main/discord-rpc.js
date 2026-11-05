/**
 * FlowTrack Pro - Privacy-Preserving Discord Rich Presence (RPC)
 * Pure node:net IPC client communicating directly over local named pipes.
 * Zero C++ native addons (node-gyp), zero cloud bot tokens, zero HTTP telemetry.
 */

const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;
const OP_PING = 3;
const OP_PONG = 4;

const DEFAULT_CLIENT_ID = "1346850020310257777"; // FlowTrack Pro Official Discord App ID
const MIN_UPDATE_INTERVAL_MS = 15000; // Discord rate-limit safety throttle (15s)

class DiscordRpcClient {
  constructor() {
    this.socket = null;
    this.clientId = DEFAULT_CLIENT_ID;
    this.isConnected = false;
    this.isConnecting = false;
    this.lastSentActivity = null;
    this.lastSentTime = 0;
    this.queuedActivity = null;
    this.throttleTimer = null;
    this.reconnectAttempts = 0;
    this.enabled = false;
    this.maskSubject = false;
  }

  /**
   * Determine OS-specific Discord IPC named pipe or socket path
   */
  getIpcPath(id = 0) {
    if (process.platform === "win32") {
      return `\\\\.\\pipe\\discord-ipc-${id}`;
    }
    const env = process.env;
    const prefix = env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || "/tmp";
    return path.join(prefix, `discord-ipc-${id}`);
  }

  /**
   * Connect to local Discord client named pipe (trials 0 through 9)
   */
  connect(clientId = DEFAULT_CLIENT_ID) {
    if (this.isConnected || this.isConnecting) return Promise.resolve(this.isConnected);
    this.clientId = clientId || DEFAULT_CLIENT_ID;
    this.isConnecting = true;

    return new Promise((resolve) => {
      let pipeIndex = 0;

      const tryNextPipe = () => {
        if (pipeIndex > 9) {
          this.isConnecting = false;
          this.isConnected = false;
          return resolve(false);
        }

        const pipePath = this.getIpcPath(pipeIndex);
        const socket = net.createConnection(pipePath);

        const onConnect = () => {
          socket.removeAllListeners();
          this.socket = socket;
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setupSocketHandlers();
          this.sendHandshake();
          resolve(true);
        };

        const onError = () => {
          socket.destroy();
          pipeIndex++;
          tryNextPipe();
        };

        socket.once("connect", onConnect);
        socket.once("error", onError);
      };

      tryNextPipe();
    });
  }

  setupSocketHandlers() {
    if (!this.socket) return;

    this.socket.on("data", (data) => {
      try {
        const { opcode, payload } = this.decodePacket(data);
        if (opcode === OP_PING) {
          this.sendPacket(OP_PONG, payload);
        }
      } catch (err) {
        // Silently catch protocol parse anomalies
      }
    });

    this.socket.on("close", () => {
      this.isConnected = false;
      this.isConnecting = false;
      this.socket = null;
    });

    this.socket.on("error", () => {
      this.isConnected = false;
      this.isConnecting = false;
      if (this.socket) {
        this.socket.destroy();
        this.socket = null;
      }
    });
  }

  /**
   * Encode binary packet: [Opcode (4B LE)] [Length (4B LE)] [JSON Payload]
   */
  encodePacket(opcode, payload) {
    const jsonStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    const dataBuf = Buffer.from(jsonStr, "utf8");
    const headerBuf = Buffer.alloc(8);
    headerBuf.writeInt32LE(opcode, 0);
    headerBuf.writeInt32LE(dataBuf.length, 4);
    return Buffer.concat([headerBuf, dataBuf]);
  }

  /**
   * Decode binary packet received from Discord
   */
  decodePacket(buf) {
    if (buf.length < 8) return { opcode: -1, payload: null };
    const opcode = buf.readInt32LE(0);
    const length = buf.readInt32LE(4);
    const rawJson = buf.slice(8, 8 + length).toString("utf8");
    let payload = null;
    try {
      payload = JSON.parse(rawJson);
    } catch {}
    return { opcode, payload };
  }

  sendPacket(opcode, payload) {
    if (!this.socket || !this.isConnected) return false;
    try {
      const packet = this.encodePacket(opcode, payload);
      this.socket.write(packet);
      return true;
    } catch (e) {
      return false;
    }
  }

  sendHandshake() {
    this.sendPacket(OP_HANDSHAKE, {
      v: 1,
      client_id: this.clientId
    });
  }

  /**
   * Set Discord Presence Activity with 15-second rate-limiting
   */
  async setActivity(activity) {
    if (!this.enabled) return;

    if (!this.isConnected) {
      const connected = await this.connect(this.clientId);
      if (!connected) return;
    }

    const now = Date.now();
    const timeSinceLast = now - this.lastSentTime;

    if (timeSinceLast < MIN_UPDATE_INTERVAL_MS) {
      // Throttle and queue activity
      this.queuedActivity = activity;
      if (!this.throttleTimer) {
        this.throttleTimer = setTimeout(() => {
          this.throttleTimer = null;
          if (this.queuedActivity) {
            this.sendActivityNow(this.queuedActivity);
            this.queuedActivity = null;
          }
        }, MIN_UPDATE_INTERVAL_MS - timeSinceLast);
      }
      return;
    }

    this.sendActivityNow(activity);
  }

  sendActivityNow(activity) {
    if (!this.isConnected || !this.enabled) return;

    // Apply privacy masking if enabled
    const finalActivity = { ...activity };
    if (this.maskSubject) {
      finalActivity.state = "Deep Focus Study Session";
      if (finalActivity.details) {
        finalActivity.details = "Focused Learning";
      }
    }

    const framePayload = {
      cmd: "SET_ACTIVITY",
      args: {
        pid: process.pid,
        activity: finalActivity
      },
      nonce: crypto.randomUUID()
    };

    const sent = this.sendPacket(OP_FRAME, framePayload);
    if (sent) {
      this.lastSentTime = Date.now();
      this.lastSentActivity = finalActivity;
    }
  }

  /**
   * Clear presence (e.g. on pause, AFK, or quit)
   */
  clearActivity() {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.queuedActivity = null;

    if (!this.isConnected) return;

    const framePayload = {
      cmd: "SET_ACTIVITY",
      args: {
        pid: process.pid,
        activity: null
      },
      nonce: crypto.randomUUID()
    };

    this.sendPacket(OP_FRAME, framePayload);
    this.lastSentActivity = null;
  }

  disconnect() {
    this.clearActivity();
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      enabled: this.enabled,
      maskSubject: this.maskSubject,
      clientId: this.clientId,
      lastSent: this.lastSentActivity
    };
  }

  updateSettings({ enabled, clientId, maskSubject }) {
    if (typeof enabled === "boolean") {
      this.enabled = enabled;
      if (!enabled) {
        this.disconnect();
      } else if (!this.isConnected) {
        this.connect(clientId || this.clientId);
      }
    }
    if (typeof clientId === "string" && clientId.trim()) {
      const changed = this.clientId !== clientId.trim();
      this.clientId = clientId.trim();
      if (changed && this.isConnected) {
        this.disconnect();
        if (this.enabled) this.connect(this.clientId);
      }
    }
    if (typeof maskSubject === "boolean") {
      this.maskSubject = maskSubject;
      if (this.lastSentActivity) {
        this.setActivity(this.lastSentActivity);
      }
    }
  }
}

const discordRpc = new DiscordRpcClient();

module.exports = {
  DiscordRpcClient,
  discordRpc
};
