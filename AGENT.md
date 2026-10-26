# AGENT.md – AI Agent & Engineering Instructions

This document serves as the single source of truth for AI agents (Antigravity, Claude, Copilot, Cursor, etc.) and human contributors working on **The Ultimate Master Study Tracker (FlowTrack Pro)**.

---

## 🎯 Project Overview & Architecture

FlowTrack Pro is an all-in-one local-first productivity and study tracking environment composed of:
1. **`desktop-app/`**: Electron + React 19 + TypeScript + Vite. Bundled into cross-platform installers (Windows `.exe`, macOS `.dmg`, Linux `.AppImage`). Contains native background window tracking and distraction blocker routines.
2. **`web-app/`**: Standalone web application with Dexie.js (IndexedDB local database), Framer Motion, Recharts, and optional Firebase cloud sync.
3. **Workspace Root**: Husky pre-commit hooks, Commitlint (Conventional Commits), Release-Please automation, and GitHub Actions CI/CD workflows.

---

## ⚡ Performance & Resource Optimization Rules (Low Memory / Low CPU)

Task Manager reveals multiple Electron helper processes (Main, Renderer, GPU, Utility). To keep resource usage minimal on low-end and high-end systems alike:

1. **Chromium Engine Switches (`desktop-app/electron.js`)**:
   - Limit background throttling and aggressive memory discard flags (`--enable-features=DocumentPictureInPictureAPI`, `--disable-renderer-backgrounding=false`).
   - Run active window tracker loop using lightweight native C# binary (`win-tracker.exe`) or Electron `powerMonitor.getSystemIdleTime()`. Never spawn heavy shell processes (like PowerShell/wscript) in high-frequency loops.
   - Clean up cached arrays and restrict in-memory logs to bounded ring buffers (capped to 2,000 entries to prevent memory bloat).
   - Trigger V8 garbage collection (`global.gc`) when window is minimized or hidden to tray.
2. **Renderer Optimizations**:
   - Clean up event listeners, timers (`setInterval`), and canvas contexts (Fabric.js) on unmount.
   - Mount only the active `<webview>` portal in DOM; dynamically suspend inactive background tabs to slash RAM from **1GB+ down to ~120MB**.
   - Utilize lazy loading (`React.lazy`) for heavy analytical pages and portals.
   - For Web Portals (`WebPortalsPage`), always maintain 100% full-width viewports and smart omnibox fallback to search engines. Keep portal navigation accessible via slide-over drawers to avoid squeezing browser width.

---

## 🤖 Continuous Monitoring, GitHub CLI (`gh`), & Code Quality Protocol

Every AI agent and contributor must follow this strict post-push verification protocol:

1. **GitHub CLI (`gh`) Pipeline Inspection**:
   - Immediately after running `git push origin <branch>`, inspect live pipeline runs:
     ```bash
     gh run list --limit 6
     ```
   - If any workflow job fails, retrieve the exact failure logs:
     ```bash
     gh run view <run-id> --log-failed
     ```
   - Resolve any lint, typecheck, or test failures immediately.
2. **Branch, Tag & Release Health Monitoring**:
   - Check pending pull requests: `gh pr list`
   - Check releases and deployed artifacts: `gh release list`
   - Verify semantic tag alignment: `git tag -l -n1`
3. **CodeRabbit AI Automated Code Reviews**:
   - Governed via `.coderabbit.yaml` in the root repository.
   - CodeRabbit provides automated reviews for memory efficiency, TypeScript safety, AST security patterns, and performance regressions on every PR and commit.
4. **Active Security & Secret Scanning Workflows**:
   - Gitleaks (`.github/workflows/gitleaks.yml`): Continuous secret & credential leakage detection.
   - OpenSSF Scorecard (`.github/workflows/scorecard.yml`): Supply chain security scoring and SARIF reporting.
   - Stale Manager (`.github/workflows/stale.yml`): Automated issue & PR hygiene.

---

## 📦 Automated Release & Binary Distribution

- **Release Automation**: Handled via `.github/workflows/release.yml` using Google's `release-please`.
- **Desktop Artifacts**: When a release is triggered (`release_created`), the pipeline builds and uploads executable installer packages (`FlowTrackPro Setup <version>.exe`, `.dmg`, `.AppImage`) directly to the GitHub Release assets.

---

## 🛠️ Code Conventions & Commit Guidelines

- **Commit Format**: Strict [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: ...` for new features
  - `fix: ...` for bug fixes
  - `perf: ...` for memory/CPU optimizations
  - `chore: ...` for dependency updates or routine work
- **Lint & Type Safety**:
  - Run `npm run typecheck` in `desktop-app` prior to committing.
  - Maintain absolute backwards compatibility with local IndexedDB schemas (Dexie.js).
