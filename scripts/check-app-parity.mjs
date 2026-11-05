#!/usr/bin/env node
/**
 * FlowTrack Pro - Monorepo Parity Enforcer & CI Gate
 * 
 * Verifies that shared source files between desktop-app/src and web-app/src
 * are 100% byte-identical. Fails with code 1 if any drift is detected.
 *
 * Usage:
 *   node scripts/check-app-parity.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DESKTOP_SRC = path.resolve(rootDir, "desktop-app", "src");
const WEB_SRC = path.resolve(rootDir, "web-app", "src");

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.resolve(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else {
      results.push(path.relative(baseDir, fullPath));
    }
  }
  return results;
}

function normalize(content) {
  return content.replace(/\r\n/g, "\n");
}

function checkParity() {
  console.log(`\n🔍 [Parity Check] Auditing source parity between desktop-app/src and web-app/src...\n`);

  const desktopFiles = new Set(getAllFiles(DESKTOP_SRC));
  const webFiles = new Set(getAllFiles(WEB_SRC));
  const allFiles = new Set([...desktopFiles, ...webFiles]);

  const drifted = [];
  const missingInWeb = [];
  const missingInDesktop = [];

  for (const relPath of Array.from(allFiles).sort()) {
    const dPath = path.join(DESKTOP_SRC, relPath);
    const wPath = path.join(WEB_SRC, relPath);

    const dExists = fs.existsSync(dPath);
    const wExists = fs.existsSync(wPath);

    if (dExists && wExists) {
      const dContent = fs.readFileSync(dPath, "utf8");
      const wContent = fs.readFileSync(wPath, "utf8");

      if (normalize(dContent) !== normalize(wContent)) {
        drifted.push(relPath);
      }
    } else if (dExists && !wExists) {
      missingInWeb.push(relPath);
    } else if (!dExists && wExists) {
      missingInDesktop.push(relPath);
    }
  }

  if (drifted.length === 0 && missingInWeb.length === 0 && missingInDesktop.length === 0) {
    console.log(`✅ [Parity Check Passed] All ${allFiles.size} files are 100% byte-identical across desktop and web.\n`);
    process.exit(0);
  }

  console.error(`❌ [Parity Violation Detected] Monorepo drift detected:`);
  if (drifted.length > 0) {
    console.error(`\n  ⚠️  Drifted files (${drifted.length}):`);
    drifted.forEach(f => console.error(`     - ${f}`));
  }
  if (missingInWeb.length > 0) {
    console.error(`\n  ⚠️  Missing in web-app (${missingInWeb.length}):`);
    missingInWeb.forEach(f => console.error(`     - ${f}`));
  }
  if (missingInDesktop.length > 0) {
    console.error(`\n  ⚠️  Missing in desktop-app (${missingInDesktop.length}):`);
    missingInDesktop.forEach(f => console.error(`     - ${f}`));
  }

  console.error(`\n💡 To synchronize the monorepo, run:\n   npm run sync:apps\n`);
  process.exit(1);
}

checkParity();
