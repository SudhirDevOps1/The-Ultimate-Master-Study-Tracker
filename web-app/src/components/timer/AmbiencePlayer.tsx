import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, CloudRain, TreePine, Coffee, Hash, ChevronDown, Play, Pause, FolderOpen, Link2, SkipForward, Plus, Trash2, Settings, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { db } from "@/lib/db";
import { audioEngine } from "@/utils/audioSynthesizer";

const SOUNDS = [
  { 
    id: "rain", 
    name: "Rain Loops", 
    icon: <CloudRain className="w-4 h-4 text-cyan-400" />, 
    url: "https://assets.mixkit.co/active_storage/sfx/2517/2517-preview.mp3" 
  },
  { 
    id: "forest", 
    name: "Forest Birds", 
    icon: <TreePine className="w-4 h-4 text-emerald-400" />, 
    url: "https://assets.mixkit.co/active_storage/sfx/2437/2437-preview.mp3" 
  },
  { 
    id: "lofi", 
    name: "Coffee Shop", 
    icon: <Coffee className="w-4 h-4 text-amber-400" />, 
    url: "https://assets.mixkit.co/active_storage/sfx/301/301-preview.mp3" 
  },
  { 
    id: "white_noise", 
    name: "River Streams", 
    icon: <Hash className="w-4 h-4 text-blue-400" />, 
    url: "https://assets.mixkit.co/active_storage/sfx/2520/2520-preview.mp3" 
  },
  {
    id: "local",
    name: "Local Audio File",
    icon: <FolderOpen className="w-4 h-4 text-purple-400" />,
    url: ""
  },
  {
    id: "youtube",
    name: "YouTube / Link",
    icon: <Link2 className="w-4 h-4 text-rose-400" />,
    url: ""
  }
];

export function AmbiencePlayer() {
  const isMusicEnabled = useAppStore((state: AppState) => state.focusMusicEnabled);
  const setFocusMusicEnabled = useAppStore((state: AppState) => state.setFocusMusicEnabled);
  
  const [selectedTrack, setSelectedTrack] = useState(SOUNDS[0]);
  const [volume, setVolume] = useState(0.5);
  const [isOpen, setIsOpen] = useState(false);
  const [isSynthFallback, setIsSynthFallback] = useState(false);
  
  const [localUrl, setLocalUrl] = useState<string>("");
  const [localFileName, setLocalFileName] = useState<string>("");
  const [showFloatingSettings, setShowFloatingSettings] = useState(false);
  const [floatingWindowSize, setFloatingWindowSize] = useState<"normal" | "large">("normal");

  // Playlist state (Curated 100% embeddable YouTube study streams)
  const DEFAULT_PLAYLIST = [
    { id: "p1", name: "Chillhop Lofi Beats", url: "https://www.youtube.com/watch?v=5qap5aO4i9A" },
    { id: "p2", name: "Deep Study Ambient Lofi", url: "https://www.youtube.com/watch?v=TURbeWK2wwg" },
    { id: "p3", name: "Japanese Garden Relaxation", url: "https://www.youtube.com/watch?v=1fueZCTYkpA" }
  ];
  const [savedPlaylist, setSavedPlaylist] = useState<Array<{ id: string; name: string; url: string }>>(DEFAULT_PLAYLIST);
  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackUrl, setNewTrackUrl] = useState("");
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load playlist from DB and purge any broken cached URLs
  useEffect(() => {
    void db.settings.get("ambience_playlist").then(setting => {
      if (setting && setting.value) {
        try {
          let parsed = JSON.parse(setting.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter(item => 
              !item.url.includes("lTRiuFIWV54") && 
              !item.url.includes("wXhTHyIgQ_U") &&
              !item.url.includes("jfKfPfyJRdk")
            );
            if (clean.length > 0) {
              setSavedPlaylist(clean);
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setSavedPlaylist(DEFAULT_PLAYLIST);
      void db.settings.put({ key: "ambience_playlist", value: JSON.stringify(DEFAULT_PLAYLIST) });
    });
  }, []);

  const savePlaylistToDb = async (list: typeof savedPlaylist) => {
    setSavedPlaylist(list);
    await db.settings.put({ key: "ambience_playlist", value: JSON.stringify(list) });
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    audioEngine.setNoiseVolume(volume);
    audioEngine.setBinauralVolume(volume);
    audioEngine.setSpaceVolume(volume);
  }, [volume]);

  // Track switching & playback
  const activeUrl = selectedTrack.id === "youtube" ? savedPlaylist[currentPlaylistIndex]?.url || "" : selectedTrack.url;

  useEffect(() => {
    audioEngine.stopAll();

    if (isMusicEnabled) {
      const isYoutubeVideo = selectedTrack.id === "youtube" && activeUrl && getYoutubeId(activeUrl);

      if (isYoutubeVideo) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        setIsSynthFallback(false);
      } else {
        setIsSynthFallback(false);

        const targetSrc = selectedTrack.id === "local" ? localUrl : (selectedTrack.id === "youtube" ? activeUrl : selectedTrack.url);

        if (selectedTrack.id === "local" && !localUrl) {
          fileInputRef.current?.click();
          return;
        }

        if (targetSrc && audioRef.current) {
          if (audioRef.current.src !== targetSrc) {
            audioRef.current.src = targetSrc;
            audioRef.current.load();
          }
          audioRef.current.play().catch(e => {
            console.log("Audio play exception, switching to procedural soundscape", e);
            if (selectedTrack.id !== "local" && selectedTrack.id !== "youtube") {
              triggerOfflineSynth(selectedTrack.id);
            }
          });
        }
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsSynthFallback(false);
    }
  }, [isMusicEnabled, selectedTrack, localUrl, activeUrl]);

  const triggerOfflineSynth = (trackId: string = "rain") => {
    setIsSynthFallback(true);
    audioEngine.toggleNoise(true, trackId);
  };

  useEffect(() => {
    return () => {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
      audioEngine.stopAll();
    };
  }, [localUrl]);

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
      const url = URL.createObjectURL(file);
      setLocalUrl(url);
      setLocalFileName(file.name);
      setSelectedTrack(SOUNDS.find(s => s.id === "local")!);
      setFocusMusicEnabled(true);
      setIsSynthFallback(false);
    }
  };

  const handleAddPlaylistTrack = async () => {
    if (!newTrackName.trim() || !newTrackUrl.trim()) return;
    const newTrack = {
      id: crypto.randomUUID(),
      name: newTrackName.trim(),
      url: newTrackUrl.trim()
    };
    const nextList = [...savedPlaylist, newTrack];
    await savePlaylistToDb(nextList);
    setNewTrackName("");
    setNewTrackUrl("");
    setCurrentPlaylistIndex(nextList.length - 1);
  };

  const handleDeletePlaylistTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextList = savedPlaylist.filter(t => t.id !== id);
    await savePlaylistToDb(nextList);
    if (currentPlaylistIndex >= nextList.length) {
      setCurrentPlaylistIndex(Math.max(0, nextList.length - 1));
    }
  };

  const handleNextTrack = () => {
    if (savedPlaylist.length > 0) {
      setCurrentPlaylistIndex((prev) => (prev + 1) % savedPlaylist.length);
    }
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYoutubeId(activeUrl);

  return (
    <div className="relative flex flex-col items-center">
      {/* Hidden local file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleLocalFileChange}
      />

      <audio ref={audioRef} loop />

      {/* Main Bar */}
      <div className="flex items-center gap-2 rounded-2xl bg-slate-900/90 border border-white/10 p-2 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setFocusMusicEnabled(!isMusicEnabled)}
          className={`p-2 rounded-xl transition-all ${
            isMusicEnabled 
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-bold" 
              : "bg-white/5 text-slate-400 hover:text-white"
          }`}
          title={isMusicEnabled ? "Pause Soundscape" : "Play Soundscape"}
        >
          {isMusicEnabled ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        {/* Track Selector Dropdown Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/5 transition-all max-w-[170px]"
          >
            {selectedTrack.icon}
            <span className="truncate">
              {selectedTrack.id === "local" 
                ? (localFileName || "Select MP3/WAV") 
                : selectedTrack.id === "youtube"
                  ? (savedPlaylist[currentPlaylistIndex]?.name || "Custom Stream")
                  : selectedTrack.name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu (With max-height scrollable list!) */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute left-0 bottom-full mb-2 z-50 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl space-y-1 max-h-64 overflow-y-auto custom-scrollbar"
              >
                <p className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Ambience</p>

                {SOUNDS.map((sound) => (
                  <button
                    type="button"
                    key={sound.id}
                    onClick={() => {
                      if (sound.id === "local") {
                        setSelectedTrack(sound);
                        fileInputRef.current?.click();
                      } else if (sound.id === "youtube") {
                        setSelectedTrack(sound);
                      } else {
                        setSelectedTrack(sound);
                        setFocusMusicEnabled(true);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      selectedTrack.id === sound.id 
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold" 
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div>{sound.icon}</div>
                    <span className="truncate">{sound.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Volume Mute & Slider */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-white/10">
          <button
            type="button"
            onClick={() => setVolume(v => v === 0 ? 0.5 : 0)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* Floating Large & Resizable YouTube Player Window */}
      <AnimatePresence>
        {isMusicEnabled && videoId && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-24 right-6 z-50 rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-xl space-y-2.5 pointer-events-auto cursor-grab active:cursor-grabbing transition-all ${
              floatingWindowSize === "large" ? "w-[560px]" : "w-[440px]"
            }`}
          >
            {/* Header Controls */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 truncate max-w-[240px]">
                <span className="text-xs font-bold text-cyan-300 truncate">
                  🎵 {savedPlaylist[currentPlaylistIndex]?.name || "YouTube Stream"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowFloatingSettings(!showFloatingSettings)}
                  className={`p-1.5 rounded-lg transition-colors ${showFloatingSettings ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'hover:bg-white/10 text-slate-300'}`}
                  title="Playlist & Stream Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setFloatingWindowSize(s => s === "normal" ? "large" : "normal")}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
                  title={floatingWindowSize === "normal" ? "Expand Window Size" : "Shrink Window Size"}
                >
                  {floatingWindowSize === "normal" ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleNextTrack}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
                  title="Next Playlist Video"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setFocusMusicEnabled(false)}
                  className="px-2 py-1 rounded-lg text-xs bg-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/30 border border-rose-500/30"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Quick Playlist & Add Link Settings Panel (If Toggled On) */}
            {showFloatingSettings && (
              <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/20 space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Playlist Stream Switcher</p>
                <div className="space-y-1">
                  {savedPlaylist.map((track, idx) => (
                    <div
                      key={track.id}
                      onClick={() => setCurrentPlaylistIndex(idx)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                        idx === currentPlaylistIndex 
                          ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30" 
                          : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="truncate max-w-[320px]">{track.name}</span>
                      {savedPlaylist.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeletePlaylistTrack(track.id, e)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Stream URL */}
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400">Add YouTube Video Stream</p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Title"
                      value={newTrackName}
                      onChange={(e) => setNewTrackName(e.target.value)}
                      className="w-1/3 px-2 py-1 text-xs rounded-lg bg-slate-950 border border-white/10 text-white placeholder:text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="https://youtube.com/watch?v=..."
                      value={newTrackUrl}
                      onChange={(e) => setNewTrackUrl(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs rounded-lg bg-slate-950 border border-white/10 text-white placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddPlaylistTrack}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Video Iframe Container */}
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10 shadow-inner flex flex-col justify-between">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'http://localhost')}`}
                title="YouTube Audio Stream"
                className="w-full flex-1 border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-t border-white/10 text-[11px] text-slate-400">
                <span>If video shows unavailable:</span>
                <div className="flex items-center gap-2">
                  <a
                    href={savedPlaylist[currentPlaylistIndex]?.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>🌐 Open in Browser</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedTrack(SOUNDS[0])}
                    className="text-amber-400 font-semibold hover:underline"
                  >
                    🎵 Rain Audio Loop
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
