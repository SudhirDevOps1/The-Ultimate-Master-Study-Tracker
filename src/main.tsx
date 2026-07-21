import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { registerServiceWorker } from "./sw-register";

// App initialization
const isDevelopment = import.meta.env.DEV;

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found. Please ensure index.html has a div with id 'root'");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

} catch (error) {
  console.error('App initialization failed:', error);
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #0f172a;
      color: #f1f5f9;
      font-family: system-ui;
      text-align: center;
      padding: 20px;
    ">
      <div>
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h1 style="margin: 0 0 10px 0;">App Failed to Initialize</h1>
        <p style="margin: 0 0 20px 0; color: #cbd5e1;">
          ${error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <button onclick="location.reload()" style="
          background: #06b6d4;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">
          Reload Page
        </button>
      </div>
    </div>
  `;
}

// Only register service worker in browser/web mode.
// In Electron (desktop app) it's not needed and can cause conflicts.
const isElectronRuntime = typeof window !== "undefined" && !!(window as any).require;
if (!isElectronRuntime) {
  registerServiceWorker();
}
