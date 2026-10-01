import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    include: ["@excalidraw/excalidraw"],
  },
  build: {
    chunkSizeWarningLimit: 5000,
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "react-core";
          }
          if (id.includes("node_modules/fabric") || id.includes("node_modules/html2canvas")) {
            return "canvas-engine";
          }
          if (id.includes("node_modules/pdfjs-dist") || id.includes("node_modules/tesseract.js")) {
            return "pdf-ocr-vendor";
          }
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-")) {
            return "charts-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons-vendor";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "motion-vendor";
          }
        },
      },
    },
  },
});
