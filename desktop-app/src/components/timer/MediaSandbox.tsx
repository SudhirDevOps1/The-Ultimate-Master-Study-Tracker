import { useEffect, useState, useRef } from "react";
import { Play, Pause, Camera, AlertCircle, ExternalLink, HelpCircle, Globe } from "lucide-react";
import html2canvas from "html2canvas";

interface MediaSandboxProps {
  url: string;
  activeSubjectName: string;
  color: string;
  onInteraction?: () => void;
}

export function MediaSandbox({ url, activeSubjectName, color, onInteraction }: MediaSandboxProps) {
  const [mediaType, setMediaType] = useState<"youtube" | "video" | "audio" | "web" | "unknown">("web");
  const [localSourceUrl, setLocalSourceUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // FIX B4: Load-on-demand — user must click "Load Resource" before web/YT loads.
  // Prevents auto-loading external URLs on session start (bandwidth, privacy).
  const [resourceLoaded, setResourceLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sandboxRef = useRef<HTMLDivElement>(null);

  // Reset loaded state when URL changes
  useEffect(() => {
    setResourceLoaded(false);
    setErrorMsg(null);
  }, [url]);

  // Helper to open link in external/system browser
  const openExternalUrl = async (targetUrl: string) => {
    onInteraction?.();
    if (typeof window !== "undefined" && (window as any).electron) {
      try {
        await (window as any).electron.ipcRenderer?.invoke("open-external-link", { url: targetUrl });
        return;
      } catch (e) {
        console.error("Failed to open external link via Electron:", e);
      }
    }
    // Fallback for standard web-app
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  // Parse Media Type and resolve local files
  useEffect(() => {
    if (!url) return;
    setErrorMsg(null);
    setLocalSourceUrl(null);

    // 1. YouTube check
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = url.match(ytRegex);
    if (ytMatch) {
      setMediaType("youtube");
      return;
    }

    // Determine extensions
    const ext = url.split(".").pop()?.toLowerCase();
    const isVideoExt = ["mp4", "webm", "ogg"].includes(ext || "");
    const isAudioExt = ["mp3", "wav", "ogg", "aac", "m4a"].includes(ext || "");

    // Check if it's a local file path (Windows drive letters or absolute slash)
    const isLocalPath = /^[a-zA-Z]:[\\/]/.test(url) || url.startsWith("/") || url.startsWith("file://");

    if (isLocalPath) {
      if (typeof window !== "undefined" && "require" in window) {
        try {
          const fs = (window as any).require("fs");
          const cleanedPath = url.replace(/^file:\/\/\/?/, "");
          if (fs.existsSync(cleanedPath)) {
            const fileData = fs.readFileSync(cleanedPath);
            const mimeType = isVideoExt ? `video/${ext}` : isAudioExt ? `audio/${ext}` : "video/mp4";
            const blob = new Blob([fileData], { type: mimeType });
            const localBlobUrl = URL.createObjectURL(blob);
            setLocalSourceUrl(localBlobUrl);
            setMediaType(isVideoExt ? "video" : isAudioExt ? "audio" : "video");
            // Local files auto-load (no external network involved)
            setResourceLoaded(true);
          } else {
            setErrorMsg("Local file path not found. Please double check the directory/file name.");
            setMediaType("unknown");
          }
        } catch (err: any) {
          setErrorMsg(`Failed to load local file: ${err.message}`);
          setMediaType("unknown");
        }
      } else {
        setErrorMsg("Local file access is only supported inside the Desktop App environment.");
        setMediaType("unknown");
      }
    } else {
      if (isVideoExt) {
        setMediaType("video");
        setLocalSourceUrl(url);
        setResourceLoaded(true); // Direct video URL — safe to auto-load
      } else if (isAudioExt) {
        setMediaType("audio");
        setLocalSourceUrl(url);
        setResourceLoaded(true); // Direct audio URL — safe to auto-load
      } else {
        // YouTube or standard Web link — require explicit user click
        setMediaType("web");
      }
    }
  }, [url]);

  // Handle Play/Pause for local media
  const togglePlay = () => {
    onInteraction?.();
    if (mediaType === "video" && videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else void videoRef.current.play();
      setIsPlaying(!isPlaying);
    } else if (mediaType === "audio" && audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else void audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  // FIX B1: Replace alert() with Electron IPC toast (non-blocking)
  const showToast = async (message: string) => {
    if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      try {
        const ipcRenderer = (window as any).electron.ipcRenderer;
        await ipcRenderer.invoke("send-windows-toast", {
          title: "FlowTrack",
          message,
        });
        return;
      } catch { /* fall through to browser notification */ }
    }
    // Web fallback — use Notification API instead of alert()
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("FlowTrack", { body: message, icon: "/icon-192.png" });
    }
  };

  // Screenshot capture
  const handleScreenshot = async () => {
    onInteraction?.();
    let dataUrl = "";

    if (mediaType === "video" && videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL("image/png");
      }
    } else if (sandboxRef.current) {
      try {
        const canvas = await html2canvas(sandboxRef.current, {
          backgroundColor: "#0f172a",
          useCORS: true,
        });
        dataUrl = canvas.toDataURL("image/png");
      } catch { /* ignore */ }
    }

    if (dataUrl && typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
      try {
        const ipcRenderer = (window as any).electron.ipcRenderer;
        const defaultName = `FlowTrack_Screenshot_${activeSubjectName.replace(/\s+/g, "_")}_${Date.now()}.png`;
        const result = await ipcRenderer.invoke("save-image-dialog", {
          base64Data: dataUrl,
          defaultFilename: defaultName,
        });
        if (result.success) {
          await showToast(`Screenshot saved to: ${result.path}`);
        }
      } catch (err: any) {
        await showToast("Failed to save screenshot: " + err.message);
      }
    } else if (dataUrl) {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `screenshot_${activeSubjectName}.png`;
      link.click();
    }
  };

  // Convert any YouTube watch/short URL to a proper nocookie embed URL
  const getEmbedUrl = (watchUrl: string) => {
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = watchUrl.match(ytRegex);
    if (match) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1&enablejsapi=1`;
    }
    return watchUrl;
  };

  return (
    <div
      ref={sandboxRef}
      className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/70 p-4 shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <h3 className="font-bold text-white text-sm">Study Media Sandbox — {activeSubjectName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScreenshot}
            title="Take Study Screenshot"
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 transition-all hover:bg-white/10 active:scale-95"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Screenshot</span>
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-rose-500/20">
          <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
          <p className="text-sm font-medium text-white">Media Load Alert</p>
          <p className="text-xs mt-1 max-w-sm">{errorMsg}</p>
        </div>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 shadow-inner">

          {/* FIX B4: Load-on-demand overlay for YouTube and web resources */}
          {(mediaType === "youtube" || mediaType === "web") && !resourceLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/95 z-10">
              <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-white/5 text-4xl">
                {mediaType === "youtube" ? "▶️" : "🌐"}
              </div>
              <div className="text-center px-4">
                <p className="text-white font-semibold text-sm">
                  {mediaType === "youtube" ? "YouTube Video Embed" : "External Web Resource"}
                </p>
                <p className="text-slate-400 text-xs mt-1 truncate max-w-[260px]" title={url}>{url}</p>
              </div>
              {mediaType === "web" ? (
                <button
                  onClick={() => { openExternalUrl(url); setResourceLoaded(true); }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-600 hover:to-indigo-600 active:scale-95 transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Web Browser
                </button>
              ) : (
                <button
                  onClick={() => { setResourceLoaded(true); onInteraction?.(); }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-cyan-600 active:scale-95 transition-all"
                >
                  <Globe className="h-4 w-4" />
                  Load Resource
                </button>
              )}
              {mediaType === "youtube" && (
                <button
                  onClick={() => openExternalUrl(url)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open in browser instead
                </button>
              )}
            </div>
          )}

          {mediaType === "youtube" && resourceLoaded && (
            <iframe
              key={url}
              src={getEmbedUrl(url)}
              title="YouTube video player"
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}

          {mediaType === "video" && localSourceUrl && (
            <video
              ref={videoRef}
              src={localSourceUrl}
              className="h-full w-full object-contain"
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          )}

          {mediaType === "audio" && localSourceUrl && (
            <div className="flex flex-col items-center justify-center h-full p-4 bg-slate-900/80">
              <audio
                ref={audioRef}
                src={localSourceUrl}
                className="w-4/5"
                controls
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <p className="text-xs text-slate-400 mt-4 truncate max-w-md">Playing Local Audio: {url}</p>
            </div>
          )}

          {mediaType === "web" && resourceLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
              <Globe className="h-10 w-10 text-cyan-400 mb-3 animate-pulse" />
              <p className="text-white font-semibold text-sm">Web Resource Opened Externally</p>
              <p className="text-slate-400 text-xs mt-1 max-w-xs truncate">{url}</p>
              <p className="text-slate-500 text-[10px] mt-2 max-w-xs leading-relaxed">
                Opened in your default web browser to bypass application embedding limitations. FlowTrack is tracking your focus study session in the background.
              </p>
              <button
                onClick={() => openExternalUrl(url)}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Re-open Website
              </button>
            </div>
          )}

          {mediaType === "unknown" && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400">
              <HelpCircle className="h-8 w-8 mb-2 text-slate-500" />
              <p className="text-sm font-medium text-white">Unrecognized Media Format</p>
              <p className="text-xs mt-1 text-center max-w-xs">{url}</p>
            </div>
          )}
        </div>
      )}

      {/* Player controls for local video/audio */}
      {(mediaType === "video" || mediaType === "audio") && !errorMsg && (
        <div className="flex items-center justify-center mt-3 gap-2">
          <button
            onClick={togglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-600 transition-all active:scale-90"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
          </button>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            {isPlaying ? "Focusing & Tracking study state" : "Player paused"}
          </span>
        </div>
      )}
    </div>
  );
}
