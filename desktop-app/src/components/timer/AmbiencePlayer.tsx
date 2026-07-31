import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, CloudRain, TreePine, Coffee, Hash, ChevronDown, Play, Pause, FolderOpen, Link2, SkipForward, Plus, Trash2, Sparkles } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { db } from "@/lib/db";
import { audioEngine } from "@/utils/audioSynthesizer";

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
  const [isSynthFallback, setIsSynthFallback] = useState(false);
  
  const [localUrl, setLocalUrl] = useState<string>("");
  const [localFileName, setLocalFileName] = useState<string>("");
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const dragControls = useDragControls();

  // Playlist state
  const [savedPlaylist, setSavedPlaylist] = useState<Array<{ id: string; name: string; url: string }>>([
    { id: "p1", name: "1 A.M Study Session (Lofi)", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" },
    { id: "p2", name: "Deep Focus Music (Static)", url: "https://www.youtube.com/watch?v=wXhTHyIgQ_U" }
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
    audioEngine.setNoiseVolume(volume);
    audioEngine.setBinauralVolume(volume);
    audioEngine.setSpaceVolume(volume);
  }, [volume]);

  // Track switching & playback
  const activeUrl = selectedTrack.id === "youtube" ? savedPlaylist[currentPlaylistIndex]?.url || "" : selectedTrack.url;

  useEffect(() => {
    if (isMusicEnabled) {
      const isYoutubeVideo = selectedTrack.id === "youtube" && activeUrl && getYoutubeId(activeUrl);

      if (isYoutubeVideo) {
        audioRef.current?.pause();
        audioEngine.stopAll();
        setIsSynthFallback(false);
        setAudioError(null);
      } else {
        setIsSynthFallback(false);
        setAudioError(null);

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
          console.log("Network audio blocked/failed, switching to offline synthesizer.", e);
          triggerOfflineSynth();
        });
      }
    } else {
      audioRef.current?.pause();
      audioEngine.stopAll();
      setIsSynthFallback(false);
    }
  }, [isMusicEnabled, selectedTrack, localUrl, activeUrl]);

  const triggerOfflineSynth = () => {
    setIsSynthFallback(true);
    setAudioError(null);
    audioEngine.toggleNoise(true);
    audioEngine.toggleBinaural(true);
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
    <div className="flex flex-col gap-1.5 relative w-full max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 border border-white/10 rounded-2xl p-2 px-3 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          {/* Play/Pause Button */}
          <button
            onClick={() => setFocusMusicEnabled(!isMusicEnabled)}
            className={`flex items-center justify-center p-2 rounded-xl transition-all shrink-0 ${
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
              className="flex items-center justify-center p-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 shrink-0"
              title="Next saved stream"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Sound Selection Button */}
          <div className="relative shrink min-w-0">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 hover:bg-white/5 rounded-xl px-2 py-1.5 transition-colors text-slate-300 hover:text-white max-w-full"
            >
              <div className="text-cyan-400 shrink-0">
                {selectedTrack.icon}
              </div>
              <span className="text-xs font-semibold truncate max-w-[110px] sm:max-w-[140px]">
                {selectedTrack.id === "local" && localFileName 
                  ? localFileName 
                  : selectedTrack.id === "youtube" && savedPlaylist[currentPlaylistIndex]
                    ? savedPlaylist[currentPlaylistIndex].name 
                    : selectedTrack.name}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 left-0 w-56 bg-slate-950/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl z-[999] overflow-hidden"
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
                      className={`flex items-center gap-3 w-full p-2.5 text-xs text-left transition-colors hover:bg-white/10 ${
                        selectedTrack.id === track.id ? "text-cyan-400 bg-white/5" : "text-slate-300"
                      }`}
                    >
                      <div className={`${selectedTrack.id === track.id ? "text-cyan-400" : "text-slate-500"}`}>
                        {track.icon}
                      </div>
                      <span className="font-semibold truncate">{track.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setVolume(v => v === 0 ? 0.5 : 0)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-14 sm:w-16 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500"
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
                <span className="truncate max-w-[180px]">{track.name}</span>
                <button
                  onClick={(e) => handleDeleteTrack(track.id, e)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add custom track */}
          <div className="border-t border-white/10 pt-2 space-y-2">
            <input
              type="text"
              placeholder="Stream Title"
              value={newTrackName}
              onChange={(e) => setNewTrackName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="YouTube URL"
                value={newTrackUrl}
                onChange={(e) => setNewTrackUrl(e.target.value)}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleAddTrack}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Picture-in-Picture YouTube Video Player */}
      {selectedTrack.id === "youtube" && isMusicEnabled && videoId && (
        <motion.div 
          drag
          dragControls={dragControls}
          dragMomentum={false}
          className="fixed bottom-6 right-6 z-[9999] w-80 sm:w-96 bg-slate-950/95 border border-cyan-500/30 rounded-2xl p-2.5 shadow-2xl shadow-cyan-950/50 backdrop-blur-2xl"
        >
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center justify-between px-1 pb-2 cursor-grab active:cursor-grabbing border-b border-white/10 mb-2 select-none"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">
                {savedPlaylist[currentPlaylistIndex]?.name || "YouTube Stream"}
              </span>
            </div>
            <button 
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
        onError={() => triggerOfflineSynth()}
        onCanPlay={() => {
          setAudioError(null);
          setIsSynthFallback(false);
        }}
      />

      {/* Offline Synthetic Synthesizer Status Indicator */}
      {isSynthFallback && isMusicEnabled && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-medium px-1 mt-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-1">
          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
          <span>100% Offline AI Focus Synthesizer Active</span>
        </div>
      )}

      {audioError && isMusicEnabled && !isSynthFallback && (
        <p className="text-[10px] text-amber-400 px-1 mt-0.5 max-w-xs">{audioError}</p>
      )}
    </div>
  );
}
