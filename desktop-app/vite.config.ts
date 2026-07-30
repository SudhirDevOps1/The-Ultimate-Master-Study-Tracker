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
    rollupOptions: {
      output: {
        // Fixed: no circular dependencies — let Rollup decide chunking naturally
        manualChunks: {
          // Core React bundle
          "react-core": ["react", "react-dom", "react-router-dom"],
          // Excalidraw in its own isolated chunk (lazy loaded)
          "excalidraw": ["@excalidraw/excalidraw"],
        }
      }
    }
  }
});
