// Service workers are not used in Electron desktop apps (running over file:// protocol).
export function registerServiceWorker() {
  // No-op for desktop application
}
