import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { 
  Pencil, Eraser, Square, Circle, Type, StickyNote, Download, Trash2, 
  RotateCcw, MousePointer, ZoomIn, ZoomOut, Maximize2, Palette, Sparkles, ArrowRight, Minus
} from "lucide-react";
import { useToast } from "@/components/common/Toast";

interface FabricWhiteboardProps {
  storageKey?: string;
}

const COLOR_PRESETS = [
  "#ffffff", "#f43f5e", "#ec4899", "#a855f7", "#3b82f6", 
  "#06b6d4", "#10b981", "#eab308", "#f97316", "#64748b"
];

export function FabricWhiteboard({ storageKey = "flowtrack_fabric_whiteboard_v1" }: FabricWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const { showToast } = useToast();

  const [activeTool, setActiveTool] = useState<"select" | "draw" | "erase" | "rect" | "circle" | "line" | "text" | "note">("draw");
  const [strokeColor, setStrokeColor] = useState("#a855f7");
  const [fillColor, setFillColor] = useState("rgba(168,85,247,0.15)");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 1000;
    const height = containerRef.current.clientHeight || 650;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#050505",
      isDrawingMode: true,
      selection: true,
    });

    fabricCanvasRef.current = canvas;

    // Configure Pencil Brush for Fabric v6
    const brush = new fabric.PencilBrush(canvas);
    brush.color = strokeColor;
    brush.width = strokeWidth;
    canvas.freeDrawingBrush = brush;

    // Load saved canvas data if available
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        canvas.loadFromJSON(savedData).then(() => {
          canvas.renderAll();
        });
      }
    } catch (e) {
      console.error("Failed to restore whiteboard data:", e);
    }

    // Auto-save on object modification
    const saveState = () => {
      try {
        const json = JSON.stringify(canvas.toJSON());
        localStorage.setItem(storageKey, json);
      } catch { /* ignore */ }
    };

    canvas.on("object:added", saveState);
    canvas.on("object:modified", saveState);
    canvas.on("object:removed", saveState);

    // Responsive Canvas Resize
    const handleResize = () => {
      if (!containerRef.current || !fabricCanvasRef.current) return;
      fabricCanvasRef.current.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      fabricCanvasRef.current.renderAll();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [storageKey]);

  // Sync tool change with Fabric canvas modes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTool === "draw") {
      canvas.isDrawingMode = true;
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [activeTool, strokeColor, strokeWidth]);

  // Handle Shapes & Text Additions
  const addShape = (type: "rect" | "circle" | "line" | "text" | "note") => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const center = canvas.getVpCenter();

    if (type === "rect") {
      const rect = new fabric.Rect({
        left: center.x - 50,
        top: center.y - 50,
        width: 120,
        height: 80,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        rx: 8,
        ry: 8,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    } else if (type === "circle") {
      const circle = new fabric.Circle({
        left: center.x - 40,
        top: center.y - 40,
        radius: 45,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      });
      canvas.add(circle);
      canvas.setActiveObject(circle);
    } else if (type === "line") {
      const line = new fabric.Line([center.x - 60, center.y, center.x + 60, center.y], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      });
      canvas.add(line);
      canvas.setActiveObject(line);
    } else if (type === "text") {
      const text = new fabric.IText("Double click to edit text", {
        left: center.x - 80,
        top: center.y - 15,
        fontFamily: "Inter, sans-serif",
        fontSize: 18,
        fill: strokeColor,
      });
      canvas.add(text);
      canvas.setActiveObject(text);
    } else if (type === "note") {
      const group = new fabric.Group([
        new fabric.Rect({
          width: 150,
          height: 150,
          fill: "rgba(234,179,8,0.2)",
          stroke: "#eab308",
          strokeWidth: 2,
          rx: 6,
          ry: 6,
        }),
        new fabric.Textbox("Sticky Note...", {
          width: 130,
          left: 10,
          top: 10,
          fontSize: 14,
          fill: "#fef9c3",
          fontFamily: "Inter, sans-serif",
        }),
      ], {
        left: center.x - 75,
        top: center.y - 75,
      });
      canvas.add(group);
      canvas.setActiveObject(group);
    }

    canvas.renderAll();
    setActiveTool("select");
  };

  // Erase Selected Objects
  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      showToast("Deleted selected item", "info");
    }
  };

  // Clear Whiteboard
  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#050505";
    canvas.renderAll();
    localStorage.removeItem(storageKey);
    showToast("Whiteboard cleared", "info");
  };

  // Export High-Res PNG
  const exportImage = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement("a");
    link.download = `flowtrack_whiteboard_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showToast("Downloaded Whiteboard PNG", "success");
  };

  // Zoom controls
  const changeZoom = (factor: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    let newZoom = canvas.getZoom() * factor;
    if (newZoom > 5) newZoom = 5;
    if (newZoom < 0.2) newZoom = 0.2;
    canvas.zoomToPoint(canvas.getVpCenter(), newZoom);
    setZoomLevel(newZoom);
  };

  return (
    <div className="relative w-full h-[680px] bg-[#050505] rounded-2xl border border-white/10 overflow-hidden flex flex-col">
      {/* 🛠️ Top Whiteboard Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/80 border-b border-white/10 backdrop-blur z-10">
        {/* Drawing & Selection Tools */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTool("draw")}
            className={`p-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
              activeTool === "draw" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30" : "text-slate-400 hover:text-white"
            }`}
            title="Pencil / Brush Mode"
          >
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Draw</span>
          </button>

          <button
            onClick={() => setActiveTool("select")}
            className={`p-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
              activeTool === "select" ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30" : "text-slate-400 hover:text-white"
            }`}
            title="Select & Move Objects"
          >
            <MousePointer className="w-4 h-4" />
            <span className="hidden sm:inline">Select</span>
          </button>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Shape Additions */}
          <button
            onClick={() => addShape("rect")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Add Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => addShape("circle")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Add Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => addShape("line")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Add Line"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => addShape("text")}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Add Text"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => addShape("note")}
            className="p-2 rounded-lg text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
            title="Add Sticky Note"
          >
            <StickyNote className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette & Stroke Controls */}
        <div className="flex items-center gap-3 bg-slate-900/90 p-1.5 px-3 rounded-xl border border-white/10">
          <div className="flex items-center gap-1">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded-full transition-transform ${
                  strokeColor === color ? "scale-125 ring-2 ring-white" : "hover:scale-110 opacity-80"
                }`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Stroke Width Slider */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[10px] uppercase font-bold">Size</span>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-16 h-1 accent-rose-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={deleteSelected}
            className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all text-xs font-bold flex items-center gap-1"
            title="Delete Selected"
          >
            <Eraser className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold flex items-center gap-1"
            title="Clear Entire Canvas"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={exportImage}
            className="p-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 hover:opacity-95 transition-all"
            title="Download PNG Image"
          >
            <Download className="w-4 h-4" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      {/* 🎨 Canvas Rendering Viewport */}
      <div ref={containerRef} className="flex-1 w-full h-full relative cursor-crosshair">
        <canvas ref={canvasRef} />
      </div>

      {/* 🔍 Bottom Zoom & Stats Overlay */}
      <div className="absolute bottom-4 left-4 bg-slate-950/90 border border-white/10 backdrop-blur rounded-xl p-1.5 px-3 flex items-center gap-2 text-xs text-slate-400 z-10">
        <button onClick={() => changeZoom(1.2)} className="hover:text-white transition-colors">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] font-bold text-white">{Math.round(zoomLevel * 100)}%</span>
        <button onClick={() => changeZoom(0.8)} className="hover:text-white transition-colors">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
