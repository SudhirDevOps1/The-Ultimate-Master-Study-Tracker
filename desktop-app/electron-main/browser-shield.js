const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { dialog } = require("electron");

/**
 * Browser Shield & Extension Manager
 * Handles:
 * 1. Enhanced Ad & Tracker Blocking (@ghostery/adblocker-electron) on persist:browser_session
 * 2. Opt-in local Chrome Extension loader (unpacked folders with manifest.json)
 */

let blockerInstance = null;
let installedExtensions = [];
let userDataDir = "";

function getExtensionsFilePath() {
  return path.join(userDataDir, "installed_extensions.json");
}

function loadExtensionsList() {
  try {
    const p = getExtensionsFilePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, "utf8"));
      return Array.isArray(data) ? data : [];
    }
  } catch (e) {
    console.warn("[extensions] Failed to read extensions list:", e.message);
  }
  return [];
}

function saveExtensionsList(list) {
  try {
    const p = getExtensionsFilePath();
    fs.writeFileSync(p, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.error("[extensions] Failed to save extensions list:", e.message);
  }
}

/**
 * Enable enhanced Ghostery AdBlocker on the session
 */
async function enableEnhancedAdBlocker(portalSession) {
  if (blockerInstance) return { ok: true, alreadyActive: true };
  try {
    const { ElectronBlocker } = require("@ghostery/adblocker-electron");
    blockerInstance = await ElectronBlocker.fromPrebuiltAdsAndTracking();
    if (blockerInstance && portalSession) {
      blockerInstance.enableBlockingInSession(portalSession);
      console.log("[adblocker] Enhanced AdBlocker enabled in portal session.");
      return { ok: true };
    }
  } catch (err) {
    console.warn("[adblocker] Enhanced blocker load error:", err && err.message);
    return { ok: false, error: err && err.message };
  }
  return { ok: false };
}

/**
 * Disable enhanced Ghostery AdBlocker
 */
function disableEnhancedAdBlocker(portalSession) {
  if (blockerInstance && portalSession) {
    try {
      blockerInstance.disableBlockingInSession(portalSession);
    } catch (e) {}
    blockerInstance = null;
    console.log("[adblocker] Enhanced AdBlocker disabled.");
  }
}

/**
 * Initialize extensions in session
 */
async function initExtensionsManager(portalSession, userDataPath) {
  userDataDir = userDataPath;
  installedExtensions = loadExtensionsList();

  for (const ext of installedExtensions) {
    if (ext.enabled && ext.path && fs.existsSync(ext.path)) {
      try {
        await portalSession.loadExtension(ext.path, { allowFileAccess: true });
        console.log(`[extensions] Pre-loaded: ${ext.name}`);
      } catch (e) {
        console.warn(`[extensions] Failed to load ${ext.name}:`, e.message);
      }
    }
  }
}

/**
 * Install an unpacked extension folder picked by user
 */
async function installExtensionFolder(mainWindow, portalSession) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Unpacked Chrome Extension Folder",
    properties: ["openDirectory"],
  });

  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return { ok: false, error: "Canceled" };
  }

  const folderPath = result.filePaths[0];
  const manifestPath = path.join(folderPath, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, error: "Invalid extension folder: manifest.json not found." };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (e) {
    return { ok: false, error: "Failed to parse manifest.json: " + e.message };
  }

  const name = manifest.name || path.basename(folderPath);
  const version = manifest.version || "1.0.0";
  const id = crypto.randomUUID();

  try {
    await portalSession.loadExtension(folderPath, { allowFileAccess: true });
    const extRecord = {
      id,
      name,
      version,
      path: folderPath,
      enabled: true,
      description: manifest.description || "",
    };
    installedExtensions.push(extRecord);
    saveExtensionsList(installedExtensions);
    return { ok: true, extension: extRecord };
  } catch (e) {
    return { ok: false, error: "Failed to load extension into session: " + e.message };
  }
}

/**
 * Toggle extension enabled state
 */
async function toggleExtension(portalSession, id, enabled) {
  const ext = installedExtensions.find(e => e.id === id);
  if (!ext) return { ok: false, error: "Extension not found" };

  ext.enabled = enabled;
  saveExtensionsList(installedExtensions);

  if (enabled && fs.existsSync(ext.path)) {
    try {
      await portalSession.loadExtension(ext.path, { allowFileAccess: true });
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  return { ok: true, extension: ext };
}

/**
 * Remove an extension
 */
function removeExtension(id) {
  installedExtensions = installedExtensions.filter(e => e.id !== id);
  saveExtensionsList(installedExtensions);
  return { ok: true };
}

module.exports = {
  enableEnhancedAdBlocker,
  disableEnhancedAdBlocker,
  initExtensionsManager,
  installExtensionFolder,
  toggleExtension,
  removeExtension,
  getInstalledExtensions: () => installedExtensions,
};
