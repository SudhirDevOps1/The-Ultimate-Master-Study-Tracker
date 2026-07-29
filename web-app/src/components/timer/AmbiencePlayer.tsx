import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, CloudRain, TreePine, Coffee, Hash, ChevronDown, Play, Pause, FolderOpen, Link2, SkipForward, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { db } from "@/lib/db";
const SOUNDS = [
  { 
    id: "rain", 
    name: "Rain Loops", 
    icon: <CloudRain className="w-4 h-4" />, 
    url: "https://actions.google.com/sounds/v1/water/rain_on_roof.ogg" 
  },
  { 
    id: "forest", 
    name: "Forest Birds", 
    icon: <TreePine className="w-4 h-4" />, 
    url: "https://actions.google.com/sounds/v1/nature/forest_birds.ogg" 
  },
  { 
    id: "lofi", 
    name: "Coffee Shop", 
    icon: <Coffee className="w-4 h-4" />, 
    url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg" 
  },
  { 
    id: "white_noise", 
    name: "River Streams", 
    icon: <Hash className="w-4 h-4" />, 
    url: "https://actions.google.com/sounds/v1/water/river_stream.ogg" 
  },
  {
    id: "local",
    name: "Local Audio File",
    icon: <FolderOpen className="w-4 h-4" />,
    url: ""
  },
  {
    id: "youtube",
    name: "YouTube / Link",
    icon: <Link2 className="w-4 h-4" />,
    url: ""
  }
];
export function AmbiencePlayer() {
  const isMusicEnabled = useAppStore((state: AppState) => state.focusMusicEnabled);
  const setFocusMusicEnabled = useAppStore((state: AppState) => state.setFocusMusicEnabled);
  
  const [selectedTrack, setSelectedTrack] = useState(SOUNDS[0]);
  const [volume, setVolume] = useState(0.5);
  const [isOpen, setIsOpen] = useState(false);
  
  const [localUrl, setLocalUrl] = useState<string>("");
  const [localFileName, setLocalFileName] = useState<string>("");
  // ✅ BUG FIX: Removed unused `webUrl` state that was never updated (dead code)
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const dragControls = useDragControls();
  // Playlist state
  const [savedPlaylist, setSavedPlaylist] = useState<Array<{ id: string; name: string; url: string }>>([
    { id: "p1", name: "Lofi Focus Beats (1 Hour)", url: "https://www.youtube.com/watch?v=1fueZCTYkpA" },
    { id: "p2", name: "Deep Focus Ambient", url: "https://www.youtube.com/watch?v=kgx4WGK0oNU" }
  ]);
  const [newTrackName, setNewTrackName] = useState("");
  const [newTrackUrl, setNewTrackUrl] = useState("");
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Load playlist from DB
  useEffect(() => {
    void db.settings.get("ambience_playlist").then(setting => {
      if (setting && setting.value) {
        try {
          let parsed = JSON.parse(setting.value);
          
          // Migration: if the user's local db has the old broken videos, overwrite them
          const hasBrokenLinks = parsed.some((t: any) => 
            t.url.includes("jfKfPfyJRdk") || 
            t.url.includes("5qap5aO4i9A") ||
            t.url.includes("1fueZCTYkpA") // in case this one was also broken
          );
          
          if (hasBrokenLinks) {
            parsed = [
              { id: "p1", name: "1 A.M Study Session (Lofi)", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" },
              { id: "p2", name: "Deep Focus Music (Static)", url: "https://www.youtube.com/watch?v=wXhTHyIgQ_U" }
            ];
            void db.settings.put({ key: "ambience_playlist", value: JSON.stringify(parsed) });
          }
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedPlaylist(parsed);
          }
        } catch (e) {
          console.error(e);
        }
      }
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
  }, [volume]);
  // Track switching & playback
  const activeUrl = selectedTrack.id === "youtube" ? savedPlaylist[currentPlaylistIndex]?.url || "" : selectedTrack.url;
  useEffect(() => {
    if (isMusicEnabled) {
      const isYoutubeVideo = selectedTrack.id === "youtube" && activeUrl && getYoutubeId(activeUrl);

      if (isYoutubeVideo) {
        // Stop HTML audio if YouTube iframe is handling playback
        audioRef.current?.pause();
        setAudioError(null);
      } else {
        if (selectedTrack.id === "local" && localUrl) {
          if (audioRef.current && audioRef.current.src !== localUrl) {
            audioRef.current.src = localUrl;
            audioRef.current.load();
          }
        } else if (selectedTrack.id === "youtube" && activeUrl && !getYoutubeId(activeUrl)) {
          if (audioRef.current && audioRef.current.src !== activeUrl) {
            audioRef.current.src = activeUrl;
            audioRef.current.load();
          }
        } else if (selectedTrack.url) {
          if (audioRef.current && audioRef.current.src !== selectedTrack.url) {
            audioRef.current.src = selectedTrack.url;
            audioRef.current.load();
          }
        }

        audioRef.current?.play().catch(e => {
          console.log("Audio play blocked, waiting for user interaction.", e);
        });
      }
    } else {
      audioRef.current?.pause();
    }
  }, [isMusicEnabled, selectedTrack, localUrl, activeUrl]);
  useEffect(() => {
    return () => {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [localUrl]);
  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (localUrl) URL.revokeObjectURL(localUrl);
      const url = URL.createObjectURL(file);
      setLocalUrl(url);
      setLocalFileName(file.name);
      setFocusMusicEnabled(true);
    }
  };
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  const videoId = getYoutubeId(activeUrl);
  const handleNextTrack = () => {
    if (selectedTrack.id === "youtube" && savedPlaylist.length > 0) {
      const nextIndex = (currentPlaylistIndex + 1) % savedPlaylist.length;
      setCurrentPlaylistIndex(nextIndex);
      setFocusMusicEnabled(true);
    }
  };
  const handleAddTrack = () => {
    if (!newTrackUrl.trim() || !newTrackName.trim()) return;
    const newList = [
      ...savedPlaylist,
      { id: crypto.randomUUID(), name: newTrackName.trim(), url: newTrackUrl.trim() }
    ];
    void savePlaylistToDb(newList);
    setNewTrackName("");
    setNewTrackUrl("");
  };
  const handleDeleteTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newList = savedPlaylist.filter(t => t.id !== id);
    void savePlaylistToDb(newList);
    if (currentPlaylistIndex >= newList.length) {
      setCurrentPlaylistIndex(Math.max(0, newList.length - 1));
    }
  };
  return (
    <div className="flex flex-col gap-2 relative">
      <div className="flex items-center gap-2 bg-slate-900/60 border border-white/10 rounded-2xl p-1.5 px-3 backdrop-blur-xl">
        {/* Play/Pause Button */}
        <button
          onClick={() => setFocusMusicEnabled(!isMusicEnabled)}
          className={`flex items-center justify-center p-2 rounded-xl transition-all ${
            isMusicEnabled 
              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20" 
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
          title={isMusicEnabled ? "Pause Ambience" : "Play Ambience"}
        >
          {isMusicEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        {/* Skip Button for YouTube playlist */}
        {selectedTrack.id === "youtube" && savedPlaylist.length > 1 && (
          <button
            onClick={handleNextTrack}
            className="flex items-center justify-center p-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"
            title="Next saved stream"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Sound Selection Button */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2.5 py-2 transition-colors text-slate-300 hover:text-white"
          >
            <div className="text-cyan-400">
              {selectedTrack.icon}
            </div>
            <span className="text-sm font-semibold max-w-[95px] truncate">
              {selectedTrack.id === "local" && localFileName 
                ? localFileName 
                : selectedTrack.id === "youtube" && savedPlaylist[currentPlaylistIndex]
                  ? savedPlaylist[currentPlaylistIndex].name 
                  : selectedTrack.name}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Dropdown Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full mt-2 left-0 w-52 bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl z-[999] overflow-hidden"
              >
                {SOUNDS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setSelectedTrack(track);
                      setIsOpen(false);
                      if (track.id === "local") {
                        fileInputRef.current?.click();
                      } else if (track.id === "youtube") {
                        setIsUrlInputOpen(true);
                      } else {
                        setIsUrlInputOpen(false);
                      }
                    }}
                    className={`flex items-center gap-3 w-full p-3 text-sm text-left transition-colors hover:bg-white/10 ${
                      selectedTrack.id === track.id ? "text-cyan-400 bg-white/5" : "text-slate-300"
                    }`}
                  >
                    <div className={`${selectedTrack.id === track.id ? "text-cyan-400" : "text-slate-500"}`}>
                      {track.icon}
                    </div>
                    <span className="font-semibold">{track.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="w-[1px] h-6 bg-white/10 mx-1" />
        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setVolume(v => v === 0 ? 0.5 : 0)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>
      {/* Hidden file input for Local Audio */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="audio/*" 
        className="hidden" 
        onChange={handleLocalFileChange}
      />
      {/* Playlist & Add Track Form */}
      {selectedTrack.id === "youtube" && isUrlInputOpen && (
        <div className="flex flex-col gap-3 p-3 bg-slate-900/95 border border-white/10 rounded-2xl w-80 max-w-sm shadow-2xl z-30 absolute top-full mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">🎵 Saved Stream Playlist</span>
            <button onClick={() => setIsUrlInputOpen(false)} className="text-xs text-slate-500 hover:text-white">✕ Hide</button>
          </div>
          
          {/* Playlist Tracks List */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pretty-scrollbar pr-1">
            {savedPlaylist.map((track, i) => (
              <div 
                key={track.id} 
                onClick={() => {
                  setCurrentPlaylistIndex(i);
                  setFocusMusicEnabled(true);
                }}
                className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border ${
                  currentPlaylistIndex === i 
                    ? "bg-cyan-500/10 border-cyan-400/25 text-cyan-300 font-bold" 
                    : "bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5"
                }`}
              >
                <span className="truncate pr-2">{track.name}</span>
                <button 
                  onClick={(e) => handleDeleteTrack(track.id, e)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {savedPlaylist.length === 0 && (
              <p className="text-[10px] text-slate-500 text-center py-2">No custom links saved yet.</p>
            )}
          </div>
          <div className="border-t border-white/10 pt-2 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Add custom Link:</span>
            <input
              type="text"
              placeholder="Track Name (e.g. Chillhop Lofi)"
              value={newTrackName}
              onChange={(e) => setNewTrackName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste YouTube or direct MP3 link..."
                value={newTrackUrl}
                onChange={(e) => setNewTrackUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button 
                onClick={handleAddTrack}
                className="bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Embedded YouTube video card if videoId exists and music is enabled */}
      {selectedTrack.id === "youtube" && videoId && isMusicEnabled && (
        <motion.div 
          drag 
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          className="fixed bottom-6 right-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-1 shadow-2xl z-[9999] w-[380px] max-w-[90vw] backdrop-blur-xl"
        >
          <div 
            className="flex items-center justify-between p-1.5 px-2.5 cursor-move hover:bg-white/5 rounded-t-xl transition-colors"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 select-none pointer-events-none">
              <span className="mr-1">✥</span> Drag here
            </span>
            <button 
              onPointerDown={(e) => e.stopPropagation()} 
              onClick={() => setFocusMusicEnabled(false)} 
              className="text-[10px] text-rose-400 font-bold hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="pointer-events-auto border-t border-white/10 pt-1">
            <iframe
              width="100%"
              height="220"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&loop=1&playlist=${videoId}&controls=1&rel=0`}
              title="Focus YouTube Stream"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="rounded-xl bg-black"
            ></iframe>
          </div>
        </motion.div>
      )}
      {/* HTML5 Audio element for standard looping tracks */}
      <audio
        ref={audioRef}
        loop
        onError={() => setAudioError("⚠️ Audio failed to load. Try a different track or check your internet.")}
        onCanPlay={() => setAudioError(null)}
      />
      {/* ✅ BUG FIX: Show audio error state so user knows when sound is unavailable */}
      {audioError && isMusicEnabled && (
        <p className="text-[10px] text-amber-400 px-1 mt-1 max-w-xs">{audioError}</p>
      )}
    </div>
  );
}
