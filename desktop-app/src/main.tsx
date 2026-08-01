import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// Excalidraw styles — required for the whiteboard to work
import "@excalidraw/excalidraw/index.css";
import { App } from "./App";
import { applyTheme, getThemeColors } from "@/utils/themes";

// Apply default theme immediately on script load
applyTheme(getThemeColors("oled"));

// App initialization
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Please ensure index.html has a div with id 'root'");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
