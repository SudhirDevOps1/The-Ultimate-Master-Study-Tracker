import { useEffect, useState, useRef } from "react";
import { Play, Pause, Camera, AlertCircle, ExternalLink, Globe, SkipBack, SkipForward, ListVideo, Folder, Upload, Disc, Radio, Tv } from "lucide-react";
import html2canvas from "html2canvas";

interface MediaSandboxProps {
  url: string;
  activeSubjectName: string;
  color: string;
  onInteraction?: () => void;
}

interface LocalPlaylistItem {
  name: string;
  path: string;
  url: string;
}

function formatLocalVideoUrl(inputUrl: string): string {
  if (!inputUrl) return "";
  let clean = inputUrl.trim().replace(/^["']|["']$/g, "");
  
  if (clean.startsWith("blob:") || clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:") || clean.startsWith("local-media://")) {
    return clean;
  }
  
  clean = clean.replace(/\\/g, "/");
  
  if (/^[a-zA-Z]:\//.test(clean)) {
    if (typeof window !== "undefined" && (window as any).electron) {
      return `local-media:///${encodeURI(clean)}`;
    }
    return `file:///${encodeURI(clean)}`;
  }
  
  if (clean.startsWith("//")) {
    if (typeof window !== "undefined" && (window as any).electron) {
      return `local-media://${encodeURI(clean)}`;
    }
    return `file:${encodeURI(clean)}`;
  }

  if (clean.startsWith("/")) {
    if (typeof window !== "undefined" && (window as any).electron) {
      return `local-media://${encodeURI(clean)}`;
    }
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
  const [isWebBrowserLocalPrompt, setIsWebBrowserLocalPrompt] = useState(false);

  // Local Playlist State
  const [playlist, setPlaylist] = useState<LocalPlaylistItem[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sandboxRef = useRef<HTMLDivElement>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Reset loaded state when URL changes
  useEffect(() => {
    setResourceLoaded(false);
    setErrorMsg(null);
    setPlaylist([]);
    setPlaylistIndex(0);
    setIsWebBrowserLocalPrompt(false);
  }, [url]);

  // Update document title with current playing media name so Electron activity tracker records exact file name!
  useEffect(() => {
    if (isPlaying || resourceLoaded) {
      let currentMediaName = "";
      if (playlist.length > 0 && playlist[playlistIndex]) {
        currentMediaName = playlist[playlistIndex].name;
      } else if (url) {
        const cleanP = url.trim().replace(/^["']|["']$/g, "");
        const parts = cleanP.split(/[\\/]/);
        currentMediaName = parts.pop() || cleanP;
      }
      if (currentMediaName) {
        document.title = `🎬 Playing: ${currentMediaName} | ${activeSubjectName} — FlowTrack Pro`;
      }
    }
  }, [isPlaying, resourceLoaded, playlistIndex, playlist, url, activeSubjectName]);

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

  // Open in VLC Media Player
  const openInVlc = async () => {
    onInteraction?.();
    if (typeof window !== "undefined" && (window as any).electron) {
      try {
        const res = await (window as any).electron.ipcRenderer.invoke("open-in-vlc", { filePath: url });
        showToast(res.message || "Opening in VLC...");
      } catch (e: any) {
        showToast("Failed to open VLC: " + e.message);
      }
    } else {
      showToast("VLC Launcher is supported in Desktop App!");
    }
  };

  // Parse Media Type & Scan Local Folder Playlist
  useEffect(() => {
    if (!url) return;
    setErrorMsg(null);
    setLocalSourceUrl(null);
    setIsWebBrowserLocalPrompt(false);

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
    const isVideoExt = ["mp4", "webm", "ogg", "mkv", "mov", "avi", "wmv", "m4v"].includes(ext || "");
    const isAudioExt = ["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext || "");

    // Check if it's a local file/folder path (Windows drive letters like D:\... or /... or file://...)
    const isLocalPath = /^[a-zA-Z]:[\\/]/.test(cleanUrl) || cleanUrl.startsWith("/") || cleanUrl.startsWith("file://");

    if (isLocalPath) {
      const isElectronApp = typeof window !== "undefined" && (window as any).electron?.isElectron;

      if (isElectronApp) {
        void (window as any).electron.ipcRenderer.invoke("scan-local-folder", { folderPath: cleanUrl })
          .then((res: { success: boolean; files: LocalPlaylistItem[] }) => {
            if (res && res.success && res.files.length > 0) {
              setPlaylist(res.files);
              const normClean = cleanUrl.replace(/\\/g, "/").toLowerCase();
              const foundIdx = res.files.findIndex(f => f.path.replace(/\\/g, "/").toLowerCase() === normClean);
              const startIdx = foundIdx !== -1 ? foundIdx : 0;
              setPlaylistIndex(startIdx);
              setLocalSourceUrl(res.files[startIdx].url);
              
              const currentExt = res.files[startIdx].name.split(".").pop()?.toLowerCase();
              const isVid = ["mp4", "webm", "ogg", "mkv", "mov", "avi", "wmv", "m4v"].includes(currentExt || "");
              setMediaType(isVid ? "video" : "audio");
              setResourceLoaded(true);
            } else {
              const formatted = formatLocalVideoUrl(cleanUrl);
              setLocalSourceUrl(formatted);
              setMediaType(isVideoExt ? "video" : isAudioExt ? "audio" : "video");
              setResourceLoaded(true);
            }
          })
          .catch(() => {
            const formatted = formatLocalVideoUrl(cleanUrl);
            setLocalSourceUrl(formatted);
            setMediaType(isVideoExt ? "video" : isAudioExt ? "audio" : "video");
            setResourceLoaded(true);
          });
      } else {
        setIsWebBrowserLocalPrompt(true);
        setMediaType(isVideoExt ? "video" : isAudioExt ? "audio" : "video");
      }
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

  // Web Browser Local File Selection Handler
  const handleWebLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      setLocalSourceUrl(blobUrl);
      setIsWebBrowserLocalPrompt(false);
      setResourceLoaded(true);
      setIsPlaying(true);
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isVid = ["mp4", "webm", "ogg", "mkv", "mov", "avi", "wmv", "m4v"].includes(ext || "");
      setMediaType(isVid ? "video" : "audio");
    }
  };

  // Playlist Navigation
  const playPlaylistItem = (index: number) => {
    if (index >= 0 && index < playlist.length) {
      setPlaylistIndex(index);
      setLocalSourceUrl(playlist[index].url);
      const ext = playlist[index].name.split(".").pop()?.toLowerCase();
      const isVid = ["mp4", "webm", "ogg", "mkv", "mov", "avi", "wmv", "m4v"].includes(ext || "");
      setMediaType(isVid ? "video" : "audio");
      setIsPlaying(true);
      setTimeout(() => {
        if (isVid && videoRef.current) void videoRef.current.play();
        else if (audioRef.current) void audioRef.current.play();
      }, 100);
    }
  };

  const handleNextTrack = () => {
    if (playlist.length > 0) {
      playPlaylistItem((playlistIndex + 1) % playlist.length);
    }
  };

  const handlePrevTrack = () => {
    if (playlist.length > 0) {
      playPlaylistItem((playlistIndex - 1 + playlist.length) % playlist.length);
    }
  };

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
      const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : 'http%3A%2F%2Flocalhost';
      return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${origin}`;
    }
    return watchUrl;
  };

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const objectUrl = URL.createObjectURL(file);
      const isVid = file.type.startsWith("video/") || ["mp4", "mkv", "avi", "webm", "mov"].some(ext => file.name.toLowerCase().endsWith("." + ext));
      setLocalSourceUrl(objectUrl);
      setMediaType(isVid ? "video" : "audio");
      setResourceLoaded(true);
      setIsPlaying(true);
      document.title = `🎬 Playing: ${file.name} | ${activeSubjectName} — FlowTrack Pro`;
      void showToast(`📥 Playing dropped file: ${file.name}`);
    }
  };

  return (
    <div
      ref={sandboxRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-950/70 p-4 shadow-xl"
    >
      {/* Visual Drag and Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl bg-cyan-950/90 backdrop-blur-md border-2 border-dashed border-cyan-400 p-6 text-center shadow-2xl animate-pulse">
          <Upload className="w-12 h-12 text-cyan-400 mb-3 animate-bounce" />
          <h3 className="text-lg font-bold text-white">Drop Video / Audio File Here</h3>
          <p className="text-xs text-cyan-200 mt-1">FlowTrack will instantly stream and play your local study media file!</p>
        </div>
      )}
      {/* Hidden local file input for Web Browser Mode */}
      <input
        ref={localFileInputRef}
        type="file"
        accept="video/*,audio/*"
        className="hidden"
        onChange={handleWebLocalFileSelect}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <h3 className="font-bold text-white text-sm">Study Media Sandbox — {activeSubjectName}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* VLC Media Player Launcher Button */}
          <button
            onClick={openInVlc}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2.5 py-1 text-xs font-bold transition-all hover:bg-orange-500/30 active:scale-95"
            title="Open Video/Audio in VLC Media Player"
          >
            <Tv className="h-3.5 w-3.5" />
            <span>Open in VLC</span>
          </button>

          {playlist.length > 1 && (
            <button
              onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 text-xs font-bold transition-all hover:bg-indigo-500/30"
              title="Course Playlist Menu"
            >
              <ListVideo className="h-3.5 w-3.5" />
              <span>Playlist ({playlistIndex + 1}/{playlist.length})</span>
            </button>
          )}

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

      {/* Course Playlist Menu Drawer */}
      {showPlaylistMenu && playlist.length > 0 && (
        <div className="mb-3 p-3 rounded-xl bg-slate-900 border border-indigo-500/30 max-h-48 overflow-y-auto space-y-1 shadow-2xl">
          <div className="flex items-center justify-between pb-1 border-b border-white/5 mb-1">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" /> Course Folder Playlist ({playlist.length} files)
            </span>
            <button onClick={() => setShowPlaylistMenu(false)} className="text-xs text-slate-400">✕</button>
          </div>
          {playlist.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { playPlaylistItem(idx); setShowPlaylistMenu(false); }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium truncate transition-colors flex items-center justify-between ${
                idx === playlistIndex 
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold" 
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span className="truncate">{idx + 1}. {item.name}</span>
              {idx === playlistIndex && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded ml-2">Playing</span>}
            </button>
          ))}
        </div>
      )}

      {errorMsg ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-rose-500/20">
          <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
          <p className="text-sm font-medium text-white">Media Load Alert</p>
          <p className="text-xs mt-1 max-w-sm">{errorMsg}</p>
        </div>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 shadow-inner">

          {/* Web Browser Mode Local File Picker Prompt */}
          {isWebBrowserLocalPrompt && !resourceLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900/95 z-10 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Local Media Path Detected</p>
                <p className="text-slate-400 text-xs mt-0.5 truncate max-w-md">{url}</p>
              </div>
              <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
                Click below to select your video/audio file for instant playback or click "Open in VLC"!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => localFileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/30 hover:opacity-95 transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4" /> Pick File From PC
                </button>
                <button
                  onClick={openInVlc}
                  className="flex items-center gap-2 rounded-xl bg-orange-500/20 border border-orange-500/30 px-5 py-2.5 text-xs font-bold text-orange-400 hover:bg-orange-500/30 transition-all active:scale-95"
                >
                  <Tv className="w-4 h-4" /> Open in VLC
                </button>
              </div>
            </div>
          )}

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

          {mediaType === "web" && resourceLoaded && (
            typeof window !== "undefined" && (window as any).electron ? (
              <webview
                key={url}
                src={url}
                className="absolute inset-0 h-full w-full border-0"
                allowpopups
                webpreferences="allowRunningInsecureContent, javascript=true"
              />
            ) : (
              <iframe
                key={url}
                src={url}
                title="Course Web Portal"
                className="absolute inset-0 h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                allow="autoplay; fullscreen"
              />
            )
          )}

          {mediaType === "youtube" && resourceLoaded && (
            <div className="absolute inset-0 h-full w-full flex flex-col">
              {typeof window !== "undefined" && (window as any).electron ? (
                <webview
                  key={url}
                  src={url.includes("watch?v=") || url.includes("youtu.be/") ? url : getEmbedUrl(url)}
                  className="w-full flex-1 border-0"
                  allowpopups
                  webpreferences="allowRunningInsecureContent, javascript=true"
                />
              ) : (
                <iframe
                  key={url}
                  src={getEmbedUrl(url)}
                  title="YouTube video player"
                  className="w-full flex-1 border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              )}
              <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-t border-white/10 text-[11px] text-slate-400">
                <span>Apna College / Restricted Video?</span>
                <button
                  type="button"
                  onClick={() => openExternalUrl(url)}
                  className="text-cyan-400 font-bold hover:underline"
                >
                  🌐 Open in External Browser
                </button>
              </div>
            </div>
          )}

          {mediaType === "video" && localSourceUrl && (
            <video
              ref={videoRef}
              key={localSourceUrl}
              src={localSourceUrl}
              className="h-full w-full object-contain"
              controls
              autoPlay
              onEnded={handleNextTrack}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          )}

          {/* Premium Audio Player with Dynamic Equalizer Visualizer */}
          {mediaType === "audio" && localSourceUrl && (
            <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-950 relative overflow-hidden">
              <audio
                ref={audioRef}
                key={localSourceUrl}
                src={localSourceUrl}
                className="hidden"
                autoPlay
                onEnded={handleNextTrack}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* Vinyl Record Disc Animation */}
              <div className="relative mb-4">
                <div className={`w-28 h-28 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 border-4 border-cyan-500/40 shadow-2xl flex items-center justify-center ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
                  <Disc className="w-12 h-12 text-cyan-400" />
                </div>
                {isPlaying && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                  </span>
                )}
              </div>

              {/* Dynamic Neon Audio Frequency Bar Visualizer */}
              <div className="flex items-end gap-1.5 h-12 mb-4">
                {[40, 75, 50, 90, 60, 100, 45, 80, 65, 95, 55, 85, 40, 70, 60, 90].map((h, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-full bg-gradient-to-t from-cyan-500 to-indigo-500 transition-all duration-300 ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
                    style={{
                      height: isPlaying ? `${Math.max(20, (h * Math.random()) + 20)}%` : "20%",
                      animationDelay: `${idx * 80}ms`
                    }}
                  />
                ))}
              </div>

              {/* Track Title */}
              <p className="text-xs font-bold text-white truncate max-w-md flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>{playlist.length > 0 ? playlist[playlistIndex]?.name : url}</span>
              </p>
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

      {/* Local Video/Audio Controls & Course Playlist Navigation */}
      {(mediaType === "video" || mediaType === "audio") && !errorMsg && (
        <div className="flex items-center justify-between mt-3 gap-2 px-2 flex-wrap">
          <div className="flex items-center gap-2">
            {playlist.length > 1 && (
              <button
                onClick={handlePrevTrack}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-all active:scale-90"
                title="Previous Video"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={togglePlay}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-600 transition-all active:scale-90"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
            </button>

            {playlist.length > 1 && (
              <button
                onClick={handleNextTrack}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-all active:scale-90"
                title="Next Video"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[280px]">
            {playlist.length > 1 
              ? `Video ${playlistIndex + 1}/${playlist.length}: ${playlist[playlistIndex]?.name}` 
              : (isPlaying ? "Focusing & Tracking study state" : "Player paused")}
          </span>
        </div>
      )}
    </div>
  );
}
