# AGENTS.md

FlowTrack Pro — local-first study/productivity tracker. Electron desktop app, a near-identical browser build, and an optional Python backend. This is the single maintained instruction file for agents working in this repo.

## Layout

- `desktop-app/` — Electron 43 + React 19 + Vite. Main process `electron.js`, IPC bridge `preload.js`, UI entry `src/main.tsx`. electron-builder → `dist-electron/` (`productName: FlowTrackPro`, appId `com.flowtrack.studytracker`).
- `web-app/` — the same React UI for the browser, plus `backend.py` (Python 3, sqlite3, **port 5001**, optional). `web-app/START.bat` creates `.venv`, launches the backend, then `npm run dev`.
- Root — commitlint + husky, release-please, 11 workflows in `.github/workflows/`, `docs/` guides.

## The duplication trap

`desktop-app/src` and `web-app/src` share 85 files: 53 byte-identical, 32 drifted. Nothing links them — no shared package, no workspace import. Before editing anything under `src/`, decide whether both apps need the change and copy it deliberately; a fix in one app does **not** reach the other. Compare with `git diff --no-index desktop-app/src web-app/src`.

Desktop-only: `PipStandalonePage`, `PipOverlayWidget`, `EnterpriseUpdateModal`, `FocusAudioMixer`, `VirtualStudyCompanion`, `lib/neonSync.ts`, `utils/notification.ts`, `utils/spacedRepetition.ts`.
Web-only: `BackendActivityPanel`, `PerformanceScorecardModal`, `WeeklyReviewModal`, `WeeklySummary`.

## Commands (run inside the app directory)

- Install: `npm install --legacy-peer-deps`. **Never `npm ci`** — the committed `package-lock.json` predates vitest/eslint (added via pnpm), so `npm ci` exits 1. Both apps also carry unused `pnpm-lock.yaml` + `pnpm-workspace.yaml`; CI uses npm only.
- `npm run typecheck` → `tsc --noEmit`
- `npm run lint` → `eslint . --max-warnings=0`
- `npm run test` → `vitest run --coverage`
- Single test: `npx vitest run src/utils/__tests__/security.test.ts` (`-t "<name>"` to narrow).
- Desktop dev: `npm run electron:dev` = vite + electron. `electron.js` hardcodes `http://localhost:5173`; if that port is busy vite shifts ports and you get a blank window.
- Desktop package: `npm run electron:build` → `vite build` then `electron-builder`.
- Root `npm run dev` / `npm run build` only proxy to `web-app`.
- Backend: `python web-app/backend.py [port] --poll 2 --idle 300` (default 5001). The UI calls `http://localhost:5001` directly (`store/useAppStore.ts`) — no Vite proxy.

## Testing reality

- 6 tests per app, all in `src/utils/__tests__/security.test.ts` (URL/XSS sanitizers). Nothing else is tested.
- Coverage `include` is only `src/utils/security.ts`, so the reported 93.87% is one file — never quote it as project coverage.
- CI order: typecheck → lint → `py_compile`/`ruff` → test → build. Match it locally.

## Low-RAM invariants (desktop, deliberate — don't "simplify" away)

- `win-tracker.exe` is a compiled C# Win32 helper (`win-tracker.cs`) shipped via electron-builder `extraResources`; it is the active-window poller. Never spawn PowerShell/wscript inside a polling loop.
- `electron.js` sets `--max-old-space-size=128 --expose-gc`, `--renderer-process-limit=1`, `--disable-breakpad`, and `backgroundThrottling: true`. `global.gc()` on minimize/hide depends on that `--expose-gc` flag.
- `activityLog` is deliberately capped at 2,000 entries (spliced, not unbounded).
- Renderer: clear listeners, `setInterval`s and Fabric.js canvas contexts on unmount; `React.lazy` heavy analytics pages; mount only the active `<webview>` portal. Web portals keep full width — navigation lives in a slide-over drawer, not a side panel.

## CI / PR gotchas

- `ci.yml` covers **desktop-app only** (install, typecheck, lint, test, build) plus `py_compile web-app/backend.py` with `ruff --exit-zero`. `web-app` has no CI typecheck/lint/build; Vercel builds it on deploy (`vercel.json`), and `codecov.yml` is the only workflow that runs `web-app` tests.
- Branch protection on `main` requires exactly: `Fast Quality Gate (Typecheck, Lint & Unit Test)`, `CodeQL Analysis`, `Detect Hardcoded Secrets`. A required check only appears if the PR's changed paths trigger that workflow — `codeql.yml` fires only on `**.js|**.ts|**.tsx`, so release-please PRs (package.json/CHANGELOG only) never get `CodeQL Analysis` and stay `BLOCKED`. Use `gh pr view N --json mergeStateStatus` instead of assuming.
- release-please bot PRs show `action_required` runs (repo fork-PR approval policy) — their checks do not auto-run.
- `dependency-security.yml` audits `.`, `desktop-app` and `web-app` with `npm audit --audit-level=high`. Root is clean (the root `package-lock.json` exists only to make that audit possible); `desktop-app` currently has 26 known vulnerabilities (2 critical), so `NPM Audit Monorepo Scan` is legitimately red until they are fixed — don't "fix" the workflow.
- No `CODECOV_TOKEN` secret exists; the Codecov job stays green because `fail_ci_if_error` is false. Treat that status as unverified.
- ZAP is not a gate: `cmd_options: '-a -I'` plus a `.zap/rules.tsv` containing only `IGNORE` rules can never exit non-zero.
- `.husky/pre-commit` and `.husky/commit-msg` end in `|| true`, and the hook only typechecks `desktop-app`. A passing hook proves nothing — run lint/test yourself.
- `main` and `develop` are usually the same SHA, so each workflow runs twice per push.
- `retention-days: 7` is now set on the artifact uploads (ci, dependency-security, e2e-gate, zap-nightly) — keep it on any new upload step; storage was far past the free tier.

## Releases

Push to `main` → `release.yml`: release-please (3 packages — `.`, `desktop-app`, `web-app`, linked versions) → 3-OS electron-builder → `gh release upload` of `*.exe/*.AppImage/*.deb/*.zip/*.dmg/latest*.yml` → contributor-wall job.
The build job rewrites `desktop-app/package.json` from the release tag at runtime — don't sync it by hand.
`.release-please-manifest.json` can drift from real versions (`web-app` 0.2.0 vs package.json 0.2.1) — verify before trusting a release PR.

## Conventions

- Conventional Commits are required by commitlint; allowed types include `security`. release-please derives versions from them, so a malformed message means no bump.
- After pushing, verify live: `gh run list --limit 6`, then `gh run view <run-id> --log-failed` for any red job.
- CodeRabbit (`.coderabbit.yaml`) auto-reviews PRs into `main`/`develop`; its focus is memory leaks, listener cleanup, TS safety.
- Keep Dexie/IndexedDB schema changes backwards-compatible — existing users' local data must keep loading.

## More detail

`docs/ENV_SETUP_GUIDE.md`, `docs/FULL_SYSTEM_GUIDE.md`, `web-app/BACKEND_INTEGRATION.md`.
