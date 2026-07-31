import { useState } from "react";
import { Headphones, Volume2, VolumeX, Sparkles, CloudRain, Disc, Play, Square } from "lucide-react";
import { audioEngine } from "@/utils/audioSynthesizer";

export function FocusAudioMixer() {
  const [isOpen, setIsOpen] = useState(false);
  const [binauralActive, setBinauralActive] = useState(false);
  const [noiseActive, setNoiseActive] = useState(false);
  const [spaceActive, setSpaceActive] = useState(false);

  const [binauralVol, setBinauralVol] = useState(0.3);
  const [noiseVol, setNoiseVol] = useState(0.2);
  const [spaceVol, setSpaceVol] = useState(0.25);

  const isAnyPlaying = binauralActive || noiseActive || spaceActive;

  const toggleBinaural = () => {
    const next = !binauralActive;
    setBinauralActive(next);
    audioEngine.toggleBinaural(next, 10, 200);
  };

  const toggleNoise = () => {
    const next = !noiseActive;
    setNoiseActive(next);
    audioEngine.toggleNoise(next);
  };

  const toggleSpace = () => {
    const next = !spaceActive;
    setSpaceActive(next);
    audioEngine.toggleSpaceDrone(next);
  };

  const stopAll = () => {
    audioEngine.stopAll();
    setBinauralActive(false);
    setNoiseActive(false);
    setSpaceActive(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm ${
          isAnyPlaying
            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse"
            : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
        }`}
        title="Ambient Focus Sound Synthesizer"
      >
        <Headphones className="w-4 h-4 text-cyan-400" />
        <span>Focus Audio</span>
        {isAnyPlaying && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 p-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">AI Ambient Synthesizer</h4>
            </div>
            {isAnyPlaying && (
              <button
                onClick={stopAll}
                className="flex items-center gap-1 text-[10px] font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
              >
                <Square className="w-2.5 h-2.5 fill-current" /> Stop All
              </button>
            )}
          </div>

          <div className="space-y-4 pt-3">
            {/* 1. Alpha Binaural Beats */}
            <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-medium text-slate-200">Alpha Beats (10Hz Focus)</span>
                </div>
                <button
                  onClick={toggleBinaural}
                  className={`p-1 rounded text-xs transition-colors ${
                    binauralActive ? "bg-cyan-500 text-slate-950 font-bold" : "bg-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {binauralActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={binauralVol}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setBinauralVol(val);
                  audioEngine.setBinauralVolume(val);
                }}
                className="w-full accent-cyan-400 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 2. Soft Pink Noise / Rain */}
            <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-xs font-medium text-slate-200">Soft Rain / Pink Noise</span>
                </div>
                <button
                  onClick={toggleNoise}
                  className={`p-1 rounded text-xs transition-colors ${
                    noiseActive ? "bg-teal-500 text-slate-950 font-bold" : "bg-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {noiseActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={noiseVol}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setNoiseVol(val);
                  audioEngine.setNoiseVolume(val);
                }}
                className="w-full accent-teal-400 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* 3. Deep Space Sub-Bass Drone */}
            <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Disc className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-medium text-slate-200">Deep Space Drone</span>
                </div>
                <button
                  onClick={toggleSpace}
                  className={`p-1 rounded text-xs transition-colors ${
                    spaceActive ? "bg-indigo-500 text-slate-950 font-bold" : "bg-slate-700 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {spaceActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={spaceVol}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpaceVol(val);
                  audioEngine.setSpaceVolume(val);
                }}
                className="w-full accent-indigo-400 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between text-[10px] text-slate-500">
            <span>100% Offline Synthesizer</span>
            <span>Zero Data Usage</span>
          </div>
        </div>
      )}
    </div>
  );
}
