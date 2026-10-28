import React, { useState, useEffect, useId, useRef } from "react";
import { Copy, Check, Maximize2, Minimize2, Code2, AlertTriangle } from "lucide-react";

interface MermaidChartProps {
  chart: string;
  className?: string;
}

export function MermaidChart({ chart, className = "" }: MermaidChartProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rawId = useId();
  const componentId = `flowtrack-mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      if (!chart.trim()) return;

      try {
        setError(null);
        // Dynamic import to keep core bundle ultra-lean & lazy load
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#090d16",
            primaryColor: "#1e293b",
            primaryTextColor: "#f8fafc",
            primaryBorderColor: "#38bdf8",
            lineColor: "#818cf8",
            secondaryColor: "#1e1b4b",
            tertiaryColor: "#064e3b",
            fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont",
            fontSize: "13px",
          },
          securityLevel: "loose",
        });

        // Clean any previous element with this ID if exists
        const existing = document.getElementById(componentId);
        if (existing) existing.remove();

        const { svg } = await mermaid.render(componentId, chart.trim());

        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("[MermaidChart] Render error:", err);
          setError(err?.message || "Diagram syntax could not be rendered.");
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
      const el = document.getElementById(componentId);
      if (el) el.remove();
    };
  }, [chart, componentId]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(chart);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopySvg = async () => {
    if (!svgContent) return;
    await navigator.clipboard.writeText(svgContent);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  if (error) {
    return (
      <div className={`my-3 p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs ${className}`}>
        <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="font-bold">Mermaid Diagram Syntax Notice</span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-semibold"
          >
            {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCode ? "Copied" : "Copy Source"}</span>
          </button>
        </div>
        <p className="text-[11px] text-amber-300/80 mb-2">{error}</p>
        <pre className="p-2.5 rounded-xl bg-slate-950/80 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`my-4 rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-md overflow-hidden transition-all shadow-xl ${
        isFullscreen ? "fixed inset-4 z-50 p-6 flex flex-col bg-slate-950" : ""
      } ${className}`}
    >
      {/* Diagram Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
            FlowTrack Mermaid Vector Diagram
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            title="Toggle Diagram Source"
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ${
              showRaw ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : ""
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopySvg}
            title="Copy SVG to Clipboard"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] font-semibold transition-colors"
          >
            {copiedSvg ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedSvg ? "SVG Copied" : "Copy SVG"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Raw Source View */}
      {showRaw && (
        <div className="p-3 border-b border-white/10 bg-black/40">
          <pre className="font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre selection:bg-cyan-500/30">
            {chart}
          </pre>
        </div>
      )}

      {/* Rendered SVG Viewport */}
      <div className={`p-4 overflow-auto flex items-center justify-center min-h-[140px] ${isFullscreen ? "flex-1" : ""}`}>
        {!svgContent ? (
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono py-8">
            <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span>Compiling Mermaid vector graph...</span>
          </div>
        ) : (
          <div
            className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto transition-transform"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  );
}
