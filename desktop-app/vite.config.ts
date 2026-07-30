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
    // Pre-bundle Excalidraw and its dependencies for faster dev
    include: ["@excalidraw/excalidraw"],
  },
  build: {
    chunkSizeWarningLimit: 5000, // Excalidraw is large (~3MB), raise limit
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep Excalidraw in its own chunk for optimal caching
          if (id.includes("@excalidraw")) return "excalidraw";
          if (id.includes("roughjs") || id.includes("rough")) return "excalidraw";
          if (id.includes("node_modules")) return "vendor";
        }
      }
    }
  }
});
