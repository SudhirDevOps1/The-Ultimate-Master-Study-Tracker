import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Send, Mail, User, MessageSquare, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Github, Linkedin, Instagram, Globe, ExternalLink, Sparkles } from "lucide-react";

const SOCIAL_PROFILES = [
  {
    name: "GitHub",
    icon: <Github className="w-4 h-4 text-white" />,
    url: "https://github.com/SudhirDevOps1",
    bg: "bg-slate-800 hover:bg-slate-700 text-white border-slate-700",
    handle: "@SudhirDevOps1"
  },
  {
    name: "LinkedIn",
    icon: <Linkedin className="w-4 h-4 text-blue-400" />,
    url: "https://www.linkedin.com/in/sudhirdevops1",
    bg: "bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border-blue-500/30",
    handle: "Sudhir DevOps"
  },
  {
    name: "Instagram",
    icon: <Instagram className="w-4 h-4 text-rose-400" />,
    url: "https://instagram.com/sudhirdevops1",
    bg: "bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border-rose-500/30",
    handle: "@sudhirdevops1"
  },
  {
    name: "Support Email",
    icon: <Mail className="w-4 h-4 text-cyan-400" />,
    url: "mailto:sudhirdevops1@gmail.com",
    bg: "bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border-cyan-500/30",
    handle: "sudhirdevops1@gmail.com"
  }
];

export function AppGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"" | "submitting" | "success" | "failed">("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("https://apnaform.sudhirdevops1.workers.dev/api/submit/endpoint_qZ23VhUEkXnmi3zMeBdT8Qs9", {
        method: "POST",
        body: new FormData(e.currentTarget),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
    }
  };

  const openLink = (url: string) => {
    if (typeof window !== "undefined" && (window as any).electron) {
      try {
        void (window as any).electron.ipcRenderer?.invoke("open-external-link", { url });
        return;
      } catch (e) {
        console.error(e);
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(true);
          setStatus("");
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-2xl shadow-indigo-500/40 hover:from-indigo-500 hover:to-cyan-400 transition-all border-2 border-white/20"
        title="Contact Us & Support"
      >
        <HelpCircle className="h-7 w-7" />
      </motion.button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 via-cyan-500/10 to-transparent flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    📬 Contact Us & Support Center
                  </h2>
                  <p className="text-xs text-indigo-300 font-medium mt-0.5">
                    Connect with our developer team & send direct feedback!
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-6 space-y-5 overflow-y-auto">
                
                {/* Official Social Profiles Banner */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Connect On Official Social Profiles
                    </span>
                    <span className="text-[10px] text-slate-400">Click to visit</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SOCIAL_PROFILES.map((social) => (
                      <button
                        key={social.name}
                        onClick={() => openLink(social.url)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${social.bg} hover:scale-105 active:scale-95 text-center group`}
                      >
                        <div className="flex items-center gap-1">
                          {social.icon}
                          <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-[11px] font-bold mt-1 leading-tight">{social.name}</span>
                        <span className="text-[9px] opacity-75 truncate max-w-[100px]">{social.handle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Body */}
                {status === "success" ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Message Sent Successfully!</h3>
                    <p className="text-sm text-slate-300 max-w-xs mx-auto">
                      Thank you for contacting FlowTrack Pro. We will review your message shortly.
                    </p>
                    <button
                      onClick={() => setStatus("")}
                      className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-all"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Honeypot Anti-Spam Field */}
                    <input
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      style={{ display: "none" }}
                    />

                    {/* Name & Email Row */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" /> Your Name *
                        </label>
                        <input
                          name="name"
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-cyan-400" /> Your Email *
                        </label>
                        <input
                          name="email"
                          type="email"
                          required
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Subject / Topic *
                      </label>
                      <input
                        name="subject"
                        type="text"
                        required
                        placeholder="How can we help you today?"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={status === "submitting"}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {status === "submitting" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Send Message
                        </>
                      )}
                    </button>

                    {status === "failed" && (
                      <p className="text-xs text-rose-400 flex items-center gap-1 mt-2 font-semibold">
                        <AlertCircle className="w-4 h-4" /> Submission failed. Please try again.
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-950/50 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 px-6 shrink-0">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" /> 100% Encrypted & Private
                </div>
                <span>FlowTrack Pro Support</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
