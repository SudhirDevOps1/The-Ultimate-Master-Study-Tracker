import { useEffect, useMemo, useRef, useState, type PointerEventHandler } from "react";
import { formatSeconds } from "@/utils/time";
import { useAppStore } from "@/store/useAppStore";

interface FloatingTimerProps {
  subject: string;
  elapsed: number;
  remaining: number;
  progress: number;
  onHeartbeat?: () => void;
}

interface DocumentPictureInPicture {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

type PipMode = "none" | "document" | "video" | "fallback";

const CARD_WIDTH = 240;
const CARD_HEIGHT = 130;

function getLiveDateTimeString() {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  };
  return now.toLocaleString("en-US", options);
}

export function FloatingTimer({ subject, elapsed, remaining, progress, onHeartbeat }: FloatingTimerProps) {
  const [mode, setMode] = useState<PipMode>("none");
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const pipWindowRef = useRef<Window | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [liveTime, setLiveTime] = useState("");

  const ui = useMemo(
    () => ({
      elapsedLabel: formatSeconds(elapsed),
      remainingLabel: formatSeconds(remaining),
      progressLabel: `${Math.round(progress)}%`,
    }),
    [elapsed, remaining, progress]
  );

  const drawCanvasFrame = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = 420;
    canvas.height = 236;

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(0.5, "#111827");
    gradient.addColorStop(1, "#1e1b4b");

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "rgba(255,255,255,0.08)";
    context.fillRect(18, 18, canvas.width - 36, canvas.height - 36);

    context.fillStyle = "#a5b4fc";
    context.font = "600 18px Inter, Arial, sans-serif";
    context.fillText("FLOWTRACK", 32, 46);

    if (liveTime) {
      context.fillStyle = "#94a3b8";
      context.font = "500 13px Inter, Arial, sans-serif";
      context.textAlign = "right";
      context.fillText(liveTime, canvas.width - 32, 46);
      context.textAlign = "left";
    }

    context.fillStyle = "#ffffff";
    context.font = "700 28px Inter, Arial, sans-serif";
    const title = subject.length > 22 ? `${subject.slice(0, 22)}…` : subject;
    context.fillText(title, 32, 84);

    context.font = "700 58px Inter, Arial, sans-serif";
    context.fillText(ui.elapsedLabel, 32, 150);

    context.fillStyle = "#cbd5e1";
    context.font = "500 22px Inter, Arial, sans-serif";
    context.fillText(`Remaining ${ui.remainingLabel}`, 32, 188);

    context.fillStyle = "rgba(255,255,255,0.12)";
    context.fillRect(32, 200, canvas.width - 64, 12);

    const progressWidth = Math.max(0, Math.min(canvas.width - 64, ((canvas.width - 64) * progress) / 100));
    const barGradient = context.createLinearGradient(32, 0, canvas.width - 32, 0);
    barGradient.addColorStop(0, "#818cf8");
    barGradient.addColorStop(1, "#22d3ee");
    context.fillStyle = barGradient;
    context.fillRect(32, 200, progressWidth, 12);

    context.fillStyle = "#e2e8f0";
    context.font = "500 18px Inter, Arial, sans-serif";
    context.fillText(ui.progressLabel, canvas.width - 88, 188);
  };

  useEffect(() => {
    drawCanvasFrame();
  }, [subject, ui.elapsedLabel, ui.progressLabel, ui.remainingLabel, progress, liveTime]);

  useEffect(() => {
    if (mode === "none") return;
    const interval = window.setInterval(() => {
      setLiveTime(getLiveDateTimeString());
    }, 1000);
    setLiveTime(getLiveDateTimeString());
    return () => window.clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode === "none") return;
    const interval = window.setInterval(() => {
      onHeartbeat?.();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [mode, onHeartbeat]);

  useEffect(() => {
    if (!pipWindowRef.current) return;
    const doc = pipWindowRef.current.document;
    const root = doc.getElementById("pip-root");
    if (!root) return;

    root.innerHTML = `
      <div style="height:100%;padding:16px;background:linear-gradient(135deg,#0f172a,#111827,#1e1b4b);color:#fff;font-family:Inter,Arial,sans-serif;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#a5b4fc;">FlowTrack</div>
            <div style="font-size:20px;font-weight:700;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${subject}</div>
          </div>
          <div style="text-align:right;font-size:12px;color:#94a3b8;font-weight:500;">
            ${liveTime}
          </div>
        </div>
        <div>
          <div style="font-size:36px;font-weight:800;line-height:1;">${ui.elapsedLabel}</div>
          <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">Remaining ${ui.remainingLabel}</div>
          <div style="height:6px;background:rgba(255,255,255,0.12);border-radius:999px;overflow:hidden;margin-top:8px;">
            <div style="height:100%;width:${Math.max(0, Math.min(100, progress))}%;background:linear-gradient(90deg,#818cf8,#22d3ee);"></div>
          </div>
        </div>
      </div>
    `;
  }, [mode, progress, subject, ui.elapsedLabel, ui.remainingLabel, liveTime]);

  useEffect(() => {
    if (!canvasRef.current || videoRef.current) return;
    const canvas = canvasRef.current;
    const video = document.createElement("video");
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    // ✅ BUG FIX: 30fps stream so PiP canvas updates are captured reliably
    const stream = canvas.captureStream(30);
    video.srcObject = stream;
    videoRef.current = video;
  }, []);

  const openVideoPiP = async () => {
    if (!document.pictureInPictureEnabled || !videoRef.current) {
      setMode("fallback");
      return;
    }

    try {
      drawCanvasFrame();
      await videoRef.current.play();
      await videoRef.current.requestPictureInPicture();
      setMode("video");
      videoRef.current.addEventListener(
        "leavepictureinpicture",
        () => {
          setMode("none");
          useAppStore.getState().setIsPipActive(false);
        },
        { once: true }
      );
      useAppStore.getState().setIsPipActive(true);
    } catch {
      setMode("fallback");
    }
  };

  const openPiP = async () => {
    if (window.documentPictureInPicture) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({ width: 360, height: 220 });
        pipWindow.document.body.style.margin = "0";
        pipWindow.document.body.style.height = "100vh";
        pipWindow.document.body.innerHTML = '<div id="pip-root" style="height:100%"></div>';
        pipWindowRef.current = pipWindow;
        setMode("document");

        // Track real interaction inside PiP window
        const handlePipInteraction = () => {
          useAppStore.getState().markTimerInteraction();
        };
        ["pointerdown", "keydown", "mousemove", "wheel"].forEach(event => {
          pipWindow.addEventListener(event, handlePipInteraction, { passive: true });
        });

        // ✅ BUG FIX: Heartbeat every 10s (was 30s).
        // With 30s interval, strict-focus inactivity check could fire between beats
        // and auto-pause the session even while PiP is open.
        const heartbeat = setInterval(() => {
          useAppStore.getState().markTimerInteraction();
        }, 10000); // Every 10 seconds

        pipWindow.addEventListener("pagehide", () => {
          clearInterval(heartbeat); // Clean up heartbeat on window close
          pipWindowRef.current = null;
          setMode("none");
          useAppStore.getState().setIsPipActive(false);
        });

        useAppStore.getState().setIsPipActive(true);
        return;
      } catch {
        // Fallback to video PiP below.
      }
    }

    await openVideoPiP();
  };

  const closeFloating = async () => {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {
        // Ignore close errors and continue closing fallback state.
      }
    }

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }

    pipWindowRef.current = null;
    setMode("none");
    useAppStore.getState().setIsPipActive(false);
  };

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    dragRef.current = {
      dragging: true,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove: PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current.dragging) return;

    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - CARD_WIDTH - 8, event.clientX - dragRef.current.offsetX)),
      y: Math.max(8, Math.min(window.innerHeight - CARD_HEIGHT - 8, event.clientY - dragRef.current.offsetY)),
    });
  };

  const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    dragRef.current.dragging = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <button
        type="button"
        onClick={() => {
          void (mode === "none" ? openPiP() : closeFloating());
        }}
        className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
      >
        {mode === "none" ? "Open Floating Timer" : "Close Floating Timer"}
      </button>

      {mode === "fallback" && (
        <div
          className="glass fixed z-50 w-60 touch-none rounded-2xl border border-white/15 p-3 text-white shadow-2xl"
          style={{ left: position.x, top: position.y }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-200">FlowTrack</p>
              <p className="max-w-40 truncate text-sm text-slate-200">{subject}</p>
            </div>
            <button
              type="button"
              onClick={() => setMode("none")}
              className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-slate-200"
            >
              Close
            </button>
          </div>
          <p className="mt-3 text-2xl font-semibold">{ui.elapsedLabel}</p>
          <p className="text-xs text-slate-300">Remaining {ui.remainingLabel}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        </div>
      )}
    </>
  );
}
