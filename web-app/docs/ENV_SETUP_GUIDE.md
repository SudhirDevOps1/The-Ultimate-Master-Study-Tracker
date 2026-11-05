# 🛠️ FlowTrack Pro — Environment & Developer Setup Guide

> **Version**: `v0.5.0` | **Target OS**: Windows 10/11, macOS, Linux

This guide provides end-to-end instructions for configuring your local development environment, running tests, launching the desktop/web applications, and configuring cloud replication.

---

## 📋 Prerequisites & Tooling

Ensure the following tools are installed before proceeding:

| Tool | Recommended Version | Verification Command | Notes |
|---|---|---|---|
| **Node.js** | `>= 20.18.0` (LTS) | `node -v` | Core JavaScript runtime |
| **npm** | `>= 10.8.0` | `npm -v` | Always use `--legacy-peer-deps` |
| **Python** | `>= 3.10.0` | `python --version` | Required for optional backend |
| **Git** | `>= 2.40.0` | `git --version` | Version control & submodules |

> [!CAUTION]
> **Never run `npm ci`**: The committed `package-lock.json` uses peer dependencies configured for npm with legacy flags. Always install dependencies using `npm install --legacy-peer-deps`.

---

## 🖥️ 1. Standalone Desktop App Setup (`desktop-app/`)

The desktop app runs on **Electron 43 + React 19 + Vite 7**.

```bash
# Navigate to the desktop application directory
cd desktop-app

# Install dependencies (respecting legacy peer dependencies)
npm install --legacy-peer-deps

# Start Vite dev server & launch Electron window
npm run electron:dev
```

### Verification & Testing Commands
```bash
# Typecheck TypeScript codebase
npm run typecheck

# Run ESLint (enforcing zero warnings)
npm run lint

# Run Vitest unit & integration test suites
npm run test

# Run a single targeted test file
npx vitest run src/utils/__tests__/security.test.ts
```

### Production Packaging (LZMA Standalone Installers)
```bash
# Builds Vite production bundle and packages into dist-electron/
npm run electron:build
```
> The output contains `FlowTrackPro-Setup-0.5.0.exe` (Windows) and `latest.yml` update manifest.

---

## 🌐 2. Web App Setup (`web-app/`)

The web app is optimized for serverless deployment on Vercel or local browser development.

```bash
# Navigate to the web application directory
cd web-app

# Install dependencies
npm install --legacy-peer-deps

# Start Vite development server (port 5173)
npm run dev
```

---

## 🐍 3. Optional Python Backend (`backend.py`)

For advanced local active window polling and SQLite WAL logging on Category 2 deployments:

```bash
# Windows quick-start script (creates .venv and starts backend)
web-app\START.bat

# Manual Python launch:
cd web-app
python -m venv .venv
# Windows activation:
.venv\Scripts\activate
# Linux/macOS activation:
# source .venv/bin/activate

pip install -r requirements.txt
python backend.py 5001 --poll 2 --idle 300
```

---

## ☁️ 4. Cloud Synchronization Environment Variables

To activate cloud synchronization, create a `.env` file in `desktop-app/` or `web-app/` (or configure Vercel Environment Variables):

```env
# Supabase Offline-First Replication (Category 1, 2 & 3)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Neon Serverless PostgreSQL (Optional — Desktop App Direct SQL)
NEON_DATABASE_URL="postgresql://user:password@ep-cool-project.neon.tech/flowtrack?sslmode=require"
```

---

## 🧩 5. Recommended IDE Configuration (VS Code / Antigravity)

Recommended workspace extensions:
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **Python** (`ms-python.python`)
- **WakaTime** (`wakatime.vscode-wakatime`) — Auto-configurable via FlowTrack Pro's loopback receiver (`127.0.0.1:7777`).

---

## 🚦 Pre-Push Quality Gate

Before pushing any commit to `develop` or `main`, run the local CI gate:
```bash
cd desktop-app
npm run typecheck
npm run lint
python -m py_compile ../web-app/backend.py
npm run test
```
All checks must pass with exit code `0`.
