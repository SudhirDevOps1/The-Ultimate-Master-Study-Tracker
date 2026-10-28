import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "outline" | "ghost";

interface FeedbackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<any> | any;
  variant?: ButtonVariant;
  successText?: string;
  errorText?: string;
  enableSound?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// 100% Offline Audio Feedback using Web Audio API
function playChime(type: "success" | "error") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "success") {
      // Pleasant two-tone chime (C5 -> E5)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
      gain2.gain.setValueAtTime(0.08, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.4);
    } else {
      // Low dual warning pulse
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // Audio context may be restricted before first interaction
  }
}

export function FeedbackButton({
  onClick,
  variant = "primary",
  successText = "Success!",
  errorText = "Failed",
  enableSound = true,
  icon,
  children,
  className = "",
  disabled = false,
  ...props
}: FeedbackButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getVariantClasses = () => {
    switch (variant) {
      case "danger":
        return "border border-rose-500/30 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 hover:border-rose-500/50";
      case "success":
        return "border border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500/50";
      case "secondary":
        return "border border-white/10 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:border-white/20";
      case "outline":
        return "border border-cyan-400/30 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-400/50";
      case "ghost":
        return "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent";
      default: // primary
        return "border border-indigo-500/30 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-cyan-500";
    }
  };

  const handleClick = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || status === "loading") return;

    if (!onClick) return;

    try {
      setStatus("loading");
      const result = onClick(e);
      if (result && typeof result.then === "function") {
        await result;
      }
      setStatus("success");
      if (enableSound) playChime("success");
      setTimeout(() => {
        setStatus("idle");
        setErrorMsg(null);
      }, 1600);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || errorText);
      if (enableSound) playChime("error");
      setTimeout(() => {
        setStatus("idle");
        setErrorMsg(null);
      }, 2200);
    }
  }, [onClick, disabled, status, enableSound, errorText]);

  // Shake animation for error
  const shakeKeyframes = status === "error" ? [-5, 5, -4, 4, -2, 2, 0] : 0;

  return (
    <motion.button
      type={props.type || "button"}
      onClick={handleClick}
      disabled={disabled || status === "loading"}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      animate={{ x: shakeKeyframes }}
      transition={{ duration: 0.35 }}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-50 disabled:cursor-not-allowed ${
        status === "success"
          ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30"
          : status === "error"
          ? "border-rose-500/50 bg-rose-500/20 text-rose-300 ring-2 ring-rose-500/30"
          : getVariantClasses()
      } ${className}`}
      {...(props as any)}
    >
      <AnimatePresence mode="wait">
        {status === "loading" ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
            <span>Processing...</span>
          </motion.div>
        ) : status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{successText}</span>
          </motion.div>
        ) : status === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 font-bold"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>{errorMsg || errorText}</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5"
          >
            {icon && <span className="shrink-0">{icon}</span>}
            <span>{children}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
