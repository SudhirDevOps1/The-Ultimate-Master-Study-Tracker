import { useState, useCallback, useEffect, createContext, useContext, useRef } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

// ─── Toast Types ──────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastCtx {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismiss: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastCtx>({
  toasts: [],
  showToast: () => {},
  dismiss: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  return useContext(ToastContext);
}

// ─── Confirm Dialog State (global) ───────────────────────────────────────────
interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

let _resolveConfirm: ((v: boolean) => void) | null = null;

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmCtx>({ confirm: async () => false });

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      _resolveConfirm = resolve;
      setOpts(options);
    });
  }, []);

  const respond = (val: boolean) => {
    _resolveConfirm?.(val);
    _resolveConfirm = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              {opts.danger
                ? <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                : <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
              }
              <div>
                <h3 className="text-sm font-bold text-white">{opts.title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{opts.message}</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => respond(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 rounded-xl hover:bg-white/5 hover:text-white transition-all">
                {opts.cancelText || "Cancel"}
              </button>
              <button
                onClick={() => respond(true)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  opts.danger
                    ? "bg-rose-500 text-white hover:bg-rose-400"
                    : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                }`}>
                {opts.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

// ─── Toast Container ──────────────────────────────────────────────────────────
const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const COLORS: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  error:   "border-rose-500/30 bg-rose-500/10 text-rose-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  info:    "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
};

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map(t => {
        const Icon = ICONS[t.type];
        return (
          <div key={t.id}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border backdrop-blur-md shadow-2xl text-xs font-semibold pointer-events-auto max-w-xs ${COLORS[t.type]}`}
            style={{ animation: "slideInRight 0.2s ease-out" }}>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
