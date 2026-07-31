import { useEffect, useState, useRef } from "react";
import { Play, Pause, Camera, AlertCircle, ExternalLink, Globe } from "lucide-react";
import html2canvas from "html2canvas";

interface MediaSandboxProps {
  url: string;
  activeSubjectName: string;
  color: string;
  onInteraction?: () => void;
}

function formatLocalVideoUrl(inputUrl: string): string {
  if (!inputUrl) return "";
  let clean = inputUrl.trim().replace(/^["']|["']$/g, "");
  
  if (clean.startsWith("blob:") || clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
    return clean;
  }
  
  clean = clean.replace(/\\/g, "/");
  
  if (/^[a-zA-Z]:\//.test(clean)) {
    return `file:///${encodeURI(clean)}`;
  }
  
  if (clean.startsWith("/")) {
    return `file://${encodeURI(clean)}`;
  }
  
  return clean;
}

export function MediaSandbox({ url, activeSubjectName, color, onInteraction }: MediaSandboxProps) {
  const [mediaType, setMediaType] = useState<"youtube" | "video" | "audio" | "web" | "unknown">("web");
  const [localSourceUrl, setLocalSourceUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  // Parse Media Type and resolve local files & streaming links
  useEffect(() => {
    if (!url) return;
    setErrorMsg(null);
    setLocalSourceUrl(null);

    const cleanUrl = url.trim().replace(/^["']|["']$/g, "");

    // 1. YouTube check
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const ytMatch = cleanUrl.match(ytRegex);
    if (ytMatch) {
      setMediaType("youtube");
      return;
    }

    // Determine extensions
    const ext = cleanUrl.split(".").pop()?.toLowerCase();
    const isVideoExt = ["mp4", "webm", "ogg", "mkv", "mov", "avi"].includes(ext || "");
    const isAudioExt = ["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext || "");

    // Check if it's a local file path (Windows drive letters like D:\... or /... or file://...)
    const isLocalPath = /^[a-zA-Z]:[\\/]/.test(cleanUrl) || cleanUrl.startsWith("/") || cleanUrl.startsWith("file://");

    if (isLocalPath) {
      const formatted = formatLocalVideoUrl(cleanUrl);
      setLocalSourceUrl(formatted);
      setMediaType(isVideoExt ? "video" : isAudioExt ? "audio" : "video");
      setResourceLoaded(true);
    } else {
      if (isVideoExt) {
        setMediaType("video");
        setLocalSourceUrl(cleanUrl);
        setResourceLoaded(true);
      } else if (isAudioExt) {
        setMediaType("audio");
        setLocalSourceUrl(cleanUrl);
        setResourceLoaded(true);
      } else {
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

  const showToast = async (message: string) => {
    if (typeof window !== "undefined" && "require" in window) {
      try {
        const { ipcRenderer } = (window as any).require("electron");
        await ipcRenderer.invoke("send-windows-toast", { title: "FlowTrack", message });
        return;
      } catch { /* ignore */ }
    }
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

    if (dataUrl && typeof window !== "undefined" && "require" in window) {
      try {
        const { ipcRenderer } = (window as any).require("electron");
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
              autoPlay
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
                autoPlay
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
              <button
                onClick={() => openExternalUrl(url)}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Re-open Website
              </button>
            </div>
          )}
        </div>
      )}

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
