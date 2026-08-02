import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { 
  Pencil, Eraser, Square, Circle, Type, StickyNote, Download, Trash2, 
  RotateCcw, RotateCw, MousePointer, ZoomIn, ZoomOut, Image as ImageIcon,
  ArrowRight, Minus, Layers, Hand, BoxSelect, Highlighter,
  Diamond, Type as FontIcon, Copy, Upload, Flame,
  BringToFront, SendToBack, Magnet, AlignCenter, Maximize2, Minimize2,
  Sparkles, Palette, HelpCircle
} from "lucide-react";
import { useToast } from "@/components/common/Toast";

interface FabricWhiteboardProps {
  storageKey?: string;
}

const COLOR_PRESETS = [
  "#ffffff", "#f43f5e", "#ec4899", "#a855f7", "#3b82f6", 
  "#06b6d4", "#10b981", "#eab308", "#f97316", "#64748b"
];

const FONTS = [
  { name: "Handwritten (Excalidraw)", family: "'Caveat', 'Architects Daughter', cursive, sans-serif" },
  { name: "Modern Sans", family: "'Inter', system-ui, sans-serif" },
  { name: "Monospace", family: "'Courier New', monospace" },
];

export function FabricWhiteboard({ storageKey = "flowtrack_fabric_whiteboard_v1" }: FabricWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const { showToast } = useToast();

  const [activeTool, setActiveTool] = useState<
    "select" | "draw" | "highlighter" | "laser" | "erase" | "pan" | 
    "rect" | "circle" | "diamond" | "line" | "arrow" | "text" | "note"
  >("draw");

  const [strokeColor, setStrokeColor] = useState("#f97316");
  const [fillColor, setFillColor] = useState("rgba(249,115,22,0.15)");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].family);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // History Stacks
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryProcessing = useRef<boolean>(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Laser trail state
  const laserPathsRef = useRef<fabric.Object[]>([]);

  // Save state to history
  const pushState = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isHistoryProcessing.current) return;
    try {
      const json = JSON.stringify(canvas.toJSON());
      localStorage.setItem(storageKey, json);

      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push(json);
      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;

      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
    } catch { /* ignore */ }
  }, [storageKey]);

  // Undo Action
  const handleUndo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    isHistoryProcessing.current = true;
    historyIndexRef.current -= 1;
    const previousState = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(previousState).then(() => {
      canvas.renderAll();
      isHistoryProcessing.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      showToast("Undo applied", "info");
    });
  }, [showToast]);

  // Redo Action
  const handleRedo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    isHistoryProcessing.current = true;
    historyIndexRef.current += 1;
    const nextState = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(nextState).then(() => {
      canvas.renderAll();
      isHistoryProcessing.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      showToast("Redo applied", "info");
    });
  }, [showToast]);

  // Duplicate Selected Objects
  const handleDuplicate = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (!activeObj) {
      showToast("Select any shape or drawing to duplicate", "warning");
      return;
    }

    activeObj.clone().then((cloned) => {
      canvas.discardActiveObject();
      cloned.set({
        left: cloned.left! + 25,
        top: cloned.top! + 25,
        evented: true,
      });
      if (cloned.type === "activeSelection") {
        cloned.canvas = canvas;
        (cloned as any).forEachObject((obj: fabric.Object) => {
          canvas.add(obj);
        });
        cloned.setCoordinates();
      } else {
        canvas.add(cloned);
      }
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      showToast("Duplicated object!", "success");
    });
  }, [showToast]);

  const snapToGridRef = useRef(snapToGrid);
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    if (!document.getElementById("google-fonts-excalidraw")) {
      const link = document.createElement("link");
      link.id = "google-fonts-excalidraw";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@600&display=swap";
      document.head.appendChild(link);
    }

    const width = containerRef.current.clientWidth || 1000;
    const height = containerRef.current.clientHeight || 720;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "transparent",
      isDrawingMode: true,
      selection: true,
      selectionColor: "rgba(6,182,212,0.15)",
      selectionLineWidth: 1.5,
      selectionBorderColor: "#06b6d4",
      preserveObjectStacking: true,
    });

    // Modern styled selection control handles
    fabric.Object.prototype.set({
      cornerColor: "#06b6d4",
      cornerStyle: "circle",
      cornerSize: 10,
      transparentCorners: false,
      borderColor: "#06b6d4",
    });

    fabricCanvasRef.current = canvas;

    // Ultra-Smooth Pencil Brush
    const brush = new fabric.PencilBrush(canvas);
    brush.color = strokeColor;
    brush.width = strokeWidth;
    brush.decimate = 1.5;
    brush.strokeLineCap = "round";
    brush.strokeLineJoin = "round";
    canvas.freeDrawingBrush = brush;

    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        canvas.loadFromJSON(savedData).then(() => {
          canvas.renderAll();
          historyRef.current = [savedData];
          historyIndexRef.current = 0;
        });
      } else {
        const initialJson = JSON.stringify(canvas.toJSON());
        historyRef.current = [initialJson];
        historyIndexRef.current = 0;
      }
    } catch (e) {
      console.error("Failed to restore whiteboard data:", e);
    }

    // Grid Snapping
    canvas.on("object:moving", (options) => {
      if (!snapToGridRef.current || !options.target) return;
      const gridSize = 20;
      options.target.set({
        left: Math.round((options.target.left || 0) / gridSize) * gridSize,
        top: Math.round((options.target.top || 0) / gridSize) * gridSize,
      });
    });

    canvas.on("object:added", (e) => {
      if (activeCanvasRefTool.current === "laser" && e.target) {
        const laserObj = e.target;
        laserPathsRef.current.push(laserObj);
        setTimeout(() => {
          canvas.remove(laserObj);
          canvas.renderAll();
        }, 1200);
        return;
      }
      pushState();
    });
    canvas.on("object:modified", () => pushState());
    canvas.on("object:removed", () => pushState());

    // Eraser Mode
    canvas.on("mouse:down", (opt) => {
      const activeCanvas = fabricCanvasRef.current;
      if (!activeCanvas) return;
      if (activeCanvasRefTool.current === "erase" && opt.target) {
        activeCanvas.remove(opt.target);
        activeCanvas.renderAll();
      }
    });

    // 360-Degree Mouse Wheel Zooming
    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 10) zoom = 10;
      if (zoom < 0.1) zoom = 0.1;
      canvas.zoomToPoint(new fabric.Point(opt.e.offsetX, opt.e.offsetY), zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      setZoomLevel(zoom);
    });

    // 360-Degree Drag Panning
    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on("mouse:down", (opt) => {
      const evt = opt.e;
      if (evt.altKey || activeCanvasRefTool.current === "pan") {
        isDragging = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (isDragging) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPosX;
          vpt[5] += e.clientY - lastPosY;
          canvas.requestRenderAll();
        }
        lastPosX = e.clientX;
        lastPosY = e.clientY;
      }
    });

    canvas.on("mouse:up", () => {
      if (isDragging) {
        canvas.setViewportTransform(canvas.viewportTransform);
        isDragging = false;
        canvas.selection = true;
      }
    });

    // Keyboard Shortcuts (Delete, Ctrl+Z, Ctrl+Y, Ctrl+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        const activeCanvas = fabricCanvasRef.current;
        if (activeCanvas) {
          const activeObjects = activeCanvas.getActiveObjects();
          if (activeObjects.length > 0) {
            activeObjects.forEach((obj) => activeCanvas.remove(obj));
            activeCanvas.discardActiveObject();
            activeCanvas.renderAll();
          }
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.ctrlKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

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
      window.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [storageKey, pushState, handleUndo, handleRedo, handleDuplicate]);

  // Dynamically update canvas dimensions on Fullscreen toggle
  useEffect(() => {
    setTimeout(() => {
      if (!containerRef.current || !fabricCanvasRef.current) return;
      fabricCanvasRef.current.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      fabricCanvasRef.current.renderAll();
    }, 100);
  }, [isFullscreen]);

  const activeCanvasRefTool = useRef(activeTool);
  useEffect(() => {
    activeCanvasRefTool.current = activeTool;
  }, [activeTool]);

  // Sync tool change with Fabric canvas modes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (activeTool === "draw" || activeTool === "highlighter" || activeTool === "laser") {
      canvas.isDrawingMode = true;
      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }

      if (activeTool === "laser") {
        canvas.freeDrawingBrush.color = "#f43f5e";
        canvas.freeDrawingBrush.width = 6;
      } else if (activeTool === "highlighter") {
        canvas.freeDrawingBrush.color = strokeColor.startsWith("#") ? `${strokeColor}55` : "rgba(234,179,8,0.35)";
        canvas.freeDrawingBrush.width = strokeWidth * 4;
      } else {
        canvas.freeDrawingBrush.color = strokeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
      }
      (canvas.freeDrawingBrush as fabric.PencilBrush).decimate = 1.5;
      (canvas.freeDrawingBrush as fabric.PencilBrush).strokeLineCap = "round";
      (canvas.freeDrawingBrush as fabric.PencilBrush).strokeLineJoin = "round";
    } else {
      canvas.isDrawingMode = false;
    }

    if (activeTool === "select") {
      canvas.selection = true;
      canvas.defaultCursor = "default";
    } else if (activeTool === "pan") {
      canvas.selection = false;
      canvas.defaultCursor = "grab";
    } else if (activeTool === "erase") {
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
    } else {
      canvas.defaultCursor = "default";
    }
  }, [activeTool, strokeColor, strokeWidth]);

  // Add Shapes, Text & Directly Editable Sticky Notes
  const addShape = (type: "rect" | "circle" | "diamond" | "line" | "arrow" | "text" | "note") => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const center = canvas.getVpCenter();

    if (type === "rect") {
      const rect = new fabric.Rect({
        left: center.x - 60,
        top: center.y - 40,
        width: 140,
        height: 90,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        rx: 10,
        ry: 10,
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    } else if (type === "circle") {
      const circle = new fabric.Circle({
        left: center.x - 50,
        top: center.y - 50,
        radius: 50,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      });
      canvas.add(circle);
      canvas.setActiveObject(circle);
    } else if (type === "diamond") {
      const diamond = new fabric.Polygon(
        [
          { x: 60, y: 0 },
          { x: 120, y: 60 },
          { x: 60, y: 120 },
          { x: 0, y: 60 },
        ],
        {
          left: center.x - 60,
          top: center.y - 60,
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        }
      );
      canvas.add(diamond);
      canvas.setActiveObject(diamond);
    } else if (type === "line") {
      const line = new fabric.Line([center.x - 70, center.y, center.x + 70, center.y], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      });
      canvas.add(line);
      canvas.setActiveObject(line);
    } else if (type === "arrow") {
      const line = new fabric.Line([center.x - 70, center.y, center.x + 50, center.y], {
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      });
      const triangle = new fabric.Triangle({
        left: center.x + 50,
        top: center.y - strokeWidth * 2,
        angle: 90,
        width: strokeWidth * 4,
        height: strokeWidth * 4,
        fill: strokeColor,
      });
      const group = new fabric.Group([line, triangle]);
      canvas.add(group);
      canvas.setActiveObject(group);
    } else if (type === "text") {
      const text = new fabric.IText("Double click to edit text", {
        left: center.x - 110,
        top: center.y - 15,
        fontFamily: selectedFont,
        fontSize: 26,
        fill: strokeColor,
      });
      canvas.add(text);
      canvas.setActiveObject(text);
    } else if (type === "note") {
      const note = new fabric.Textbox("📌 Quick Sticky Note\n(Double click to edit text)", {
        left: center.x - 90,
        top: center.y - 90,
        width: 180,
        height: 180,
        fontSize: 20,
        fontFamily: selectedFont,
        fill: "#fef9c3",
        backgroundColor: "rgba(234, 179, 8, 0.25)",
        borderColor: "#eab308",
        borderScaleFactor: 2,
        padding: 14,
        rx: 12,
        ry: 12,
        splitByGrapheme: true,
      });
      canvas.add(note);
      canvas.setActiveObject(note);
    }

    canvas.renderAll();
    setActiveTool("select");
    showToast(`Added ${type}`, "info");
  };

  // Upload Local PC Image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      if (!data) return;

      const imgObj = new Image();
      imgObj.src = data;
      imgObj.onload = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const fabricImg = new fabric.Image(imgObj);
        const center = canvas.getVpCenter();

        if (fabricImg.width! > 500) {
          fabricImg.scaleToWidth(500);
        }

        fabricImg.set({
          left: center.x - (fabricImg.getBoundingRect().width / 2),
          top: center.y - (fabricImg.getBoundingRect().height / 2),
        });

        canvas.add(fabricImg);
        canvas.setActiveObject(fabricImg);
        canvas.renderAll();
        setActiveTool("select");
        showToast("Image uploaded to Whiteboard!", "success");
      };
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Export Scene JSON File
  const exportJSON = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const jsonStr = JSON.stringify(canvas.toJSON());
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `flowtrack_whiteboard_project_${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Exported Whiteboard Project JSON!", "success");
  };

  // Import Scene JSON File
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      const content = f.target?.result as string;
      if (!content) return;
      try {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.loadFromJSON(content).then(() => {
          canvas.renderAll();
          pushState();
          showToast("Imported Whiteboard Project!", "success");
        });
      } catch {
        showToast("Invalid JSON file", "error");
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = "";
  };

  // Align Objects
  const alignCenterHorizontal = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      canvas.centerObjectH(activeObj);
      canvas.renderAll();
      showToast("Aligned Centered Horizontally", "info");
    }
  };

  // Layer Stacking
  const bringToFront = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      canvas.bringObjectToFront(activeObj);
      canvas.renderAll();
      showToast("Brought to Front", "info");
    }
  };

  const sendToBack = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
      canvas.sendObjectToBack(activeObj);
      canvas.renderAll();
      showToast("Sent to Back", "info");
    }
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
      showToast(`Deleted ${activeObjects.length} object(s)`, "info");
    } else {
      showToast("Click or drag box select objects to delete", "warning");
    }
  };

  // Clear Whiteboard
  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.renderAll();
    localStorage.removeItem(storageKey);
    pushState();
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
    showToast("Downloaded High-Res PNG Image!", "success");
  };

  // Zoom controls
  const changeZoom = (factor: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    let newZoom = canvas.getZoom() * factor;
    if (newZoom > 10) newZoom = 10;
    if (newZoom < 0.1) newZoom = 0.1;
    canvas.zoomToPoint(canvas.getVpCenter(), newZoom);
    setZoomLevel(newZoom);
  };

  const resetZoomPan = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoomLevel(1);
    showToast("Reset Canvas View", "info");
  };

  return (
    <div className={`relative w-full ${isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen w-screen" : "h-[760px] rounded-2xl"} bg-slate-950 border border-white/10 overflow-hidden flex flex-col shadow-2xl transition-all`}>
      {/* Hidden File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      <input type="file" ref={jsonInputRef} onChange={importJSON} accept="application/json" className="hidden" />

      {/* 🛠️ Top Mac-Style Glassmorphism Floating Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950/80 border-b border-white/10 backdrop-blur-xl z-20 shadow-lg">
        {/* Left Section: Font & Grid Snap */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 px-3 rounded-xl border border-white/10 text-xs">
            <FontIcon className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {FONTS.map((font) => (
                <option key={font.name} value={font.family} className="bg-slate-900 text-white">
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSnapToGrid(!snapToGrid);
              showToast(`Grid Snapping ${!snapToGrid ? "Enabled (20px)" : "Disabled"}`, "info");
            }}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              snapToGrid ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-lg shadow-cyan-500/20" : "bg-slate-900/90 text-slate-400 border-white/10 hover:text-white"
            }`}
            title="Snap Objects to 20px Grid Boundaries"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Snap Grid</span>
          </button>
        </div>

        {/* Center Color Palette & Stroke Size */}
        <div className="flex items-center gap-3 bg-slate-900/90 p-1.5 px-3 rounded-2xl border border-white/10 shadow-inner">
          <div className="flex items-center gap-1.5">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  setStrokeColor(color);
                  setFillColor(color === "#ffffff" ? "rgba(255,255,255,0.1)" : `${color}25`);
                }}
                style={{ backgroundColor: color }}
                className={`w-5 h-5 rounded-full transition-all ${
                  strokeColor === color ? "scale-125 ring-2 ring-white shadow-lg" : "hover:scale-110 opacity-75 hover:opacity-100"
                }`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-[10px] uppercase font-bold text-slate-400">Size</span>
            <input
              type="range"
              min="1"
              max="30"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-16 h-1 accent-rose-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Section: Actions & Export */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
            <button onClick={handleUndo} disabled={!canUndo} className={`p-2 rounded-lg transition-all ${canUndo ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-600 cursor-not-allowed"}`} title="Undo (Ctrl+Z)">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={handleRedo} disabled={!canRedo} className={`p-2 rounded-lg transition-all ${canRedo ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-600 cursor-not-allowed"}`} title="Redo (Ctrl+Y)">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10">
            <button onClick={handleDuplicate} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Duplicate Object (Ctrl+D)">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={bringToFront} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Bring to Front">
              <BringToFront className="w-4 h-4" />
            </button>
            <button onClick={sendToBack} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Send to Back">
              <SendToBack className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => jsonInputRef.current?.click()} className="p-2 rounded-xl border border-white/10 bg-white/5 text-cyan-400 hover:bg-cyan-500/10 transition-all text-xs font-bold" title="Import JSON Project">
            <Upload className="w-4 h-4" />
          </button>

          <button onClick={exportJSON} className="p-2 rounded-xl border border-white/10 bg-white/5 text-purple-400 hover:bg-purple-500/10 transition-all text-xs font-bold" title="Export Editable JSON Project">
            <Layers className="w-4 h-4" />
          </button>

          <button onClick={deleteSelected} className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all text-xs font-bold" title="Delete Selected Items (Delete key)">
            <Trash2 className="w-4 h-4" />
          </button>

          <button onClick={clearCanvas} className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold" title="Clear Canvas">
            <RotateCcw className="w-4 h-4" />
          </button>

          <button onClick={exportImage} className="p-2 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 hover:opacity-95 transition-all">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 🖌️ Left Vertical Floating Tools Dock (Compact & Scrollable) */}
      <div className="absolute left-3 top-16 z-20 max-h-[calc(100%-80px)] overflow-y-auto scrollbar-none flex flex-col gap-1 p-1.5 bg-slate-950/90 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl">
        <button
          onClick={() => setActiveTool("draw")}
          className={`p-2 rounded-xl transition-all ${
            activeTool === "draw" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-105" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Ultra-Smooth Pen (P)"
        >
          <Pencil className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTool("highlighter")}
          className={`p-2 rounded-xl transition-all ${
            activeTool === "highlighter" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40 scale-105" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Highlighter Marker"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTool("laser")}
          className={`p-2 rounded-xl transition-all ${
            activeTool === "laser" ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse scale-105" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Fading Laser Trail"
        >
          <Flame className="w-4 h-4 text-rose-400" />
        </button>

        <button
          onClick={() => setActiveTool("select")}
          className={`p-2 rounded-xl transition-all ${
            activeTool === "select" ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/40 scale-105" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Lasso Box Select (V)"
        >
          <BoxSelect className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTool("pan")}
          className={`p-2 rounded-xl transition-all ${
            activeTool === "pan" ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/40 scale-105" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="360° Infinite Pan (H or Alt+Drag)"
        >
          <Hand className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTool("erase")}
          className={`p-2 rounded-xl transition-all ${
            activeTool === "erase" ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40 scale-105" : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title="Object Eraser"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="w-full h-px bg-white/10 my-0.5" />

        <button onClick={() => addShape("rect")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Rectangle">
          <Square className="w-4 h-4" />
        </button>
        <button onClick={() => addShape("circle")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Circle">
          <Circle className="w-4 h-4" />
        </button>
        <button onClick={() => addShape("diamond")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Diamond Decision">
          <Diamond className="w-4 h-4" />
        </button>
        <button onClick={() => addShape("line")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Line">
          <Minus className="w-4 h-4" />
        </button>
        <button onClick={() => addShape("arrow")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Arrow Connector">
          <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={() => addShape("text")} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Text">
          <Type className="w-4 h-4" />
        </button>
        <button onClick={() => addShape("note")} className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors" title="Editable Sticky Note">
          <StickyNote className="w-4 h-4" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors" title="Upload Local PC Image">
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>

      {/* 🎨 Excalidraw Style Patterned Canvas Viewport */}
      <div ref={containerRef} className="flex-1 w-full h-full relative cursor-crosshair bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:24px_24px]">
        <canvas ref={canvasRef} />
      </div>

      {/* 🔍 Bottom Canvas View & Shortcuts Bar */}
      <div className="absolute bottom-4 left-4 bg-slate-950/80 border border-white/10 backdrop-blur-xl rounded-xl p-2 px-3 flex items-center gap-3 text-xs text-slate-400 z-20 shadow-xl">
        <div className="flex items-center gap-2">
          <button onClick={() => changeZoom(1.25)} className="p-1 hover:text-white transition-colors" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={resetZoomPan} className="font-mono text-xs font-bold text-white hover:text-cyan-400 transition-colors" title="Click to Reset 100% View">
            {Math.round(zoomLevel * 100)}%
          </button>
          <button onClick={() => changeZoom(0.8)} className="p-1 hover:text-white transition-colors" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        <div className="h-3 w-px bg-white/20" />

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          ✨ <span className="font-semibold text-slate-300">Lasso Drag Box</span> select multiple items | <span className="font-semibold text-slate-300">Alt + Drag</span> 360° pan everywhere
        </span>
      </div>
    </div>
  );
}
