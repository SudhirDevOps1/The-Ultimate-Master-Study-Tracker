import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/common/Panel";
import { 
  BookOpen, Sparkles, Cpu, HardDrive, ShieldCheck, Bug, HelpCircle, 
  UserCheck, Terminal, Layers, Code, Zap, CheckCircle2, AlertTriangle, 
  FolderOpen, ExternalLink, Activity, Search, RefreshCw, FileText, ArrowRight, Heart,
  Clock, Calendar, Monitor, Globe, Lock, Brain, FileCheck, Keyboard, Download, Play, Sliders
} from "lucide-react";

export function GuidePage() {
  const [activeTab, setActiveTab] = useState<"howToUse" | "overview" | "features" | "shortcuts" | "storage" | "fixes" | "tech" | "credits">("howToUse");
  const [selectedGuideFeature, setSelectedGuideFeature] = useState<string>("routine");

  const appInfo = {
    name: "FlowTrack Pro – Smart Study & Productivity Tracker",
    version: "v7.5.1 (Production Release)",
    developer: "Sudhir DevOps (FlowTrack Engineering Team)",
    repo: "SudhirDevOps1/The-Ultimate-Master-Study-Tracker",
    techStack: [
      "React 19", "TypeScript 5.9", "Vite 7", "Electron 43", "TailwindCSS 4",
      "Fabric.js 7.4 (Whiteboard Engine)", "Dexie.js 4 (IndexedDB)", "Zustand 5",
      "Framer Motion 12", "C# Win32 Active Window Tracker", "Python REST Backend (SQLite WAL)",
      "PDF.js 6.1 (PDF Viewer)", "Tesseract.js 7.0 (OCR Flashcards)", "electron-updater", "Web Audio API"
    ],
  };

  const tabs = [
    { id: "howToUse", label: "📖 Kaise Use Karein (User Manual)", icon: <BookOpen className="w-4 h-4 text-cyan-400" /> },
    { id: "overview", label: "🌟 App Overview", icon: <Sparkles className="w-4 h-4" /> },
    { id: "features", label: "🚀 All Features Matrix", icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { id: "shortcuts", label: "⌨️ Keyboard Shortcuts & Tips", icon: <Keyboard className="w-4 h-4 text-indigo-400" /> },
    { id: "fixes", label: "✨ New in v7.5.1", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
    { id: "storage", label: "📂 Data Storage & Privacy", icon: <HardDrive className="w-4 h-4 text-purple-400" /> },
    { id: "tech", label: "🛠️ Tech Architecture", icon: <Cpu className="w-4 h-4" /> },
    { id: "credits", label: "🎁 Open-Source Credits", icon: <Heart className="w-4 h-4 text-rose-400 animate-pulse" /> },
  ];

  const howToGuides = [
    {
      id: "routine",
      icon: "🎯",
      title: "Daily Master Routine (10:00 AM – 09:00 PM)",
      subtitle: "दिन भर का सही स्टडी रूटीन और फ्लो कैसे फॉलो करें",
      steps: [
        {
          title: "1. सुबह 10:00 AM पर ऐप खोलें",
          desc: "Dashboard या Today Tasks पर जाएं। आज के 6 टाइम ब्लॉक्स (10:00 AM से 09:00 PM) अपने आप लोड हो जाएंगे।",
          proTip: "अगर आज नया टाइमटेबल चाहिए तो AI Scheduler में जाकर 1-क्लिक में रीजेनेरेट कर सकते हैं।"
        },
        {
          title: "2. Today Tasks में जाकर सेशन स्टार्ट करें",
          desc: "वर्तमान टाइम स्लॉट के आगे 'Start Session' या Play बटन दबाएं। Study Timer तुरंत उस विषय के साथ शुरू हो जाएगा।",
          proTip: "अगर आप कोडिंग कर रहे हैं या PDF पढ़ रहे हैं, तो 'Open Floating Timer' (PiP) बटन दबाकर टाइमर को हमेशा स्क्रीन के ऊपर रखें।"
        },
        {
          title: "3. लंच और टी ब्रेक्स का ऑटोमैटिक शेड्यूल",
          desc: "01:30 PM - 02:30 PM (Lunch Break) और 05:30 PM - 06:00 PM (Tea/Rest Break) में टाइमर अपने आप रिलैक्स स्टेट में रहेगा।",
          proTip: "ब्रेक खत्म होते ही फ्लोट्रैक प्रो आपको नोटिफाई करेगा ताकि आपकी कंसिस्टेंसी बनी रहे।"
        },
        {
          title: "4. रात 09:00 PM पर Daily Review & Streak",
          desc: "रात को Analytics पेज पर जाएं। आज का Planned vs Actual Focus Time देखें और Streak बनाए रखें।",
          proTip: "Executive PDF Report पर क्लिक करके आज का या पूरे महीने का स्टडी रिपोर्ट PDF में प्रिंट/डाउनलोड कर सकते हैं।"
        }
      ]
    },
    {
      id: "timer",
      icon: "⏱️",
      title: "Study Timer, PiP Floating Widget & Offline Audio",
      subtitle: "सटीक टाइम ट्रैकिंग, फ्लोटिंग विजेट और बैकग्राउंड म्यूजिक",
      steps: [
        {
          title: "1. Zero-Lag Timestamp Timer",
          desc: "टाइमर साधारण टिक-टिक पर नहीं बल्कि Unix absolute timestamps पर चलता है, जिससे बैकग्राउंड में भी एक सेकंड का भी अंतर नहीं आता।",
          proTip: "स्पेसबार (Spacebar) दबाकर कभी भी टाइमर Pause या Resume कर सकते हैं।"
        },
        {
          title: "2. Always-On-Top Floating Timer (PiP Mode)",
          desc: "Timer पेज पर '📺 Open Floating Timer' पर क्लिक करें। यह छोटा विजेट आपके VS Code, Chrome या PDF के ऊपर हमेशा दिखता रहेगा।",
          proTip: "फ्लोटिंग टाइमर को ड्रैग करके स्क्रीन के किसी भी कोने में रख सकते हैं।"
        },
        {
          title: "3. 100% Offline Focus Soundscapes & Binaural Beats",
          desc: "टाइमर के साथ Alpha Binaural Beats (10Hz) और Deep Rain साउंड्स सुनें। यह वेब ऑडियो सिंथेसाइज़र से बिना इंटरनेट भी चलता है।",
          proTip: "ईयरफोन लगाकर अल्फा बीट्स सुनने से फोकस और कॉन्संट्रेशन दोगुना बढ़ जाता है।"
        }
      ]
    },
    {
      id: "apptracking",
      icon: "🖥️",
      title: "App & Website Tracking (Screen Time Analytics)",
      subtitle: "कौन सी ऐप और वेबसाइट कितनी देर इस्तेमाल की, सब ट्रैक करें",
      steps: [
        {
          title: "1. ऑटोमैटिक बैकग्राउंड ट्रैकिंग",
          desc: "जैसे ही आप Chrome, VS Code, YouTube या कोई भी ऐप खोलते हैं, फ्लोट्रैक प्रो बैकग्राउंड में उसका एक्टिव टाइम सेकंड-दर-सेकंड नोट करता है।",
          proTip: "जब आप कंप्यूटर छोड़ते हैं (10 मिनट कोई हलचल नहीं), तो टाइमर ऑटो-पॉज़ हो जाता है ताकि फेक स्क्रीन टाइम न जुड़े।"
        },
        {
          title: "2. Today vs Past 7 Days vs 30 Days vs All-Time Switcher",
          desc: "App Tracking पेज पर ऊपर दिए गए पिल्स (📅 Single Day, 📆 Past 7 Days, 📊 Past 30 Days, ♾️ All Time) पर क्लिक करके किसी भी समय सीमा का कुल समय देख सकते हैं।",
          proTip: "किसी भी दिन की तारीख पर क्लिक करके उस दिन का विस्तृत ऐप व वेबसाइट ब्रेकडाउन देख सकते हैं।"
        },
        {
          title: "3. Productive vs Distracting Classification",
          desc: "कोडिंग टूल्स और बुक्स को Productive (हरा), सोशल मीडिया को Distracting (लाल), और ब्राउज़र को Neutral रंग में क्लासिफाई किया जाता है।",
          proTip: "Distraction Alert बार आपको सतर्क करता है जब आप तय सीमा से ज्यादा भटकाव वाले ऐप्स पर समय बिताते हैं।"
        }
      ]
    },
    {
      id: "scheduler",
      icon: "🤖",
      title: "AI Study Scheduler & Smart Routine Generator",
      subtitle: "अपने विषयों और प्राथमिकताओं के हिसाब से स्मार्ट टाइमटेबल बनाएं",
      steps: [
        {
          title: "1. 1-Click Smart Schedule Generation",
          desc: "AI Scheduler में जाएं और 'Generate AI Schedule' दबाएं। यह आपके कठिन विषयों को सुबह के पीक फोकस घंटों में सेट करता है।",
          proTip: "शेड्यूल 10:00 AM से 09:00 PM के दायरे में आपके लंच और टी ब्रेक को सुरक्षित रखते हुए बनता है।"
        },
        {
          title: "2. Custom Subject Target Hours & Weights",
          desc: "Subjects पेज पर जाकर हर विषय का वीकली टारगेट (जैसे Java 12h, DSA 10h, English 6h) और डिफिकल्टी लेवल सेट करें।",
          proTip: "AI उसी हिसाब से ज्यादा समय कठिन विषयों को और रिवीजन का समय आसान विषयों को देता है।"
        }
      ]
    },
    {
      id: "workspace",
      icon: "📚",
      title: "Study Workspace (PDF Reader & OCR Flashcards)",
      subtitle: "बुक्स पढ़ें, हाइलाइट करें और सीधे फ्लैशकार्ड्स बनाएं",
      steps: [
        {
          title: "1. PDF बुक्स और नोट्स खोलें",
          desc: "Study Workspace में कोई भी PDF ड्रैग और ड्रॉप करें। यह सुपर-फास्ट इन-ऐप PDF.js इंजन के साथ तुरंत लोड होता है।",
          proTip: "रीडिंग प्रोग्रेस और पेज नंबर अपने आप याद रखा जाता है।"
        },
        {
          title: "2. OCR Text Extraction & Flashcards",
          desc: "PDF के किसी भी हिस्से को सेलेक्ट करके 'Create Flashcard' दबाएं। Tesseract OCR इंजन तुरंत टेक्स्ट निकाल लेगा।",
          proTip: "यह फ्लैशकार्ड्स सीधे SRS Flashcards डेक में जुड़ जाते हैं।"
        }
      ]
    },
    {
      id: "srs",
      icon: "🗂️",
      title: "SRS Flashcards (Spaced Repetition System)",
      subtitle: "सुपरमेमो-2 अल्गोरिदम से कभी न भूलने वाला रिवीजन",
      steps: [
        {
          title: "1. फ्लैशकार्ड्स से रिवीजन करें",
          desc: "SRS Flashcards में 'Start Review' दबाएं। प्रश्न देखें, उत्तर याद करें और 'Show Answer' दबाएं।",
          proTip: "अपने आत्मविश्वास के आधार पर Easy, Good, Hard या Again चुनें।"
        },
        {
          title: "2. साइंटिफिक स्पैस्ड रिपीटिशन",
          desc: "SuperMemo-2 अल्गोरिदम तय करता है कि कौन सा कार्ड आपको 1 दिन बाद, 3 दिन बाद या 15 दिन बाद दोबारा दिखाना है।",
          proTip: "रोजाना सिर्फ 10 मिनट फ्लैशकार्ड्स दोहराने से परीक्षा तक 95%+ बातें याद रहती हैं।"
        }
      ]
    },
    {
      id: "portals",
      icon: "🌐",
      title: "In-App Web Portals & Encrypted Password Vault",
      subtitle: "बिना ऐप छोड़े अपना कॉलेज, PW या यूट्यूब चलाएं और पासवर्ड ऑटो-फिल करें",
      steps: [
        {
          title: "1. इन-ऐप वेब ब्राउज़र",
          desc: "Web Portals Browser में जाकर Apna College, Physics Wallah, Coursera या YouTube 1-क्लिक में खोलें।",
          proTip: "यह क्रोमियम इंजन पर चलता है, इसलिए वीडियो लैग-फ्री 1080p में चलती हैं।"
        },
        {
          title: "2. 1-Click Encrypted Password Auto-Fill",
          desc: "अपने पासवर्ड्स को लोकल एन्क्रिप्टेड वॉल्ट में सेव करें। पोर्टल लॉगिन पेज पर '🔑 Fill Login' दबाते ही फॉर्म ऑटो-फिल हो जाता है।",
          proTip: "पासवर्ड केवल आपके कंप्यूटर पर एन्क्रिप्टेड रूप में रहते हैं, कभी किसी सर्वर पर नहीं जाते।"
        }
      ]
    },
    {
      id: "analytics",
      icon: "📊",
      title: "Study Analytics, Streaks & Executive PDF Reports",
      subtitle: "अपनी पढ़ाई की प्रगति, स्ट्रीक और एक्सक्लूसिव PDF रिपोर्ट देखें",
      steps: [
        {
          title: "1. Planned vs Actual Focus Hours",
          desc: "Analytics पेज पर बार चार्ट्स आपको दिखाते हैं कि आपने किस विषय में कितना प्लान किया था और वास्तव में कितना पढ़ा।",
          proTip: "टूलटिप्स में सटीक घंटे, पूर्णता दर (Completion %) और तारीखें दिखती हैं।"
        },
        {
          title: "2. Active vs Skipped Days & Streak Log",
          desc: "पूरे 30 दिनों का कैलेंडर लॉग देखें। आज का दिन '⏳ In Progress' दिखता है और जिस दिन आपने पढ़ा उस दिन हरा टिक मार्क आता है।",
          proTip: "लगातार पढ़ने से आपकी Streak और Level (जैसे Seeker Lv.1 -> Master Lv.5) बढ़ता है।"
        },
        {
          title: "3. Executive PDF Report Export",
          desc: "ऊपर '📄 Executive PDF Report' बटन दबाएं। सुंदर डार्क/लाइट फॉर्मेटेड रिपोर्ट खुलेगी। 'Print / Save PDF' दबाकर PDF डाउनलोड करें।",
          proTip: "Escape (Esc) बटन दबाकर या बाहर क्लिक करके आसानी से रिपोर्ट बंद कर सकते हैं।"
        }
      ]
    },
    {
      id: "backup",
      icon: "🔄",
      title: "Data Backup, Restore & Background Auto-Updater",
      subtitle: "डेटा कभी न खोएं और ऐप को हमेशा लेटेस्ट वर्जन पर रखें",
      steps: [
        {
          title: "1. 1-Click JSON Backup & Restore",
          desc: "Settings या App Tracking पेज पर 'Backup' बटन दबाकर अपना पूरा डेटा एक JSON फाइल में एक्सपोर्ट कर लें।",
          proTip: "कंप्यूटर बदलने पर 'Restore' बटन दबाकर पूरी प्रोग्रेस वापस ला सकते हैं।"
        },
        {
          title: "2. Silent Background Auto-Updater",
          desc: "जैसे ही नया अपडेट आता है, ऐप बैकग्राउंड में डाउनलोड कर लेता है। आपको सिर्फ 'Restart & Install' का प्रॉम्प्ट मिलता है।",
          proTip: "बिना किसी मैन्युअल डाउनलोड या डेटा लॉस के ऐप अपने आप अपग्रेड हो जाता है।"
        }
      ]
    }
  ];

  const features = [
    {
      title: "🌐 In-App Chromium Web Portals Browser",
      descEn: "Integrated embedded Chromium webview engine for Apna College, PW, Coursera, YouTube, & custom study sites without leaving FlowTrack Pro.",
      descHi: "फ्लोट्रैक प्रो के अंदर ही अपना कॉलेज, PW, Coursera और YouTube चलाने के लिए इन-ऐप वेबव्यू ब्राउज़र इंजन।",
      icon: "🌐",
      tag: "Chromium Engine"
    },
    {
      title: "🔐 Encrypted Password Vault & Auto-Fill",
      descEn: "Local encrypted credential manager. 1-click '🔑 Fill Login' button auto-injects saved logins into study portal forms.",
      descHi: "लोकल एन्क्रिप्टेड पासवर्ड वॉल्ट: अपना कॉलेज या अन्य स्टडी साइट्स पर 1-क्लिक में यूजरनेम और पासवर्ड ऑटो-फिल करता है।",
      icon: "🔐",
      tag: "1-Click AutoFill"
    },
    {
      title: "⏱️ Timestamp-Based Strict Study Timer",
      descEn: "Uses absolute Unix timestamps (Date.now()) instead of simple setInterval state. Prevents timer lag, system clock drift, or background tab throttling.",
      descHi: "Unix timestamps का उपयोग करके 100% सटीक टाइमिंग देता है। 10-सेकंड इवेंट थ्रॉटलिंग से CPU लैग और हैंगिंग बिल्कुल खत्म हो जाती है।",
      icon: "⏱️",
      tag: "Zero Lag Engine"
    },
    {
      title: "📺 Floating Picture-in-Picture (PiP) Widget",
      descEn: "Opens a mini floating widget that stays on top of all Windows applications (PDFs, coding IDEs, lectures) so you can pause/play without switching windows.",
      descHi: "एक फ्लोटिंग विजेट खोलता है जो सभी ऐप्स के ऊपर रहता है, ताकि आप PDF पढ़ते या कोडिंग करते समय आसानी से टाइमर कंट्रोल कर सकें।",
      icon: "📺",
      tag: "Always-On-Top"
    },
    {
      title: "🖥️ Live Application & Web Tab Tracking",
      descEn: "Monitors active windows (VS Code, Chrome, YouTube), records screen time, and classifies apps into Productive, Distracting, or Neutral categories.",
      descHi: "सक्रिय ऐप्स और ब्राउज़र टैब्स को ऑटो-ट्रैक करता है और आज, 7 दिन, 30 दिन या ऑल-टाइम का कुल स्क्रीन टाइम दिखाता है।",
      icon: "🖥️",
      tag: "Multi-Scope Analytics"
    },
    {
      title: "🎵 100% Offline AI Focus Soundscapes",
      descEn: "Procedural Web Audio API sound generator produces binaural 10Hz alpha focus beats and rain soundscapes offline with zero internet required.",
      descHi: "100% ऑफलाइन बाइन्यूरल बीट्स और रेन साउंड्स जो बिना इंटरनेट के भी बैकग्राउंड में चलती हैं और ध्यान केंद्रित रखने में मदद करती हैं।",
      icon: "🎵",
      tag: "Offline Audio"
    },
    {
      title: "🤖 AI Study Scheduler (10 AM - 09 PM)",
      descEn: "Automatically plans daily sessions within 10:00 AM - 09:00 PM, safeguarding lunch & tea breaks while prioritizing weak/challenging topics.",
      descHi: "10:00 AM से 09:00 PM के बीच लंच और टी ब्रेक का ध्यान रखते हुए कठिन विषयों को सुबह के पीक आवर्स में ऑटो-शेड्यूल करता है।",
      icon: "🤖",
      tag: "Smart Scheduler"
    },
    {
      title: "🗂️ SRS Flashcards & Spaced Repetition",
      descEn: "SuperMemo-2 (SM-2) algorithm calculates review intervals (1d, 3d, 15d, 30d) for permanent memory retention.",
      descHi: "स्पैस्ड रिपीटिशन तकनीक से कठिन टॉपिक्स को सही अंतराल पर दोहराकर 100% याद रखने की प्रणाली।",
      icon: "🗂️",
      tag: "SM-2 Algorithm"
    },
    {
      title: "📄 Executive PDF Performance Reports",
      descEn: "Generates beautiful printable study performance reports with subject mastery tables, focus hours, completion rates, and rank badges.",
      descHi: "1-क्लिक में आधिकारिक स्टडी परफॉर्मेंस रिपोर्ट तैयार करता है जिसे PDF में प्रिंट या सेव किया जा सकता है।",
      icon: "📄",
      tag: "Print & PDF"
    },
    {
      title: "🔄 Background Silent Auto-Updater",
      descEn: "Powered by electron-updater. Checks GitHub Releases silently in background, downloads updates, and provides 1-click 'Restart & Install'.",
      descHi: "ऑटो-अपडेटर: बैकग्राउंड में नया वर्जन ऑटोमैटिकली डाउनलोड करता है और 1-क्लिक में बिना डेटा खोए ऐप अपडेट कर देता है।",
      icon: "🔄",
      tag: "electron-updater"
    }
  ];

  const shortcuts = [
    { key: "Space", desc: "Start / Pause Study Timer (टाइमर शुरू या रोकें)", area: "Study Timer" },
    { key: "Esc", desc: "Close Modals / Exit PDF Report (पॉपअप या रिपोर्ट बंद करें)", area: "Global" },
    { key: "Ctrl + S", desc: "Save Mind Map / Note (नोट्स या माइंड मैप सेव करें)", area: "Notes & Mind Maps" },
    { key: "Ctrl + F", desc: "Search in Flashcards or PDF (सर्च करें)", area: "Workspace" },
    { key: "Alt + Tab", desc: "Switch Apps while PiP Timer Stays on Top (फ्लोटिंग टाइमर ऊपर रहेगा)", area: "PiP Widget" }
  ];

  const currentGuide = howToGuides.find(g => g.id === selectedGuideFeature) || howToGuides[0];

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
              Official Documentation & Master User Guide
            </div>
            <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-mono font-bold text-slate-300 border border-white/10">
              {appInfo.version}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            FlowTrack Pro <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent italic">User Guide & Complete Manual</span>
          </h1>

          <p className="max-w-3xl text-sm sm:text-base text-slate-300 leading-relaxed">
            FlowTrack Pro is your 100% privacy-first, offline-capable master study system. Learn how to master your schedule, track screen time, generate PDF reports, and study with maximum efficiency.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-medium">Core Stack:</span>
            {appInfo.techStack.slice(0, 8).map((tech, i) => (
              <span key={i} className="rounded-lg bg-slate-800/80 border border-white/10 px-2.5 py-0.5 text-[11px] font-mono text-cyan-300">
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

      {/* TAB 1: KAISE USE KAREIN (STEP-BY-STEP USER MANUAL) */}
      {activeTab === "howToUse" && (
        <div className="space-y-6">
          {/* Feature selector pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pretty-scrollbar">
            {howToGuides.map((guide) => (
              <button
                key={guide.id}
                onClick={() => setSelectedGuideFeature(guide.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                  selectedGuideFeature === guide.id
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-md ring-1 ring-cyan-500/30"
                    : "bg-slate-900/80 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{guide.icon}</span>
                <span>{guide.title.split("(")[0].trim()}</span>
              </button>
            ))}
          </div>

          {/* Active Guide Content */}
          <Panel className="space-y-6 p-6 sm:p-8 border-l-4 border-cyan-500">
            <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                  <span className="text-2xl">{currentGuide.icon}</span>
                  <span>{currentGuide.title}</span>
                </h2>
                <p className="text-xs sm:text-sm text-cyan-300 mt-1 font-medium">{currentGuide.subtitle}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-xs font-mono font-bold text-cyan-300 w-fit">
                Step-by-Step Guide
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {currentGuide.steps.map((step, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3 relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-black text-xs border border-cyan-500/30">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-10">
                    {step.desc}
                  </p>
                  {step.proTip && (
                    <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-amber-300/90 pl-10 flex items-start gap-1.5">
                      <span className="shrink-0">💡</span>
                      <span><strong>Pro Tip:</strong> {step.proTip}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 2: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel className="space-y-4 border-l-4 border-cyan-500 p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🛡️ What is FlowTrack Pro? / यह क्या है?</span>
            </h2>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                <strong>English:</strong> FlowTrack Pro is a privacy-first, high-performance desktop application designed for students, software engineers, and competitive exam aspirants. All activity tracking, study timestamps, flashcards, and notes remain 100% stored on your local computer.
              </p>
              <p>
                <strong>Hindi:</strong> FlowTrack Pro एक 'Privacy-First' और हाई-परफॉर्मेस मास्टर स्टडी ट्रैकर है। इसमें आपका सारा डेटा केवल आपके कंप्यूटर पर ही सुरक्षित रहता है — कोई क्लाउड निर्भरता या डेटा ट्रैकिंग नहीं है।
              </p>
            </div>
          </Panel>

          <Panel className="space-y-4 border-l-4 border-purple-500 p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🚀 Master Daily Workflow / दैनिक दिनचर्या</span>
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-slate-300">
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-xs">1</span>
                <div><strong>10:00 AM – Start First Block:</strong> Today Tasks में जाकर पहला सेशन शुरू करें।</div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs">2</span>
                <div><strong>Turn on Focus Audio:</strong> बैकग्राउंड में Alpha Binaural Beats या Deep Rain ऑन करें।</div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold text-xs">3</span>
                <div><strong>Enable PiP Floating Timer:</strong> कोडिंग या PDF रीडिंग के दौरान टाइमर हमेशा ऊपर रखें।</div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">4</span>
                <div><strong>09:00 PM – Review & PDF:</strong> Analytics में जाकर आज की स्ट्रीक और PDF रिपोर्ट देखें।</div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 3: FEATURE MATRIX */}
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

      {/* TAB 4: KEYBOARD SHORTCUTS */}
      {activeTab === "shortcuts" && (
        <Panel className="space-y-6 p-6 border-l-4 border-indigo-500">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-indigo-400" />
              Keyboard Shortcuts & Productivity Tips
            </h2>
            <p className="text-xs text-slate-400 mt-1">कीबोर्ड शॉर्टकट्स जिससे आप बिना माउस छुए तेजी से काम कर सकते हैं</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {shortcuts.map((sc, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">{sc.area}</span>
                  <p className="text-xs text-slate-200 font-medium">{sc.desc}</p>
                </div>
                <kbd className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs font-mono font-bold text-white shadow-inner shrink-0">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* TAB 5: FIXES IN V7.5.1 */}
      {activeTab === "fixes" && (
        <Panel className="space-y-6 p-6 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-bold">v7.5.1 Production Release Audit & Fixes — 100% Tested & Verified!</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
              <h3 className="font-bold text-cyan-400 text-sm">📄 Executive PDF Report Fix</h3>
              <p className="text-slate-300">Sticky action bars, Escape key listener, and backdrop click added. No more scroll-trapping or modal lockups.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
              <h3 className="font-bold text-indigo-400 text-sm">🖥️ Multi-Period App Tracking</h3>
              <p className="text-slate-300">Added Single Day, Past 7 Days (Week), Past 30 Days (Month), and All-Time total aggregate views with live refresh.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
              <h3 className="font-bold text-purple-400 text-sm">📊 Analytics Streaks & Charts</h3>
              <p className="text-slate-300">Today is cleanly rendered as '⏳ In Progress' in Active vs Skipped Days log, and Planned vs Actual charts have dark glassmorphism tooltips.</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
              <h3 className="font-bold text-amber-400 text-sm">🔐 Encrypted Password Vault</h3>
              <p className="text-slate-300">1-click login auto-fill into Apna College, PW and custom study portals with XOR local encryption.</p>
            </div>
          </div>
        </Panel>
      )}

      {/* TAB 6: DATA STORAGE PATHS */}
      {activeTab === "storage" && (
        <Panel className="space-y-6 p-6 border-l-4 border-purple-500">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-purple-400" />
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
          </div>
        </Panel>
      )}

      {/* TAB 7: TECH ARCHITECTURE */}
      {activeTab === "tech" && (
        <Panel className="space-y-6 p-6 border-l-4 border-cyan-500">
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
                <li><strong>React 19 & TypeScript 5:</strong> Strict type parity across models with zero compiler warnings.</li>
                <li><strong>Vite 7 Bundler:</strong> Code-splitting chunks for instant sub-second app start.</li>
                <li><strong>TailwindCSS & Framer Motion:</strong> Glassmorphism styling with 60 FPS smooth animations.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">2. Electron & Native Process Hook</h3>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><strong>Electron 43 Shell:</strong> Multi-window IPC communication bridge.</li>
                <li><strong>C# Win32 Process Tracker:</strong> Native Windows active window watcher querying GetForegroundWindow API.</li>
                <li><strong>Throttled Interactions:</strong> 10s intervals for zero CPU overhead.</li>
              </ul>
            </div>
          </div>
        </Panel>
      )}

      {/* TAB 8: OPEN SOURCE CREDITS */}
      {activeTab === "credits" && (
        <Panel className="space-y-6 p-6 border-l-4 border-rose-500">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
              Open-Source Acknowledgments & Special Thanks
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              FlowTrack Pro is built by <strong>Sudhir DevOps</strong> on top of world-class open-source libraries: React 19, Vite, Electron, Fabric.js, Dexie.js, Framer Motion, and Tailwind CSS.
            </p>
          </div>
        </Panel>
      )}
    </motion.div>
  );
}
