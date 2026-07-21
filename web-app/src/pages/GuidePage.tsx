import { motion } from "framer-motion";
import { Panel } from "@/components/common/Panel";

export function GuidePage() {
  const sections = [
    {
      title: "What is FlowTrack? / FlowTrack क्या है?",
      icon: "🛡️",
      content: {
        en: "FlowTrack is a privacy-first, local-only study tracker designed to help you focus and improve your learning habits without your data ever leaving your device.",
        hi: "FlowTrack एक 'Privacy-First' ऐप है जो पूरी तरह से आपके डिवाइस पर चलती है। यह आपकी पढ़ाई की आदतों को ट्रैक करने और एकाग्रता (focus) बढ़ाने के लिए बनाया गया है।"
      }
    },
    {
      title: "How to Use / उपयोग कैसे करें?",
      icon: "🚀",
      content: {
        en: [
          "Step 1: Go to 'Subjects' and add the topics you study.",
          "Step 2: Go to 'Timer' to start tracking your session.",
          "Step 3: Use the 'Pomodoro' mode for structured focus sessions.",
          "Step 4: Check 'Dashboard' for detailed analytics on your progress."
        ],
        hi: [
          "चरण 1: 'Subjects' पेज पर जाएं और अपने विषयों को जोड़ें।",
          "चरण 2: 'Timer' पेज पर जाकर पढ़ाई शुरू करने के लिए स्टार्ट पर क्लिक करें।",
          "चरण 3: अपनी पढ़ाई को टाइम-ब्लॉक्स में बांटने के लिए 'Pomodoro' का इस्तेमाल करें।",
          "चरण 4: अपनी प्रगति देखने के लिए 'Dashboard' पर जाकर ग्राफ और स्टेट्स देखें।"
        ]
      }
    },
    {
      title: "Key Features / मुख्य विशेषताएं",
      icon: "✨",
      content: {
        en: [
          "100% Local: Your data is never uploaded to any server.",
          "Strict Focus: Automatically pauses if you try to switch tabs (Strict Mode).",
          "Achievements: Unlock badges as you hit your goals!",
          "Customization: Beautiful themes including Neon and Paper modes."
        ],
        hi: [
          "100% लोकल: आपका डेटा कभी किसी सर्वर पर नहीं भेजा जाता।",
          "Strict Focus: अगर आप टैब बदलते हैं, तो टाइमर अपने आप रुक जाता है (यदि ऑन हो)।",
          "Achievements: गोल पूरा करने पर शानदार बैज जीतें!",
          "Customization: नियॉन (Neon) और पेपर (Paper) जैसे प्रीमियम थीम्स।"
        ]
      }
    },
    {
      title: "Strict Focus & Auto-Pause / स्ट्रिक्ट फोकस और ऑटो-पॉज़",
      icon: "🔒",
      content: {
        en: [
          "Automatic Auto-Pause: In Strict Focus mode, if there is no user activity (mouse movement, clicks, keyboard, touchpad, or touch events) for 10 minutes, the timer auto-pauses.",
          "Browser Notification: A desktop alert triggers upon auto-pauses to keep you accountable.",
          "Session Lock: Actual study time is locked for timed sessions. Direct manual editing is disabled to prevent cheating and encourage genuine study habits."
        ],
        hi: [
          "स्वचालित ऑटो-पॉज़: स्ट्रिक्ट फोकस मोड में, यदि 10 मिनट तक कोई यूजर एक्टिविटी (माउस मूवमेंट, क्लिक, कीबोर्ड, टचपैड, या टच इवेंट) नहीं होती है, तो टाइमर स्वतः रुक जाता है।",
          "ब्राउज़र नोटिफिकेशन: ऑटो-पॉज़ होने पर आपको सचेत करने के लिए एक डेस्कटॉप अलर्ट भेजा जाता है।",
          "सेशन लॉक: चीटिंग रोकने और पढ़ाई की आदतों को बढ़ावा देने के लिए टाइमर वाले सेशन का वास्तविक समय लॉक रहता है।"
        ]
      }
    },
    {
      title: "Floating Timer (PiP) / फ्लोटिंग टाइमर (PIP)",
      icon: "📺",
      content: {
        en: [
          "Always on Top: Click 'Open Floating Timer' to open a picture-in-picture widget that floats over all other windows and applications.",
          "Interactive Pip: Modern browsers support interactive Document PiP where you can control the timer directly.",
          "Multi-tasking friendly: Track study duration while reading PDFs, coding, or watching video courses on other tools.",
          "Heartbeat Keepalive: When the PiP window is active, it periodically updates interaction status to prevent inactivity pauses."
        ],
        hi: [
          "हमेशा ऊपर: 'Open Floating Timer' पर क्लिक करें, जिससे एक पिक्चर-इन-पिक्चर विजेट खुलता है जो अन्य सभी विंडोज़ और ऐप्स के ऊपर फ्लोट करता है।",
          "इंटरैक्टिव PiP: आधुनिक ब्राउज़र डॉक्यूमेंट PiP का समर्थन करते हैं जहां आप सीधे टाइमर को नियंत्रित कर सकते हैं।",
          "मल्टी-टास्किंग के अनुकूल: पीडीएफ पढ़ते समय, कोडिंग करते समय, या अन्य टूल्स पर वीडियो लेक्चर देखते समय अपनी पढ़ाई की अवधि को ट्रैक करें।"
        ]
      }
    },
    {
      title: "Local AI & Ollama Setup / लोकल एआई और ओलामा सेटअप",
      icon: "🧠",
      content: {
        en: [
          "Local Privacy: Run AI assistant locally with Ollama. No keys, no data leaks, 100% offline.",
          "CORS Configuration: To allow browser connection, launch Ollama with OLLAMA_ORIGINS=* environment variable set.",
          "Command Prompt (Windows): Run 'set OLLAMA_ORIGINS=*' followed by 'ollama serve' in CMD.",
          "PowerShell (Windows): Run '$env:OLLAMA_ORIGINS=\"*\"' followed by 'ollama serve'.",
          "Hardware Profiles: AI page suggests optimal model size (1.5B, 3B, 7B, etc.) based on your computer RAM and GPU."
        ],
        hi: [
          "स्थानीय गोपनीयता: ओलामा के साथ स्थानीय स्तर पर एआई सहायक चलाएं। कोई भी डेटा बाहर नहीं जाएगा, 100% ऑफ़लाइन।",
          "CORS कॉन्फ़िगरेशन: ब्राउज़र कनेक्शन की अनुमति देने के लिए, ओलामा को OLLAMA_ORIGINS=* एनवायरनमेंट वेरिएबल के साथ लॉन्च करें।",
          "कमांड प्रॉम्प्ट (Windows): CMD में 'set OLLAMA_ORIGINS=*' और फिर 'ollama serve' चलाएं।",
          "पावरशेल (Windows): '$env:OLLAMA_ORIGINS=\"*\"' और फिर 'ollama serve' चलाएं।",
          "हार्डवेयर प्रोफाइल: एआई पेज आपके कंप्यूटर रैम (RAM) और जीपीयू (GPU) के आधार पर सही मॉडल आकार (1.5B, 3B, 7B, आदि) सुझाता है।"
        ]
      }
    },
    {
      title: "Premium Features / प्रीमियम फीचर्स",
      icon: "💎",
      content: {
        en: [
          "Focus Soundscapes: Play Rain, Forest, Lofi, or White Noise sounds, use custom local music files, or play sandboxed YouTube links.",
          "AI Assistant: Get insights, tips, and explanations tailored to your subject goals directly in markdown formatting.",
          "Gamification: Earn XP and rank up to Zen Sage.",
          "Reports: Download study session data and backup configurations safely."
        ],
        hi: [
          "Focus Soundscapes: बारिश, जंगल, लोफ़ी या व्हाइट नॉइज़ ध्वनियां बजाएं, कस्टम लोकल म्यूजिक फाइलें या सैंडबॉक्स्ड यूट्यूब लिंक लोड करें।",
          "AI Assistant: सीधे मार्कडाउन फ़ॉर्मेटिंग में अपने विषय लक्ष्यों के अनुरूप सुझाव, टिप्स और स्पष्टीकरण प्राप्त करें।",
          "Gamification: XP कमाएं और 'Zen Sage' तक रैंक बढ़ाएं।",
          "Reports: अपनी पढ़ाई के डेटा और बैकअप कॉन्फ़िगरेशन को सुरक्षित रूप से डाउनलोड करें।"
        ]
      }
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <header className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-theme-primary to-theme-secondary bg-clip-text text-transparent italic">
          FlowTrack Guide / गाइड
        </h1>
        <p className="text-slate-400">Everything you need to know to master your study routine / अपनी पढ़ाई को बेहतर बनाने की पूरी जानकारी</p>
      </header>

      <div className="grid gap-6">
        {sections.map((section, idx) => (
          <Panel key={idx} className="p-6 space-y-4 border-l-4 border-theme-primary">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{section.icon}</span>
              <h2 className="text-xl font-bold text-slate-100">{section.title}</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 pt-2">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-theme-primary opacity-80">English</h3>
                {Array.isArray(section.content.en) ? (
                  <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                    {section.content.en.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-slate-300 text-sm leading-relaxed">{section.content.en}</p>
                )}
              </div>
              
              <div className="space-y-3 border-l md:border-l border-white/5 pl-0 md:pl-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-theme-secondary opacity-80">हिंदी (Hindi)</h3>
                {Array.isArray(section.content.hi) ? (
                  <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                    {section.content.hi.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-slate-300 text-sm leading-relaxed">{section.content.hi}</p>
                )}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <footer className="text-center pt-8 pb-4">
        <Panel className="p-4 bg-theme-primary/5 inline-block">
          <p className="text-sm text-slate-400 italic">
            "Your data. Your device. Your focus." / "आपका डेटा। आपका डिवाइस। आपका फोकस।"
          </p>
        </Panel>
      </footer>
    </motion.div>
  );
}
