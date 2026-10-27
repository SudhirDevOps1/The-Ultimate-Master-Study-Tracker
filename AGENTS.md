# AGENTS.md

FlowTrack Pro — local-first study/productivity tracker. Two near-duplicate React apps, one optional Python backend, 11 GitHub workflows. This file is the maintained instruction set; `AGENT.md` (singular) is legacy prose kept for reference — if they disagree, trust this file and the config files.

## Layout

- `desktop-app/` — Electron 43 + React 19 + Vite renderer. Main process `electron.js`, bridge `preload.js`, UI entry `src/main.tsx`. Packaged with electron-builder to `dist-electron/` (`productName: FlowTrackPro`, appId `com.flowtrack.studytracker`).
- `web-app/` — the same React app for the browser, plus `backend.py` (Python 3, sqlite3, **port 5001**, optional). `web-app/START.bat` creates `.venv`, starts the backend, then `npm run dev`.
- Root — commitlint + husky, release-please, workflows in `.github/workflows/`.

## The duplication trap

`desktop-app/src` and `web-app/src` share 85 files: 53 byte-identical, 32 drifted. Nothing links them (no workspace package, no shared lib). Before editing anything under `src/`, decide whether both apps need the change and copy it deliberately — a fix in one app does **not** reach the other. Compare with `git diff --no-index desktop-app/src web-app/src`.

Desktop-only modules: `PipStandalonePage`, `PipOverlayWidget`, `EnterpriseUpdateModal`, `FocusAudioMixer`, `VirtualStudyCompanion`, `lib/neonSync.ts`, `utils/notification.ts`, `utils/spacedRepetition.ts`. Web-only: `BackendActivityPanel`, `PerformanceScorecardModal`, `WeeklyReviewModal`, `WeeklySummary`.

## Commands (run inside the app directory)

- Install: `npm install --legacy-peer-deps`. **Never `npm ci`** — the committed `package-lock.json` predates vitest/eslint (they were added via pnpm), so `npm ci` fails. Both apps also carry unused `pnpm-lock.yaml` + `pnpm-workspace.yaml`; CI uses npm only.
- `npm run typecheck` → `tsc --noEmit`
- `npm run lint` → `eslint . --max-warnings=0`
- `npm run test` → `vitest run --coverage`
- Single test: `npx vitest run src/utils/__tests__/security.test.ts` (add `-t "<name>"` to narrow).
- Desktop dev: `npm run electron:dev` = vite + electron. `electron.js` hardcodes `http://localhost:5173`, so if 5173 is taken vite shifts ports and you get a blank window.
- Desktop package: `npm run electron:build` → `vite build` then `electron-builder` (output `dist-electron/`).
- Root `npm run dev` / `npm run build` only proxy to `web-app`; they do not touch the desktop app.
- Backend: `python web-app/backend.py [port] --poll 2 --idle 300` (default 5001). The app calls `http://localhost:5001` directly (`store/useAppStore.ts`), no Vite proxy.

## Testing reality

- 6 tests per app, all in `src/utils/__tests__/security.test.ts` (URL/XSS sanitizers). Nothing else is covered.
- Coverage `include` is only `src/utils/security.ts`, so the reported 93.87% is one file — never quote it as project coverage.
- Order matters in CI: typecheck → lint → `py_compile`/`ruff` → test → build. Match it locally.

## CI / PR gotchas

- `ci.yml` covers **desktop-app only** (install, typecheck, lint, test, build) plus `py_compile web-app/backend.py` with `ruff --exit-zero`. `web-app` has no CI typecheck/lint/build; Vercel builds it on deploy (`vercel.json`). `codecov.yml` is the only workflow that runs `web-app`'s tests.
- Branch protection on `main` requires exactly: `Fast Quality Gate (Typecheck, Lint & Unit Test)`, `CodeQL Analysis`, `Detect Hardcoded Secrets`. A required check only exists if the PR's changed paths trigger that workflow — `codeql.yml` fires only on `**.js|**.ts|**.tsx`, so release-please PRs (package.json/CHANGELOG only) never get `CodeQL Analysis` and sit `BLOCKED` forever. Check `gh pr view N --json mergeStateStatus` instead of assuming.
- release-please bot PRs show `action_required` runs (repo fork-PR approval policy) — their checks do not auto-run.
- `dependency-security.yml` fails on every run: `npm audit` at the repo root returns `ENOLOCK` (no root lockfile). The `NPM Audit Monorepo Scan` check is red on any dependency-touching PR.
- No `CODECOV_TOKEN` secret exists; the Codecov job is green only because `fail_ci_if_error` is false, and it uploads nothing useful.
- ZAP is not a gate: `cmd_options: '-a -I'` plus a `.zap/rules.tsv` that contains only `IGNORE` rules can never exit non-zero.
- `.husky/pre-commit` and `.husky/commit-msg` both end in `|| true`, and the hook only typechecks `desktop-app`. A hook passing proves nothing — run lint/test yourself.
- `main` and `develop` are usually the same SHA, so every push runs each workflow twice.
- Don't add `upload-artifact` without `retention-days`; artifact storage is already far past the free tier.

## Electron constraints (deliberate, keep them)

- `win-tracker.exe` is a compiled C# Win32 helper (`win-tracker.cs`) shipped through electron-builder `extraResources`; it is the active-window poller. Never spawn PowerShell/wscript inside a polling loop.
- Low-RAM design: bounded in-memory logs (~2,000 entries), only the active `<webview>` portal mounted, `global.gc` on hide-to-tray. Don't "simplify" these away.
- Keep Dexie/IndexedDB schema changes backwards-compatible — existing users' local data must keep loading.

## Releases

Push to `main` → `release.yml`: release-please (3 packages — `.`, `desktop-app`, `web-app`, linked versions) → 3-OS electron-builder → `gh release upload` of `*.exe/*.AppImage/*.deb/*.zip/*.dmg/latest*.yml` → contributor-wall job.
The build job rewrites `desktop-app/package.json` version from the release tag at runtime — don't "sync" it by hand.
release-please depends on Conventional Commits (commitlint's types include `security`); a malformed message means no version bump. `.release-please-manifest.json` can drift from the real versions (currently `web-app` 0.2.0 vs package.json 0.2.1) — check it before trusting a release PR.

## More detail

`docs/ENV_SETUP_GUIDE.md`, `docs/FULL_SYSTEM_GUIDE.md`, `web-app/BACKEND_INTEGRATION.md`.
