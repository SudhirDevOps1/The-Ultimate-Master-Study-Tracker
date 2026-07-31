import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Send, Mail, User, MessageSquare, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Github, Linkedin, Instagram, Globe, MessageCircle } from "lucide-react";

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
                    📬 Contact Us & Support
                  </h2>
                  <p className="text-xs text-indigo-300 font-medium mt-0.5">
                    Connect with us! Send your query, feedback, or social handles.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 space-y-4 overflow-y-auto">
                {status === "success" ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Message Sent Successfully!</h3>
                    <p className="text-sm text-slate-300 max-w-xs mx-auto">
                      Thank you for contacting us. We will review your message and social details shortly.
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
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Subject / Query *
                      </label>
                      <input
                        name="subject"
                        type="text"
                        required
                        placeholder="How can we help you today?"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
                      />
                    </div>

                    {/* Social Links Section */}
                    <div className="pt-2 border-t border-white/5 space-y-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">
                        Social Handles & Web Links (Optional)
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* GitHub / Website Link */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1">
                            <Github className="w-3 h-3 text-slate-300" /> GitHub / Website Link
                          </label>
                          <input
                            name="github_link"
                            type="url"
                            placeholder="https://github.com/username"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
                          />
                        </div>

                        {/* LinkedIn Link */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1">
                            <Linkedin className="w-3 h-3 text-blue-400" /> LinkedIn Profile
                          </label>
                          <input
                            name="linkedin_link"
                            type="url"
                            placeholder="https://linkedin.com/in/username"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
                          />
                        </div>

                        {/* Instagram Handle */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1">
                            <Instagram className="w-3 h-3 text-rose-400" /> Instagram Handle
                          </label>
                          <input
                            name="instagram"
                            type="text"
                            placeholder="@yourusername or link"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
                          />
                        </div>

                        {/* Portfolio / Personal Web */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1">
                            <Globe className="w-3 h-3 text-emerald-400" /> Portfolio Website
                          </label>
                          <input
                            name="portfolio_url"
                            type="url"
                            placeholder="https://yourwebsite.com"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Detailed Message */}
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-amber-400" /> Message Details
                      </label>
                      <textarea
                        name="message"
                        rows={3}
                        placeholder="Write your detailed feedback, feature requests, or questions..."
                        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-xs text-white focus:border-cyan-400 focus:outline-none transition-all placeholder:text-slate-500 resize-none"
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
