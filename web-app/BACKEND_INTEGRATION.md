# Web App Backend Integration Guide

## Overview

The FlowTrack Pro Web App features an optional, zero-failure hybrid connection to the local Python tracker backend (`backend.py` on `http://localhost:5001`).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FlowTrack Web App                      │
│                  (Vercel or Local Port 5173)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Auto-Detects Local Python Backend
            (2s Timeout AbortController Fetch)
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
  [ Backend Connected ]                 [ Backend Offline ]
  - Polls OS Active Window              - Offline IndexedDB Mode
  - Displays App & Website Logs         - Browser Tab Tracking
  - Tracks FlowTrack IDE Heartbeats     - Zero Console/Fetch Errors
  - Proxies Ollama/Local AI CORS        - Local AES-256-GCM Vault
```

---

## 📡 API Endpoints Consumed by Web App

- `GET http://localhost:5001/stats?range=all` — Historical activity dates & daily totals
- `GET http://localhost:5001/active-window` — Current OS active window process and title
- `GET http://localhost:5001/export?type=activities&format=json` — Full activity log for timeline charts
- `POST http://localhost:5001/sync` — Backup study session data to local SQLite database
- `POST http://localhost:5001/api/ai/proxy` — CORS-bypass proxy for local AI endpoints (Ollama)
- `GET http://localhost:5001/api/v1/heartbeats` — Query mirrored FlowTrack IDE heartbeats from `heartbeats` table
- `POST http://localhost:5001/api/v1/heartbeats` — Ingest external heartbeats into local SQLite database

---

## 💾 Local SQLite Schema (`app_tracker.db`)

The backend maintains two primary tables:
1. `activities`: Passive OS active window transitions (id, window_title, process_name, start_time, end_time, duration_seconds, category).
2. `heartbeats`: Developer IDE coding activity (id, entity, type, category, project, branch, language, is_write, lines, line_no, cursorpos, time, created_at).
