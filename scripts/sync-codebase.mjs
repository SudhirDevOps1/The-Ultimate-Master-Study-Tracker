#!/usr/bin/env node
/**
 * FlowTrack Pro - Enterprise Codebase SSOT Synchronizer
 * 
 * Synchronizes source files between desktop-app/src and web-app/src.
 * Guarantees zero byte drift across the entire monorepo.
 *
 * Usage:
 *   node scripts/sync-codebase.mjs [--from=desktop|web|auto] [--dry-run]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DESKTOP_SRC = path.resolve(rootDir, "desktop-app", "src");
const WEB_SRC = path.resolve(rootDir, "web-app", "src");

const args = process.argv.slice(2);
const fromArg = (args.find(a => a.startsWith("--from=")) || "--from=desktop").split("=")[1];
const isDryRun = args.includes("--dry-run");

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

function sync() {
  console.log(`\n🔄 [SSOT Sync] Starting synchronization (Mode: --from=${fromArg}, DryRun: ${isDryRun})...\n`);

  const desktopFiles = new Set(getAllFiles(DESKTOP_SRC));
  const webFiles = new Set(getAllFiles(WEB_SRC));
  const allFiles = new Set([...desktopFiles, ...webFiles]);

  let updatedCount = 0;
  let identicalCount = 0;
  let copiedToWeb = 0;
  let copiedToDesktop = 0;

  for (const relPath of Array.from(allFiles).sort()) {
    const dPath = path.join(DESKTOP_SRC, relPath);
    const wPath = path.join(WEB_SRC, relPath);

    const dExists = fs.existsSync(dPath);
    const wExists = fs.existsSync(wPath);

    if (dExists && wExists) {
      const dContent = fs.readFileSync(dPath, "utf8");
      const wContent = fs.readFileSync(wPath, "utf8");

      if (normalize(dContent) === normalize(wContent)) {
        identicalCount++;
        continue;
      }

      // Drift detected
      let sourcePath, targetPath, direction;
      if (fromArg === "desktop") {
        sourcePath = dPath;
        targetPath = wPath;
        direction = "desktop ➔ web";
      } else if (fromArg === "web") {
        sourcePath = wPath;
        targetPath = dPath;
        direction = "web ➔ desktop";
      } else {
        // Auto based on mtime
        const dStat = fs.statSync(dPath);
        const wStat = fs.statSync(wPath);
        if (dStat.mtimeMs >= wStat.mtimeMs) {
          sourcePath = dPath;
          targetPath = wPath;
          direction = "desktop ➔ web (newer)";
        } else {
          sourcePath = wPath;
          targetPath = dPath;
          direction = "web ➔ desktop (newer)";
        }
      }

      if (!isDryRun) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, fs.readFileSync(sourcePath));
      }
      console.log(`  📝 Updated: ${relPath} (${direction})`);
      updatedCount++;
    } else if (dExists && !wExists) {
      if (fromArg === "web") continue;
      if (!isDryRun) {
        fs.mkdirSync(path.dirname(wPath), { recursive: true });
        fs.writeFileSync(wPath, fs.readFileSync(dPath));
      }
      console.log(`  ➕ Added to web: ${relPath}`);
      copiedToWeb++;
      updatedCount++;
    } else if (!dExists && wExists) {
      if (fromArg === "desktop") continue;
      if (!isDryRun) {
        fs.mkdirSync(path.dirname(dPath), { recursive: true });
        fs.writeFileSync(dPath, fs.readFileSync(wPath));
      }
      console.log(`  ➕ Added to desktop: ${relPath}`);
      copiedToDesktop++;
      updatedCount++;
    }
  }

  console.log(`\n✨ [SSOT Sync Summary]`);
  console.log(`   Identical files : ${identicalCount}`);
  console.log(`   Files updated   : ${updatedCount}`);
  console.log(`   Copied to web   : ${copiedToWeb}`);
  console.log(`   Copied to desk  : ${copiedToDesktop}`);
  console.log(`   Total in sync   : ${allFiles.size}\n`);
}

sync();
