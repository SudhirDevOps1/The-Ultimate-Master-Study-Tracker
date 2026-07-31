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
          console.log("Network audio blocked/failed, switching to offline soundscape synthesizer.", e);
          triggerOfflineSynth();
        });
      }
    } else {
      audioRef.current?.pause();
      audioEngine.toggleNoise(false);
      setIsSynthFallback(false);
    }
  }, [isMusicEnabled, selectedTrack, localUrl, activeUrl]);

  const triggerOfflineSynth = () => {
    setIsSynthFallback(true);
    setAudioError(null);
    audioEngine.toggleNoise(true);
  };

  useEffect(() => {
    return () => {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
      audioEngine.toggleNoise(false);
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
      setAudioError(null);
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
        type="file"
        ref={fileInputRef}
        onChange={handleLocalFileChange}
        accept="audio/*"
        className="hidden"
      />

      <div className="glass flex items-center justify-between gap-2.5 rounded-2xl border border-white/10 px-3 py-2 text-white shadow-xl backdrop-blur-md max-w-full">
        {/* Play / Pause Toggle Button */}
        <button
          type="button"
          onClick={() => setFocusMusicEnabled(!isMusicEnabled)}
          className={`flex items-center justify-center p-2.5 rounded-xl transition-all shrink-0 ${
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
            type="button"
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
            type="button"
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
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute left-0 bottom-full mb-2 z-50 w-64 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl space-y-1"
              >
                <p className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Ambience</p>

                {SOUNDS.map((sound) => (
                  <button
                    type="button"
                    key={sound.id}
                    onClick={() => {
                      if (sound.id === "local") {
                        fileInputRef.current?.click();
                      } else if (sound.id === "youtube") {
                        setSelectedTrack(sound);
                        setIsUrlInputOpen(true);
                      } else {
                        setSelectedTrack(sound);
                        setFocusMusicEnabled(true);
                      }
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      selectedTrack.id === sound.id 
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" 
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="text-cyan-400">{sound.icon}</div>
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
            className="w-14 sm:w-16 accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Floating YouTube Embed Box */}
      {isMusicEnabled && selectedTrack.id === "youtube" && videoId && (
        <motion.div 
          drag
          dragControls={dragControls}
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-2xl border border-cyan-500/30 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl space-y-2 pointer-events-auto"
        >
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center justify-between cursor-move pb-1"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200 truncate max-w-[200px]">
                {savedPlaylist[currentPlaylistIndex]?.name || "YouTube Stream"}
              </span>
            </div>
            <button 
              type="button"
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
          audioEngine.toggleNoise(false);
        }}
        onPlay={() => {
          setAudioError(null);
          setIsSynthFallback(false);
          audioEngine.toggleNoise(false);
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
