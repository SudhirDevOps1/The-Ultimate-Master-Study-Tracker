import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { 
  BookOpen, Sparkles, Cpu, HardDrive, ShieldCheck, Bug, HelpCircle, 
  UserCheck, Terminal, Layers, Code, Zap, CheckCircle2, AlertTriangle, 
  FolderOpen, ExternalLink, Activity, Search, RefreshCw, FileText, ArrowRight, Heart 
} from "lucide-react";

export function GuidePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "features" | "tech" | "fixes" | "storage" | "limitations" | "developer" | "credits">("overview");

  const appInfo = {
    name: "FlowTrack Pro – Smart Study & Productivity Tracker",
    version: "v6.0.0 (Latest 2026 Stable Release)",
    developer: "Sudhir DevOps (FlowTrack Engineering Team)",
    repo: "SudhirDevOps1/The-Ultimate-Master-Study-Tracker",
    techStack: ["React 18", "TypeScript 5", "Vite 7", "Electron 43", "TailwindCSS", "Dexie.js IndexedDB", "Web Audio API", "Framer Motion"],
  };

  const tabs = [
    { id: "overview", label: "🌟 App Overview", icon: <BookOpen className="w-4 h-4" /> },
    { id: "features", label: "🚀 Feature Matrix", icon: <Zap className="w-4 h-4" /> },
    { id: "tech", label: "🛠️ Tech Architecture", icon: <Cpu className="w-4 h-4" /> },
    { id: "fixes", label: "🐛 Solved in v6.0.0", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
    { id: "storage", label: "📂 Data Storage Paths", icon: <HardDrive className="w-4 h-4" /> },
    { id: "limitations", label: "⚠️ System Requirements", icon: <AlertTriangle className="w-4 h-4 text-amber-400" /> },
    { id: "developer", label: "👨‍💻 Developer & Credits", icon: <UserCheck className="w-4 h-4" /> },
    { id: "credits", label: "🎁 Open-Source Thanks & Links", icon: <Heart className="w-4 h-4 text-rose-400 animate-pulse" /> },
  ];

  const features = [
    {
      title: "🔍 Live Application & Active Window Tracking",
      descEn: "Background process hook monitors active windows (Chrome, VS Code, Zoom, etc.), records time spent, and classifies apps into Productive, Distracting, or Neutral categories.",
      descHi: "बैकग्राउंड प्रोसेस ऑटोमैटिकली एक्टिव विंडोज (Chrome, VS Code, आदि) को ट्रैक करता है और टाइम को Productive, Distracting या Neutral कैटेगरीज में बांटता है।",
      icon: "🖥️",
      tag: "Native Desktop Hook"
    },
    {
      title: "⏱️ Timestamp-Based Strict Study Timer",
      descEn: "Uses absolute Unix timestamps (Date.now()) instead of simple setInterval state. Prevents timer lag, system clock drift, or background tab throttling. Throttled interaction tracking at 10-second intervals for 0% CPU stuttering.",
      descHi: "Unix timestamps का उपयोग करके 100% सटीक टाइमिंग देता है। 10-सेकंड इवेंट थ्रॉटलिंग से CPU लैग और हैंगिंग बिल्कुल खत्म हो जाती है।",
      icon: "⏱️",
      tag: "Zero Lag Engine"
    },
    {
      title: "📺 Floating Picture-in-Picture (PiP) Mode",
      descEn: "Opens a mini floating widget that stays on top of all Windows applications (PDFs, coding IDEs, lectures) so you can pause/play without switching windows.",
      descHi: "एक फ्लोटिंग विजेट खोलता है जो सभी ऐप्स के ऊपर रहता है, ताकि आप PDF पढ़ते या कोडिंग करते समय आसानी से टाइमर कंट्रोल कर सकें।",
      icon: "📺",
      tag: "Always-On-Top"
    },
    {
      title: "🎵 100% Offline AI Focus Soundscapes",
      descEn: "Features a dual-engine sound player. If network stream audio fails or offline, Web Audio API Native Synthesizer automatically generates procedural binaural 10Hz alpha focus beats and rain noise.",
      descHi: "डुअल-इंजन साउंड प्लेयर: ऑनलाइन स्ट्रीम फेल होने या इंटरनेट बंद होने पर Web Audio API अपने आप 100% ऑफलाइन बाइन्यूरल बीट्स और रेन साउंड्स जनरेट करता है।",
      icon: "🎵",
      tag: "Offline Synthesizer"
    },
    {
      title: "🎴 SuperMemo-2 Spaced Repetition Flashcards",
      descEn: "Uses the scientific SuperMemo-2 algorithm to calculate optimal memory retention intervals based on difficulty ratings (1 to 5).",
      descHi: "वैज्ञानिक SuperMemo-2 एल्गोरिदम का उपयोग करके याददाश्त के अनुसार अगली रिविजन डेट तय करता है।",
      icon: "🎴",
      tag: "SRS Algorithm"
    },
    {
      title: "🧠 Interactive Mind Maps & Canvas Workspace",
      descEn: "Powered by Excalidraw engine for drawing visual study notes, mind maps, diagramming, and PDF/OCR reference integration.",
      descHi: "Excalidraw पावर्ड विजुअल कैनवास बोर्ड जहाँ आप माइंड मैप्स, नोट्स और फ्लोचार्ट्स बना सकते हैं।",
      icon: "🧠",
      tag: "Visual Board"
    },
    {
      title: "🤖 Local Ollama AI Assistant & Cloud AI Proxies",
      descEn: "100% private offline AI setup with Ollama (Llama 3.2, DeepSeek-R1) or free high-speed cloud AI proxies for study planning and instant code/concept explanations.",
      descHi: "ओलामा (Ollama) के साथ 100% प्राइवेट लोकल एआई या फ्री क्लाउड एआई जिससे स्टडी हेल्प और कॉन्सेप्ट एक्सप्लेनेशन मिलती है।",
      icon: "🤖",
      tag: "Privacy AI"
    },
  ];

  const fixesv550 = [
    {
      title: "Backend Activity Panel IPC Handler Mismatch Fix",
      issue: "BackendActivityPanel invoked 'get-foreground-window', but electron.js only registered 'get-active-window', throwing unhandled promise rejections and displaying blank cards.",
      solution: "Registered 'get-foreground-window' dual-alias in electron.js and updated BackendActivityPanel with safe fallback property mapping (appName || process || title).",
      icon: "🐛"
    },
    {
      title: "Timer UI Lag & Mouse Listener Throttling",
      issue: "High-frequency mousemove listeners triggered setNowMs on every mouse pixel, causing CPU rendering storms and UI lag.",
      solution: "Throttled interaction listeners in useTimer.ts to 10-second intervals and reduced study completion verification threshold to 5s.",
      icon: "⚡"
    },
    {
      title: "Audio Loading Failure & Offline Soundscapes",
      issue: "External audio URLs displayed '⚠️ Audio failed to load' when offline or blocked by CORS.",
      solution: "Connected AmbiencePlayer to Web Audio Synthesizer (audioEngine) for instant 100% offline procedural rain & binaural alpha beats synthesis.",
      icon: "🎵"
    },
    {
      title: "Exposed Storage Paths & Open Logs Folder Button",
      issue: "Users could not easily locate where activity logs and database files were stored.",
      solution: "Added dynamic AppData path renderer and '📂 Open Logs Folder' IPC button under Settings > FlowTrack Pro Desktop App panel.",
      icon: "📂"
    },
    {
      title: "Ecosystem Type Safety & Zero Compilation Errors",
      issue: "ThemeName union type mismatch across desktop-app and web-app models.",
      solution: "Unified ThemeName union and added optional model fields (createdAt, updatedAt, TimerSnapshot, ThemeConfig), achieving 0 tsc errors across both apps.",
      icon: "🛡️"
    }
  ];

  const openSourceCredits = [
    { name: "React 18", url: "https://react.dev", desc: "The library for web and native user interfaces", type: "Core UI Framework" },
    { name: "Vite 7", url: "https://vitejs.dev", desc: "Next Generation Frontend Tooling & Fast HMR Bundler", type: "Build Engine" },
    { name: "TypeScript 5", url: "https://www.typescriptlang.org", desc: "JavaScript with syntax for types and strict compile safety", type: "Compiler & Type System" },
    { name: "Electron 43", url: "https://www.electronjs.org", desc: "Build cross-platform desktop apps with JavaScript, HTML, and CSS", type: "Desktop Runtime" },
    { name: "Dexie.js / IndexedDB", url: "https://dexie.org", desc: "A Minimalistic Wrapper for IndexedDB offline local database", type: "Offline Storage" },
    { name: "Excalidraw Engine", url: "https://excalidraw.com", desc: "Virtual whiteboard & diagramming tool engine for Mind Maps", type: "Canvas Engine" },
    { name: "Lucide Icons", url: "https://lucide.dev", desc: "Beautiful & consistent open-source vector icon set", type: "UI Assets" },
    { name: "Tailwind CSS", url: "https://tailwindcss.com", desc: "Utility-first CSS framework for rapid UI styling", type: "Design System" },
    { name: "Framer Motion", url: "https://www.framer.com/motion", desc: "Production-ready motion library for React", type: "Animation Library" },
    { name: "Recharts", url: "https://recharts.org", desc: "Redefined chart library built with React and D3", type: "Data Analytics Charts" },
    { name: "Ollama AI", url: "https://ollama.com", desc: "Get up and running with Llama 3.2, DeepSeek & local LLMs", type: "Offline AI LLM Runtime" },
    { name: "KaTeX Math", url: "https://katex.org", desc: "Fast math typesetting library for LaTeX formula rendering", type: "LaTeX Renderer" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-6xl mx-auto space-y-6 pb-12"
    >
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-400/20 px-3.5 py-1 text-xs font-bold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Official Documentation & User Master Guide
            </div>
            <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-mono font-bold text-slate-300 border border-white/10">
              {appInfo.version}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            FlowTrack Pro <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent italic">Desktop Guide & Architecture</span>
          </h1>

          <p className="max-w-3xl text-sm sm:text-base text-slate-300 leading-relaxed">
            FlowTrack Pro is a 100% privacy-first, offline-capable desktop study tracker engineered to help you maximize focus, track application usage, maintain spaced repetition learning, and eliminate digital distractions.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs text-slate-400 font-medium">Core Stack:</span>
            {appInfo.techStack.slice(0, 5).map((tech, i) => (
              <span key={i} className="rounded-lg bg-slate-800/80 border border-white/10 px-2.5 py-1 text-[11px] font-mono text-cyan-300">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 pretty-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-cyan-400/40 shadow-lg shadow-indigo-950/50"
                : "bg-slate-900/60 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT AREAS */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel className="space-y-4 border-l-4 border-cyan-500">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🛡️ What is FlowTrack Pro?</span>
            </h2>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                <strong>English:</strong> FlowTrack Pro is a privacy-first, high-performance desktop application designed for students, engineers, and competitive exam aspirants. Unlike traditional web trackers, all activity tracking, study timestamps, and notes remain 100% stored on your local hard drive.
              </p>
              <p>
                <strong>Hindi:</strong> FlowTrack Pro एक 'Privacy-First' और हाई-परफॉर्मेस डेस्कटॉप ऐप है जिसे छात्रों, कोडिंग इंजीनियर्स और प्रतियोगी परीक्षाओं के अभ्यर्थियों के लिए बनाया गया है। इसमें आपका सारा डेटा केवल आपके कंप्यूटर पर ही सुरक्षित रहता है।
              </p>
            </div>
          </Panel>

          <Panel className="space-y-4 border-l-4 border-purple-500">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🚀 Quick Start Guide / शुरुआत कैसे करें</span>
            </h2>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-300">
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs">1</span>
                <div><strong>Add Subjects:</strong> Go to <code>Subjects</code> tab, define target hours, and set weekly goals.</div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs">2</span>
                <div><strong>Start Study Timer:</strong> Go to <code>Timer</code> page and hit Start. Turn on Focus Soundscapes for noise cancellation.</div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs">3</span>
                <div><strong>Enable PiP Floating Timer:</strong> Click <code>Open Floating Timer</code> to keep time visible over PDFs or VS Code.</div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">4</span>
                <div><strong>Analyze App Tracking:</strong> Open <code>App Tracking</code> to inspect productive vs distracting software usage.</div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 2: FEATURE MATRIX */}
      {activeTab === "features" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feat, i) => (
            <Panel key={i} className="space-y-3 p-5 flex flex-col justify-between hover:border-white/20 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl">{feat.icon}</span>
                  <span className="rounded-full bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{feat.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{feat.descEn}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed italic pt-1 border-t border-white/5">{feat.descHi}</p>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* TAB 3: TECH ARCHITECTURE */}
      {activeTab === "tech" && (
        <Panel className="space-y-6 p-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-6 h-6 text-cyan-400" />
              Desktop App Engineering & Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-1">Under-the-hood technologies powering FlowTrack Pro Desktop Engine</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">1. Core Frontend & Framework</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex gap-2"><strong>React 18 & TypeScript 5:</strong> Strict type parity across models with zero compiler warnings.</li>
                <li className="flex gap-2"><strong>Vite 7 Bundler:</strong> Code-splitting chunks (React Core, Charts, Excalidraw) for instant sub-second app start.</li>
                <li className="flex gap-2"><strong>TailwindCSS & Framer Motion:</strong> Glassmorphism styling with 60 FPS smooth animations.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">2. Electron & Native Process Hook</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex gap-2"><strong>Electron 43 Shell:</strong> Multi-window IPC communication bridge.</li>
                <li className="flex gap-2"><strong>C++ Native Tracker (win-tracker.exe):</strong> Background Windows process watcher querying Win32 GetForegroundWindow API.</li>
                <li className="flex gap-2"><strong>Throttled Interactions:</strong> Mouse and keyboard event listeners throttled to 10s intervals for zero CPU overhead.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">3. Storage Engine</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex gap-2"><strong>Dexie.js (IndexedDB):</strong> Fast browser-native database storing subjects, sessions, flashcards, notes.</li>
                <li className="flex gap-2"><strong>JSON Activity Log Engine:</strong> Daily logs written directly to <code>AppData/Roaming/FlowTrack Pro/activity-log/*.json</code>.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">4. Sound & AI Engine</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex gap-2"><strong>Web Audio API Synthesizer:</strong> Procedural offline sound generator producing binaural 10Hz alpha beats and rain noise.</li>
                <li className="flex gap-2"><strong>Ollama Local AI API:</strong> Private local AI integration with hardware profile auto-detection.</li>
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {/* TAB 4: SOLVED IN V6.0.0 */}
      {activeTab === "fixes" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-bold">v6.0.0 Master Release Fixes Audit — All reported issues resolved!</span>
            <span className="font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-[10px]">100% Tested</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {fixesv550.map((fix, idx) => (
              <Panel key={idx} className="space-y-3 p-5 border-l-4 border-emerald-400">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span>{fix.icon}</span>
                  <h3>{fix.title}</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-rose-300">
                    <strong>Root Cause / Bug:</strong> {fix.issue}
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-300">
                    <strong>Applied Solution:</strong> {fix.solution}
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: STORAGE PATHS */}
      {activeTab === "storage" && (
        <Panel className="space-y-6 p-6 border-l-4 border-cyan-400">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-cyan-400" />
              App Data Storage Locations & File Paths
            </h2>
            <p className="text-xs text-slate-400 mt-1">Exact directories on your Windows Desktop where data is saved</p>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
              <div className="text-cyan-400 font-bold">1. Daily App Tracking JSON Logs:</div>
              <div className="text-slate-300 break-all bg-white/5 p-2 rounded-xl">
                C:\Users\&lt;Your-Username&gt;\AppData\Roaming\FlowTrack Pro\activity-log\YYYY-MM-DD.json
              </div>
              <p className="text-[11px] font-sans text-slate-400">Stores active window titles, process names, duration in seconds for each app used today.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
              <div className="text-purple-400 font-bold">2. Subjects & Study Sessions Database (IndexedDB):</div>
              <div className="text-slate-300 break-all bg-white/5 p-2 rounded-xl">
                C:\Users\&lt;Your-Username&gt;\AppData\Roaming\FlowTrack Pro\IndexedDB\
              </div>
              <p className="text-[11px] font-sans text-slate-400">Stores your subjects, completed timer sessions, flashcard decks, notes, and user settings.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
              <div className="text-emerald-400 font-bold">3. Preferences & App State:</div>
              <div className="text-slate-300 break-all bg-white/5 p-2 rounded-xl">
                C:\Users\&lt;Your-Username&gt;\AppData\Roaming\FlowTrack Pro\Local Storage\
              </div>
              <p className="text-[11px] font-sans text-slate-400">Stores UI theme selection, tray minimize behavior, and local audio preferences.</p>
            </div>
          </div>
        </Panel>
      )}

      {/* TAB 6: SYSTEM REQUIREMENTS & LIMITATIONS */}
      {activeTab === "limitations" && (
        <Panel className="space-y-5 p-6 border-l-4 border-amber-400">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Hardware Requirements & Known Limitations
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-300">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
              <h3 className="font-bold text-white text-sm">💻 Minimum System Requirements:</h3>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>OS: Windows 10 / Windows 11 (64-bit).</li>
                <li>RAM: 4GB RAM (8GB+ recommended for local Ollama AI).</li>
                <li>Storage: 250 MB free disk space for desktop binaries.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2">
              <h3 className="font-bold text-white text-sm">ℹ️ Hardware & Process Notes:</h3>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>App Tracking requires standard user process privileges so Windows hook can read foreground window titles.</li>
                <li>Local Ollama models (e.g. Llama 3.2 3B) run directly on your CPU/GPU. Ensure <code>OLLAMA_ORIGINS=*</code> is set in environment.</li>
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {/* TAB 7: DEVELOPER & CREDITS */}
      {activeTab === "developer" && (
        <Panel className="space-y-6 p-6 border-l-4 border-purple-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">👨‍💻 FlowTrack Engineering Team</h2>
              <p className="text-xs text-slate-400 mt-0.5">Designed & Developed by Sudhir DevOps</p>
            </div>
            <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-1 text-xs font-mono font-bold text-purple-300">
              v6.0.0 Production
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs text-slate-300">
            <div className="space-y-2 p-4 rounded-2xl bg-slate-950 border border-white/10">
              <div className="font-bold text-white">Project Ownership:</div>
              <div>Developed by <strong>Sudhir DevOps</strong> for high-productivity offline study management.</div>
              <div className="text-cyan-400 font-mono pt-1">Corpus: {appInfo.repo}</div>
            </div>

            <div className="space-y-2 p-4 rounded-2xl bg-slate-950 border border-white/10">
              <div className="font-bold text-white">Privacy Guarantee:</div>
              <div>FlowTrack Pro is 100% free of trackers, telemetry, or third-party analytics scripts. Your study data belongs strictly to you.</div>
            </div>
          </div>
        </Panel>
      )}

      {/* TAB 8: OPEN SOURCE THANKS & LINKS */}
      {activeTab === "credits" && (
        <Panel className="space-y-6 p-6 border-l-4 border-rose-500">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
              Open-Source Acknowledgments & Special Thanks
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              FlowTrack Pro is built on top of world-class open-source projects, libraries, and developer tools. Gratitude to all open-source maintainers!
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openSourceCredits.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-4 rounded-2xl bg-slate-950 border border-white/10 hover:border-cyan-400/50 hover:bg-slate-900 transition-all space-y-2 block"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                    {item.name}
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  </span>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-400/20 px-2 py-0.5 rounded">
                    {item.type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                <span className="text-[10px] text-slate-500 group-hover:text-slate-300 font-mono underline block pt-1">
                  {item.url}
                </span>
              </a>
            ))}
          </div>
        </Panel>
      )}
    </motion.div>
  );
}
