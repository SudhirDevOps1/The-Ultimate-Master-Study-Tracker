import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, ShieldAlert, SkipForward, RefreshCw } from "lucide-react";
import { Panel } from "@/components/common/Panel";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { VideoSchedule } from "@/types/models";
import { useTimer } from "@/hooks/useTimer";

const videoSources = [
  "https://assets.mixkit.co/videos/preview/mixkit-curious-cat-watching-tv-40854-large.mp4",
  "https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4"
];

export function VideoRestBreak() {
  const { activeSession, elapsedSeconds } = useTimer();
  const pauseSession = useAppStore((state: AppState) => state.pauseSession);
  const resumeSession = useAppStore((state: AppState) => state.resumeSession);

  const [schedule, setSchedule] = useState<VideoSchedule>(() => {
    const local = localStorage.getItem("video_schedule");
    return local ? JSON.parse(local) : {
      enabled: true,
      intervalMinutes: 60,
      restMinutes: 10,
      lastPlayedAt: null,
      videosPlayed: 0,
      autoPlay: true
    };
  });

  const [showOverlay, setShowOverlay] = useState(false);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Monitor continuous study time and trigger break
  useEffect(() => {
    if (!schedule.enabled || !activeSession || elapsedSeconds <= 0) return;

    const thresholdSeconds = schedule.intervalMinutes * 60;
    // Check if we hit the study interval milestone
    if (elapsedSeconds > 0 && elapsedSeconds % thresholdSeconds === 0) {
      void triggerBreak();
    }
  }, [elapsedSeconds, activeSession, schedule.enabled, schedule.intervalMinutes]);

  const triggerBreak = async () => {
    // Pause focus session
    await pauseSession();
    
    // Setup break timer
    setSecondsRemaining(schedule.restMinutes * 60);
    setShowOverlay(true);
    setIsPlaying(true);
    setIsMuted(true); // browser policy autoplay standard

    // Trigger Desktop Notification if permitted
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("FlowTrack Rest Break! 🎬", {
        body: `Time for a ${schedule.restMinutes}-minute break. Watch a relaxing video!`,
        tag: "rest-break",
        badge: "🎬"
      });
    }
  };

  // Rest countdown ticks
  useEffect(() => {
    if (!showOverlay || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowOverlay(false);
          // Show focus notification when done
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Time to focus! 🎯", {
              body: "Your rest break is complete. Let's resume studying!",
              tag: "rest-break-end"
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showOverlay, secondsRemaining]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        void videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const nextVideo = () => {
    setCurrentVideoIdx(prev => (prev + 1) % videoSources.length);
    setIsPlaying(true);
  };

  const endBreakEarly = async () => {
    setShowOverlay(false);
    await resumeSession();
  };

  const saveSettings = (updated: VideoSchedule) => {
    setSchedule(updated);
    localStorage.setItem("video_schedule", JSON.stringify(updated));
    setShowSettings(false);
  };

  const formatMinSec = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${String(s).padStart(2, "0")}`;
  };

  return (
    <>
      {/* Floating Rest mini settings toggle */}
      <div className="fixed bottom-4 right-18 z-40">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-full bg-slate-900 border border-white/10 hover:border-cyan-400 text-cyan-400 shadow-xl transition-all hover:scale-105 active:scale-95"
          title="Video Rest Settings"
        >
          🎬
        </button>
      </div>

      {/* Mini-settings drawer overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 right-4 z-40 w-80"
          >
            <Panel className="space-y-4 shadow-2xl border border-cyan-500/20 bg-slate-900/95 backdrop-blur-md">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-sm font-bold text-white">🎬 Rest Break Scheduler</span>
                <button onClick={() => setShowSettings(false)} className="text-xs text-slate-400">✕</button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Enable Rest Breaks</span>
                <button
                  onClick={() => saveSettings({ ...schedule, enabled: !schedule.enabled })}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${
                    schedule.enabled ? "bg-cyan-500" : "bg-slate-700"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full transition-transform ${
                    schedule.enabled ? "translate-x-4.5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span>Study Interval</span>
                  <span>{schedule.intervalMinutes} Mins</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={schedule.intervalMinutes}
                  onChange={(e) => setSchedule({ ...schedule, intervalMinutes: Number(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="space-y-1">
                <label className="flex justify-between text-[10px] text-slate-400 uppercase font-bold">
                  <span>Rest Duration</span>
                  <span>{schedule.restMinutes} Mins</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="30"
                  value={schedule.restMinutes}
                  onChange={(e) => setSchedule({ ...schedule, restMinutes: Number(e.target.value) })}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => saveSettings(schedule)}
                  className="w-full py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen break video overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 px-4"
          >
            <div className="w-full max-w-4xl space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between text-white">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span>🎬</span> Rest Break Time!
                  </h2>
                  <p className="text-xs text-slate-400">Step back, relax, stretch your shoulders.</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-cyan-400 tracking-wider">
                    {formatMinSec(secondsRemaining)}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-500">remaining rest time</p>
                </div>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
                <video
                  ref={videoRef}
                  src={videoSources[currentVideoIdx]}
                  autoPlay
                  loop
                  muted={isMuted}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay controls */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/40 backdrop-blur-sm p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={toggleMute}
                      className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={nextVideo}
                      className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={endBreakEarly}
                    className="px-4 py-2 rounded-lg bg-cyan-400 text-slate-950 text-xs font-bold hover:bg-cyan-300 transition-transform active:scale-95"
                  >
                    Skip Rest & Study
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
