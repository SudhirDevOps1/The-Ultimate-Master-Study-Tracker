#!/usr/bin/env node

/**
 * FlowTrack Pro - Unified Version Synchronizer & Bumper
 * 
 * Usage:
 *   node scripts/sync-version.mjs              # Checks and synchronizes version across all files
 *   node scripts/sync-version.mjs 0.3.1        # Bumps version to 0.3.1 everywhere at once
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const targetVersion = process.argv[2]?.trim();

// Target files that must contain the version
const manifestPath = path.join(rootDir, ".release-please-manifest.json");
const rootPkgPath = path.join(rootDir, "package.json");
const desktopPkgPath = path.join(rootDir, "desktop-app", "package.json");
const webPkgPath = path.join(rootDir, "web-app", "package.json");
const desktopVersionTs = path.join(rootDir, "desktop-app", "src", "config", "version.ts");
const webVersionTs = path.join(rootDir, "web-app", "src", "config", "version.ts");

function getVersion() {
  if (targetVersion) return targetVersion;
  const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, "utf8"));
  return pkg.version;
}

const version = getVersion();
console.log(`\n🚀 [FlowTrack Version Engine] Synchronizing Single Source of Truth to: v${version}\n`);

// 1. Update .release-please-manifest.json
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest["."] = version;
  manifest["desktop-app"] = version;
  manifest["web-app"] = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log("  ✅ Updated .release-please-manifest.json");
}

// 2. Update all package.json files
const pkgPaths = [rootPkgPath, desktopPkgPath, webPkgPath];
for (const p of pkgPaths) {
  if (fs.existsSync(p)) {
    const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
    pkg.version = version;
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    console.log(`  ✅ Updated ${path.relative(rootDir, p)}`);
  }
}

// 3. Update version.ts files (desktop-app & web-app)
const versionTsPaths = [desktopVersionTs, webVersionTs];
const versionRegex = /export const APP_VERSION = ".*?";/;
const todayStr = new Date().toISOString().split("T")[0];
const dateRegex = /export const APP_RELEASE_DATE = ".*?";/;

for (const p of versionTsPaths) {
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, "utf8");
    content = content.replace(versionRegex, `export const APP_VERSION = "${version}";`);
    content = content.replace(dateRegex, `export const APP_RELEASE_DATE = "${todayStr}";`);
    fs.writeFileSync(p, content, "utf8");
    console.log(`  ✅ Updated ${path.relative(rootDir, p)}`);
  }
}

console.log(`\n🎉 Success! All packages, manifests, and UI components are now unified at v${version}.\n`);
