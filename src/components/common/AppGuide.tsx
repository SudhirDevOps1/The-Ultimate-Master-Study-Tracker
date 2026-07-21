import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, BookOpen, Clock, Trophy, BarChart3, ShieldCheck } from "lucide-react";

export function AppGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");

  const content = {
    en: {
      title: "FlowTrack User Guide",
      subtitle: "Master your study routine in minutes",
      steps: [
        {
          icon: <BookOpen className="text-blue-400" />,
          title: "1. Add Subjects",
          desc: "Go to 'Subjects' to add what you're studying. Set weekly goals to stay on track."
        },
        {
          icon: <Clock className="text-cyan-400" />,
          title: "2. Start Timer",
          desc: "Go to 'Focus' and start a session. Use 'Focus Soundscapes' to block noise."
        },
        {
          icon: <Trophy className="text-amber-400" />,
          title: "3. Level Up",
          desc: "Earn XP for every minute you study. Reach Level 50 to become a Zen Master!"
        },
        {
          icon: <BarChart3 className="text-emerald-400" />,
          title: "4. Get Insights",
          desc: "Check 'Analytics' for AI tips on your study patterns and download professional reports."
        }
      ],
      privacy: "Your data is 100% private and stays on your device."
    },
    hi: {
      title: "FlowTrack मार्गदर्शिका",
      subtitle: "कुछ ही मिनटों में अपनी पढ़ाई की दिनचर्या में महारत हासिल करें",
      steps: [
        {
          icon: <BookOpen className="text-blue-400" />,
          title: "1. विषय (Subjects) जोड़ें",
          desc: "'Subjects' में जाकर अपनी पढ़ाई के विषय जोड़ें। ट्रैक पर रहने के लिए साप्ताहिक लक्ष्य सेट करें।"
        },
        {
          icon: <Clock className="text-cyan-400" />,
          title: "2. टाइमर शुरू करें",
          desc: "'Focus' पर जाएं और सेशन शुरू करें। शोर रोकने के लिए 'Focus Soundscapes' का उपयोग करें।"
        },
        {
          icon: <Trophy className="text-amber-400" />,
          title: "3. लेवल अप करें",
          desc: "हर मिनट की पढ़ाई के लिए XP कमाएं। 'Zen Master' बनने के लिए लेवल 50 तक पहुँचें!"
        },
        {
          icon: <BarChart3 className="text-emerald-400" />,
          title: "4. अंतर्दृष्टि (Insights) प्राप्त करें",
          desc: "अपनी पढ़ाई के पैटर्न पर AI टिप्स के लिए 'Analytics' देखें और रिपोर्ट डाउनलोड करें।"
        }
      ],
      privacy: "आपका डेटा 100% प्राइवेट है और आपके डिवाइस पर ही रहता है।"
    }
  };

  const c = content[lang as keyof typeof content];

  return (
    <>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 hover:bg-indigo-500 transition-colors border-2 border-white/20"
      >
        <HelpCircle className="h-7 w-7" />
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-3xl font-black text-white">{c.title}</h2>
                    <p className="text-indigo-300 font-medium">{c.subtitle}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setLang("en")}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}
                    >
                      EN
                    </button>
                    <button 
                      onClick={() => setLang("hi")}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'hi' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}
                    >
                      हिन्दी
                    </button>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-white/10 rounded-lg text-slate-400"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Steps Grid */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {c.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-2xl shadow-inner">
                      {step.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">{step.title}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-950/50 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">{c.privacy}</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-8 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"
                >
                  {lang === 'hi' ? 'गॉट इट!' : 'Got it!'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
