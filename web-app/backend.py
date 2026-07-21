#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FlowTrack Pro - Complete Backend (Merged)
==========================================
Includes:
  - Activity Tracker  (activity_tracker.py)
  - App Analytics     (app_analytics.py)

Single file to run everything:
    python backend.py              # default port 5001
    python backend.py 5050         # custom port
    python backend.py --host 0.0.0.0 --poll 2 --idle 300

Requirements (auto-installed by START.bat):
    Windows : pywin32, psutil
"""

import os
import sys
import json
import time
import sqlite3
import signal
import threading
import csv
import io
import re
import subprocess
import argparse
from collections import defaultdict, Counter
from datetime import datetime, timedelta, date
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

__version__ = "2.2.1"
SERVICE_NAME = "FlowTrack Pro Backend"
DEFAULT_PORT = 5001

# =========================================================================== #
# Platform detection + optional native imports
# =========================================================================== #
IS_WINDOWS = sys.platform.startswith("win")
IS_MAC     = sys.platform == "darwin"
IS_LINUX   = sys.platform.startswith("linux")

WIN32  = False
PSUTIL = False

if IS_WINDOWS:
    try:
        import win32gui, win32process, win32api
        WIN32 = True
    except ImportError:
        WIN32 = False
    try:
        import psutil
        PSUTIL = True
    except ImportError:
        PSUTIL = False
else:
    try:
        import psutil
        PSUTIL = True
    except ImportError:
        PSUTIL = False


# =========================================================================== #
# Platform helpers: active window & idle time
# =========================================================================== #
def _platform_name():
    if IS_WINDOWS: return "windows (win32)" if WIN32 else "windows (fallback)"
    if IS_MAC:     return "macos (osascript)"
    if IS_LINUX:   return "linux (xdotool)"
    return "unsupported"


def _run(cmd, timeout=1.5):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return (r.stdout or "").strip()
    except Exception:
        return ""


def _active_window():
    if IS_WINDOWS: return _win_active_window()
    if IS_MAC:     return _mac_active_window()
    if IS_LINUX:   return _linux_active_window()
    return ("Desktop / Idle", "unknown")


def _idle_seconds():
    try:
        if IS_WINDOWS: return _win_idle_seconds()
        if IS_MAC:     return _mac_idle_seconds()
        if IS_LINUX:   return _linux_idle_seconds()
    except Exception:
        return 0.0
    return 0.0


def _win_active_window():
    if not WIN32:
        return ("win32gui not installed", "unknown")
    try:
        hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return ("Desktop / Idle", "unknown")
        title = win32gui.GetWindowText(hwnd) or "Desktop / Idle"
        proc = "unknown"
        try:
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            proc = psutil.Process(pid).name()
        except Exception:
            pass
        return (title, proc)
    except Exception as e:
        return (f"Error: {e}", "error")


def _win_idle_seconds():
    if not WIN32:
        return 0.0
    last_input = win32api.GetLastInputInfo()
    now = win32api.GetTickCount()
    return max(0.0, (now - last_input) / 1000.0)


def _mac_active_window():
    app   = _run(["osascript", "-e",
                  'tell application "System Events" to get name of first '
                  'application process whose frontmost is true'])
    title = _run(["osascript", "-e",
                  'tell application "System Events" to get title of front '
                  'window of (first application process whose frontmost is true)'])
    return (title or app or "Desktop / Idle", app or "unknown")


def _mac_idle_seconds():
    out = _run(["ioreg", "-c", "IOHIDSystem"], timeout=2.0)
    for line in out.splitlines():
        if "HIDIdleTime" in line:
            val = line.split("=")[-1].strip().strip("()")
            try:
                return max(0.0, int(val) / 1e9)
            except ValueError:
                continue
    return 0.0


def _linux_active_window():
    title = _run(["xdotool", "getactivewindow", "getwindowname"])
    proc  = "unknown"
    pid   = _run(["xdotool", "getactivewindow", "getwindowpid"])
    if pid.isdigit():
        try:
            proc = psutil.Process(int(pid)).name() if PSUTIL else pid
        except Exception:
            proc = pid
    return (title or "Desktop / Idle", proc)


def _linux_idle_seconds():
    out = _run(["xprintidle"])
    try:
        return max(0.0, float(out) / 1000.0)
    except ValueError:
        return 0.0


# =========================================================================== #
# Configuration
# =========================================================================== #
DEFAULT_CATEGORIES = {
    "productive": {
        "processes": [
            "code.exe", "code - insiders.exe", "devenv.exe", "idea64.exe",
            "pycharm64.exe", "webstorm64.exe", "notepad++.exe", "sublime_text.exe",
            "windowsterminal.exe", "powershell.exe", "pwsh.exe", "cmd.exe",
            "chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe",
            "outlook.exe", "excel.exe", "winword.exe", "powerpnt.exe", "onenote.exe",
            "slack.exe", "teams.exe", "obsidian.exe", "notion.exe", "anki.exe",
            "zoom.exe", "ms-teams.exe", "acrobat.exe", "foxitreader.exe",
        ],
        "keywords": [
            "visual studio code", "vscode", "intellij", "pycharm", "webstorm",
            "notepad++", "sublime", "terminal", "github", "gitlab", "stackoverflow",
            "w3schools", "mdn web docs", "notion", "obsidian", "anki", "coursera",
            "udemy", "khan academy", "edx", "brilliant", "leetcode", "hackerrank",
            "geeksforgeeks", "pdf", "lecture", "notes", "study", "documentation",
            "localhost", "127.0.0.1", "jupyter", "colab", "replit", "overleaf",
        ],
    },
    "distracting": {
        "processes": [
            "netflix.exe", "steam.exe", "epicgameslauncher.exe",
            "discord.exe", "telegram.exe", "whatsapp.exe",
        ],
        "keywords": [
            "youtube", "netflix", "prime video", "disney+", "hulu", "twitch",
            "facebook", "instagram", "twitter", "x.com", "tiktok", "reddit",
            "snapchat", "pinterest", "9gag", "meme", "gaming", "roblox",
            "minecraft", "fortnite", "valorant", "csgo", "gta", "epic games",
        ],
    },
    "neutral": {
        "processes": [],
        "keywords": [
            "gmail", "google calendar", "google drive", "onedrive", "dropbox",
            "spotify", "music", "weather",
        ],
    },
}

DEFAULT_CONFIG = {
    "poll_interval": 2.0,
    "idle_threshold": 300.0,
    "categories": DEFAULT_CATEGORIES,
}


class Config:
    def __init__(self, path, **overrides):
        self.path = path
        self._lock = threading.RLock()
        data = self._load()
        self.poll_interval = float(data.get("poll_interval", DEFAULT_CONFIG["poll_interval"]))
        self.idle_threshold = float(data.get("idle_threshold", DEFAULT_CONFIG["idle_threshold"]))
        self.categories = data.get("categories", DEFAULT_CONFIG["categories"])
        if overrides.get("poll_interval") is not None:
            self.poll_interval = float(overrides["poll_interval"])
        if overrides.get("idle_threshold") is not None:
            self.idle_threshold = float(overrides["idle_threshold"])

    def _load(self):
        if self.path and os.path.exists(self.path):
            try:
                with open(self.path, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                cats = dict(DEFAULT_CATEGORIES)
                cats.update(data.get("categories", {}))
                data["categories"] = cats
                return data
            except Exception:
                pass
        return json.loads(json.dumps(DEFAULT_CONFIG))

    def save(self):
        if not self.path:
            return
        try:
            with self._lock:
                payload = {
                    "poll_interval": self.poll_interval,
                    "idle_threshold": self.idle_threshold,
                    "categories": self.categories,
                }
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2, ensure_ascii=False)
            os.replace(tmp, self.path)
        except Exception:
            pass

    def snapshot(self):
        with self._lock:
            return {
                "poll_interval": self.poll_interval,
                "idle_threshold": self.idle_threshold,
                "categories": json.loads(json.dumps(self.categories)),
            }

    def update(self, payload):
        with self._lock:
            if "poll_interval" in payload:
                self.poll_interval = max(0.5, min(3600.0, float(payload["poll_interval"])))
            if "idle_threshold" in payload:
                self.idle_threshold = max(5.0, min(86400.0, float(payload["idle_threshold"])))
            if isinstance(payload.get("categories"), dict):
                merged = json.loads(json.dumps(self.categories))
                for cat, rules in payload["categories"].items():
                    if not isinstance(rules, dict):
                        continue
                    cur = merged.setdefault(cat, {"processes": [], "keywords": []})
                    if isinstance(rules.get("processes"), list):
                        cur["processes"] = [str(p) for p in rules["processes"]]
                    if isinstance(rules.get("keywords"), list):
                        cur["keywords"] = [str(k) for k in rules["keywords"]]
                self.categories = merged
        self.save()
        return self.snapshot()


# =========================================================================== #
# SQLite persistence — Main Store
# =========================================================================== #
class Store:
    SCHEMA = """
    CREATE TABLE IF NOT EXISTS subjects (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL UNIQUE,
        color       TEXT DEFAULT '#6366f1',
        icon        TEXT DEFAULT 'book',
        goal_hours  REAL DEFAULT 1.0,
        created_at  REAL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id                       INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id                TEXT,
        subject_id               INTEGER,
        title                    TEXT,
        start_ts                 REAL NOT NULL,
        end_ts                   REAL,
        duration_seconds         REAL DEFAULT 0,
        planned_duration_seconds INTEGER DEFAULT 0,
        completed                INTEGER DEFAULT 1,
        notes                    TEXT,
        type                     TEXT DEFAULT 'timer',
        created_at               REAL DEFAULT (strftime('%s','now')),
        updated_at               REAL DEFAULT (strftime('%s','now')),
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        start_ts  REAL NOT NULL,
        end_ts    REAL NOT NULL,
        duration  REAL NOT NULL,
        process   TEXT,
        title     TEXT,
        category  TEXT,
        is_idle   INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
        key    TEXT PRIMARY KEY,
        value  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_ts);
    CREATE INDEX IF NOT EXISTS idx_sessions_subject ON sessions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_activities_start ON activities(start_ts);
    CREATE INDEX IF NOT EXISTS idx_activities_cat   ON activities(category);
    """

    def __init__(self, db_path):
        self.db_path = db_path
        self._lock = threading.Lock()
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self.conn.execute("PRAGMA synchronous=NORMAL;")
        self.conn.executescript(self.SCHEMA)
        self.conn.commit()
        self._seed_defaults()

    def _seed_defaults(self):
        defaults = {"daily_goal_hours": "4", "strict_mode": "false", "theme": "ocean"}
        for k, v in defaults.items():
            self.conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))
        self.conn.commit()

    def get_setting(self, key, default=None):
        with self._lock:
            row = self.conn.execute(
                "SELECT value FROM settings WHERE key=?", (key,)).fetchone()
            return row["value"] if row else default

    def set_setting(self, key, value):
        with self._lock:
            self.conn.execute(
                "INSERT INTO settings (key, value) VALUES (?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, str(value)))
            self.conn.commit()

    def all_settings(self):
        with self._lock:
            return {r["key"]: r["value"] for r in
                    self.conn.execute("SELECT key, value FROM settings").fetchall()}

    def list_subjects(self):
        with self._lock:
            rows = self.conn.execute("SELECT * FROM subjects ORDER BY name").fetchall()
            return [self._subject_row(r) for r in rows]

    def get_subject(self, sid):
        with self._lock:
            r = self.conn.execute(
                "SELECT * FROM subjects WHERE id=?", (sid,)).fetchone()
            return self._subject_row(r) if r else None

    def create_subject(self, data):
        name = (data.get("name") or "").strip()
        if not name:
            raise ValueError("subject name is required")
        color = data.get("color", "#6366f1")
        icon  = data.get("icon", "book")
        goal  = float(data.get("goal_hours", 1.0))
        with self._lock:
            cur = self.conn.execute(
                "INSERT INTO subjects (name, color, icon, goal_hours) VALUES (?,?,?,?)",
                (name, color, icon, goal))
            self.conn.commit()
            return self.get_subject(cur.lastrowid)

    def update_subject(self, sid, data):
        fields, vals = [], []
        for col in ("name", "color", "icon"):
            if col in data:
                fields.append(f"{col}=?"); vals.append(data[col])
        if "goal_hours" in data:
            fields.append("goal_hours=?"); vals.append(float(data["goal_hours"]))
        if not fields:
            return self.get_subject(sid)
        vals.append(sid)
        with self._lock:
            self.conn.execute(f"UPDATE subjects SET {', '.join(fields)} WHERE id=?", vals)
            self.conn.commit()
            return self.get_subject(sid)

    def delete_subject(self, sid):
        with self._lock:
            self.conn.execute("DELETE FROM subjects WHERE id=?", (sid,))
            self.conn.commit()

    def list_sessions(self, subject_id=None, since=0.0, limit=1000):
        sql    = ("SELECT s.*, sub.name as subject_name FROM sessions s "
                  "LEFT JOIN subjects sub ON s.subject_id=sub.id "
                  "WHERE s.start_ts >= ?")
        params = [since]
        if subject_id is not None:
            sql += " AND s.subject_id=?"; params.append(subject_id)
        sql += " ORDER BY s.start_ts DESC LIMIT ?"; params.append(limit)
        with self._lock:
            return [self._session_row(r) for r in
                    self.conn.execute(sql, params).fetchall()]

    def get_session(self, sid):
        with self._lock:
            r = self.conn.execute(
                "SELECT s.*, sub.name as subject_name FROM sessions s "
                "LEFT JOIN subjects sub ON s.subject_id=sub.id WHERE s.id=?",
                (sid,)).fetchone()
            return self._session_row(r) if r else None

    def upsert_session(self, data):
        now       = time.time()
        client_id = data.get("client_id")
        subject_id = data.get("subject_id")
        title     = data.get("title", "Untitled session")
        start_ts  = float(data.get("start_ts", now))
        end_ts    = data.get("end_ts")
        planned   = int(data.get("planned_duration_seconds", 0) or 0)
        completed = 1 if data.get("completed", True) else 0
        notes     = data.get("notes", "")
        typ       = data.get("type", "timer")
        duration  = float(data.get("duration_seconds", 0) or 0)
        if end_ts is not None:
            end_ts   = float(end_ts)
            duration = max(0.0, end_ts - start_ts)
        sid = data.get("id")
        with self._lock:
            if sid:
                self.conn.execute(
                    "UPDATE sessions SET subject_id=?, title=?, start_ts=?, end_ts=?, "
                    "duration_seconds=?, planned_duration_seconds=?, completed=?, "
                    "notes=?, type=?, updated_at=? WHERE id=?",
                    (subject_id, title, start_ts, end_ts, duration, planned,
                     completed, notes, typ, now, sid))
                self.conn.commit()
                return self.get_session(sid)
            if client_id:
                existing = self.conn.execute(
                    "SELECT id FROM sessions WHERE client_id=?", (client_id,)).fetchone()
                if existing:
                    sid = existing["id"]
                    self.conn.execute(
                        "UPDATE sessions SET subject_id=?, title=?, start_ts=?, end_ts=?, "
                        "duration_seconds=?, planned_duration_seconds=?, completed=?, "
                        "notes=?, type=?, updated_at=? WHERE id=?",
                        (subject_id, title, start_ts, end_ts, duration, planned,
                         completed, notes, typ, now, sid))
                    self.conn.commit()
                    return self.get_session(sid)
            cur = self.conn.execute(
                "INSERT INTO sessions (client_id, subject_id, title, start_ts, end_ts, "
                "duration_seconds, planned_duration_seconds, completed, notes, type, "
                "created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (client_id, subject_id, title, start_ts, end_ts, duration, planned,
                 completed, notes, typ, now, now))
            self.conn.commit()
            return self.get_session(cur.lastrowid)

    def delete_session(self, sid):
        with self._lock:
            self.conn.execute("DELETE FROM sessions WHERE id=?", (sid,))
            self.conn.commit()

    def total_study_seconds(self, since):
        with self._lock:
            r = self.conn.execute(
                "SELECT COALESCE(SUM(duration_seconds),0) FROM sessions "
                "WHERE start_ts >= ? AND completed=1", (since,)).fetchone()
            return r[0] or 0.0

    def record_activity(self, start_ts, end_ts, process, title, category, is_idle):
        duration = max(0.0, end_ts - start_ts)
        if duration < 0.5:
            return
        with self._lock:
            self.conn.execute(
                "INSERT INTO activities (start_ts,end_ts,duration,process,title,category,is_idle) "
                "VALUES (?,?,?,?,?,?,?)",
                (start_ts, end_ts, duration, process, title, category, 1 if is_idle else 0))
            self.conn.commit()

    def activity_by_category(self, since):
        with self._lock:
            rows = self.conn.execute(
                "SELECT category, SUM(duration) AS d FROM activities "
                "WHERE end_ts >= ? GROUP BY category", (since,)).fetchall()
            return {r["category"]: (r["d"] or 0.0) for r in rows}

    def activity_export(self, since):
        with self._lock:
            rows = self.conn.execute(
                "SELECT * FROM activities WHERE end_ts >= ? ORDER BY start_ts", (since,)).fetchall()
            return [self._activity_row(r) for r in rows]

    def clear(self):
        with self._lock:
            for tbl in ["activities", "sessions", "subjects", "settings"]:
                self.conn.execute(f"DELETE FROM {tbl}")
            self.conn.commit()
            self._seed_defaults()

    def close(self):
        with self._lock:
            try:
                self.conn.close()
            except Exception:
                pass

    @staticmethod
    def _subject_row(r):
        return {"id": r["id"], "name": r["name"], "color": r["color"],
                "icon": r["icon"], "goal_hours": r["goal_hours"], "created_at": r["created_at"]}

    @staticmethod
    def _session_row(r):
        return {
            "id": r["id"], "client_id": r["client_id"], "subject_id": r["subject_id"],
            "subject_name": r["subject_name"], "title": r["title"],
            "start_ts": r["start_ts"], "end_ts": r["end_ts"],
            "duration_seconds": r["duration_seconds"],
            "planned_duration_seconds": r["planned_duration_seconds"],
            "completed": bool(r["completed"]), "notes": r["notes"],
            "type": r["type"], "created_at": r["created_at"], "updated_at": r["updated_at"],
        }

    @staticmethod
    def _activity_row(r):
        return {
            "id": r["id"], "start_ts": r["start_ts"], "end_ts": r["end_ts"],
            "duration": r["duration"], "process": r["process"], "title": r["title"],
            "category": r["category"], "is_idle": bool(r["is_idle"]),
        }


# =========================================================================== #
# App Analytics (merged from app_analytics.py)
# =========================================================================== #
class AppAnalytics:
    """Persistent app usage analytics with SQLite backend."""

    SCHEMA = """
    CREATE TABLE IF NOT EXISTS app_usage (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name      TEXT NOT NULL,
        process_name  TEXT,
        session_start REAL NOT NULL,
        session_end   REAL,
        duration_sec  REAL DEFAULT 0,
        browser_url   TEXT,
        category      TEXT DEFAULT 'neutral',
        created_at    REAL DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS tab_activity (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        browser        TEXT,
        url            TEXT,
        title          TEXT,
        time_spent_sec REAL DEFAULT 0,
        visited_at     REAL NOT NULL,
        created_at     REAL DEFAULT (strftime('%s','now'))
    );

    CREATE INDEX IF NOT EXISTS idx_app_usage_date ON app_usage(created_at);
    CREATE INDEX IF NOT EXISTS idx_app_usage_app  ON app_usage(app_name);
    CREATE INDEX IF NOT EXISTS idx_tab_activity_date ON tab_activity(created_at);
    """

    def __init__(self, db_path):
        self.db_path = db_path
        self._lock = threading.Lock()
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL;")
        self.conn.executescript(self.SCHEMA)
        self.conn.commit()

    def record_app_usage(self, app_name, process_name, duration_sec, category="neutral", browser_url=None):
        now = time.time()
        with self._lock:
            self.conn.execute(
                "INSERT INTO app_usage "
                "(app_name, process_name, session_start, session_end, "
                "duration_sec, browser_url, category, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (app_name, process_name, now - duration_sec, now,
                 duration_sec, browser_url, category, now))
            self.conn.commit()

    def record_tab_activity(self, browser, url, title, time_spent_sec):
        now = time.time()
        with self._lock:
            self.conn.execute(
                "INSERT INTO tab_activity "
                "(browser, url, title, time_spent_sec, visited_at, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (browser, url, title, time_spent_sec, now, now))
            self.conn.commit()

    def get_daily_app_usage(self, days=7):
        since = (datetime.now() - timedelta(days=days)).timestamp()
        with self._lock:
            rows = self.conn.execute(
                "SELECT app_name, duration_sec, category, created_at "
                "FROM app_usage WHERE created_at >= ? ORDER BY created_at DESC",
                (since,)).fetchall()
        by_date = defaultdict(lambda: defaultdict(lambda: {"duration": 0, "sessions": 0}))
        totals  = defaultdict(lambda: {"duration": 0, "sessions": 0, "category": "neutral"})
        for row in rows:
            dk  = datetime.fromtimestamp(row["created_at"]).strftime("%Y-%m-%d")
            app = row["app_name"]
            by_date[dk][app]["duration"] += row["duration_sec"]
            by_date[dk][app]["sessions"] += 1
            totals[app]["duration"] += row["duration_sec"]
            totals[app]["sessions"] += 1
            totals[app]["category"]  = row["category"]
        result = {"period_days": days, "by_date": {}, "totals": {}}
        for dk in sorted(by_date):
            result["by_date"][dk] = sorted(
                [{"app": a, "duration_minutes": round(s["duration"]/60,1),
                  "duration_seconds": round(s["duration"],0), "sessions": s["sessions"]}
                 for a, s in by_date[dk].items()],
                key=lambda x: x["duration_seconds"], reverse=True)
        result["totals"] = dict(sorted(
            {a: {"duration_minutes": round(s["duration"]/60,1),
                 "duration_seconds": round(s["duration"],0),
                 "sessions": s["sessions"], "category": s["category"]}
             for a, s in totals.items()}.items(),
            key=lambda x: x[1]["duration_seconds"], reverse=True))
        return result

    def get_browser_usage(self, days=7):
        since = (datetime.now() - timedelta(days=days)).timestamp()
        with self._lock:
            rows = self.conn.execute(
                "SELECT browser, url, title, time_spent_sec FROM tab_activity "
                "WHERE created_at >= ? ORDER BY visited_at DESC", (since,)).fetchall()
        by_domain  = defaultdict(lambda: {"time": 0, "visits": 0})
        by_browser = defaultdict(lambda: {"time": 0, "visits": 0})
        by_url     = defaultdict(lambda: {"time": 0, "visits": 0})
        for row in rows:
            t_sec = row["time_spent_sec"] or 0
            url   = row["url"] or ""
            try:
                domain = urlparse(url).netloc or "unknown"
            except Exception:
                domain = "unknown"
            by_domain[domain]["time"]  += t_sec; by_domain[domain]["visits"]  += 1
            by_browser[row["browser"]]["time"] += t_sec; by_browser[row["browser"]]["visits"] += 1
            by_url[url]["time"] += t_sec; by_url[url]["visits"] += 1
        result = {"period_days": days, "by_domain": {}, "by_browser": {}, "top_urls": []}
        for d, s in sorted(by_domain.items(),  key=lambda x: x[1]["time"], reverse=True):
            result["by_domain"][d]  = {"time_minutes": round(s["time"]/60,1),
                                        "time_seconds": round(s["time"],0), "visits": s["visits"]}
        for b, s in sorted(by_browser.items(), key=lambda x: x[1]["time"], reverse=True):
            result["by_browser"][b] = {"time_minutes": round(s["time"]/60,1),
                                        "time_seconds": round(s["time"],0), "visits": s["visits"]}
        for url in sorted(by_url, key=lambda x: by_url[x]["time"], reverse=True)[:20]:
            if url:
                s = by_url[url]
                result["top_urls"].append({"url": url, "time_minutes": round(s["time"]/60,1),
                                           "time_seconds": round(s["time"],0), "visits": s["visits"]})
        return result

    def get_peak_usage_hours(self, days=7):
        since = (datetime.now() - timedelta(days=days)).timestamp()
        with self._lock:
            rows = self.conn.execute(
                "SELECT created_at, duration_sec FROM app_usage WHERE created_at >= ?",
                (since,)).fetchall()
        by_hour = defaultdict(float)
        for row in rows:
            by_hour[datetime.fromtimestamp(row["created_at"]).strftime("%H")] += row["duration_sec"]
        result = {"period_days": days, "by_hour": {}}
        for h in range(24):
            hs = f"{h:02d}"
            result["by_hour"][hs] = {"duration_minutes": round(by_hour.get(hs,0)/60,1),
                                      "duration_seconds": round(by_hour.get(hs,0),0)}
        return result

    def get_productivity_score(self, days=7):
        since = (datetime.now() - timedelta(days=days)).timestamp()
        with self._lock:
            rows = self.conn.execute(
                "SELECT category, duration_sec FROM app_usage WHERE created_at >= ?",
                (since,)).fetchall()
        by_cat = defaultdict(float)
        for row in rows:
            by_cat[row["category"]] += row["duration_sec"]
        productive  = by_cat.get("productive",  0)
        distracting = by_cat.get("distracting", 0)
        neutral     = by_cat.get("neutral",     0)
        total       = productive + distracting + neutral
        if total > 0:
            score = (productive/total * 60) + ((1 - distracting/total) * 40)
        else:
            score = 0
        return {
            "period_days": days,
            "score": round(min(100, max(0, score)), 1),
            "productive_minutes":  round(productive/60,  1),
            "distracting_minutes": round(distracting/60, 1),
            "neutral_minutes":     round(neutral/60,     1),
            "breakdown": {
                "productive_percent":  round(productive/total*100,  1) if total else 0,
                "distracting_percent": round(distracting/total*100, 1) if total else 0,
                "neutral_percent":     round(neutral/total*100,     1) if total else 0,
            }
        }

    def cleanup_old_data(self, days_to_keep=90):
        cutoff = (datetime.now() - timedelta(days=days_to_keep)).timestamp()
        with self._lock:
            self.conn.execute("DELETE FROM app_usage    WHERE created_at < ?", (cutoff,))
            self.conn.execute("DELETE FROM tab_activity WHERE created_at < ?", (cutoff,))
            self.conn.commit()


# =========================================================================== #
# Tracker engine
# =========================================================================== #
class ActivityTracker:
    def __init__(self, store, config):
        self.store   = store
        self.config  = config
        self._stop   = threading.Event()
        self._thread = None
        self._lock   = threading.Lock()
        self._current = None
        self._segment = None
        self.started_at = time.time()

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, daemon=True, name="flowtrack-tracker")
        self._thread.start()

    def stop(self):
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    def sample(self):
        title, process = _active_window()
        idle    = _idle_seconds()
        is_idle = idle >= self.config.idle_threshold
        category = "idle" if is_idle else self._categorize(title, process)
        return {"title": title, "process": process, "idle_seconds": round(idle,1),
                "is_idle": is_idle, "category": category, "ts": time.time()}

    def _categorize(self, title, process):
        hay    = f"{title} {process}".lower()
        proc_l = str(process).lower()
        with self._lock:
            cats = self.config.categories
        for cat in ("distracting", "productive", "neutral"):
            rules = cats.get(cat, {})
            procs = [p.lower() for p in rules.get("processes", []) if p]
            kws   = [k.lower() for k in rules.get("keywords",  []) if k]
            if any(p in proc_l for p in procs): return cat
            if any(k in hay    for k in kws):   return cat
        return "neutral"

    def _run(self):
        last = None
        while not self._stop.is_set():
            try:
                snap = self.sample()
            except Exception as e:
                snap = {"title": f"Error: {e}", "process": "error",
                        "idle_seconds": 0.0, "is_idle": False,
                        "category": "neutral", "ts": time.time()}
            key = (snap["process"], snap["category"], bool(snap["is_idle"]))
            if last is not None and last["key"] == key:
                last["end"] = snap["ts"]; last["title"] = snap["title"]
            else:
                if last is not None:
                    self.store.record_activity(last["start"], last["end"],
                                               last["process"], last["title"],
                                               last["category"], last["is_idle"])
                last = {"key": key, "start": snap["ts"], "end": snap["ts"],
                        "process": snap["process"], "title": snap["title"],
                        "category": snap["category"], "is_idle": bool(snap["is_idle"])}
            with self._lock:
                self._current = snap
                self._segment = last
            if self._stop.wait(self.config.poll_interval):
                break
        if last is not None:
            self.store.record_activity(last["start"], last["end"],
                                       last["process"], last["title"],
                                       last["category"], last["is_idle"])
        with self._lock:
            self._segment = None

    def current(self):
        with self._lock:
            return dict(self._current) if self._current else None

    def live_record(self):
        with self._lock:
            seg = self._segment
        if seg is None:
            return None
        end = time.time()
        return {"start_ts": seg["start"], "end_ts": end,
                "duration": max(0.0, end - seg["start"]),
                "process": seg["process"], "title": seg["title"],
                "category": seg["category"], "is_idle": bool(seg["is_idle"]), "live": True}

    def status(self):
        return {
            "service": SERVICE_NAME, "version": __version__,
            "tracking": self._thread is not None and self._thread.is_alive(),
            "platform": _platform_name(),
            "uptime_seconds": round(time.time() - self.started_at, 1),
            "poll_interval": self.config.poll_interval,
            "idle_threshold": self.config.idle_threshold,
            "current": self.current(), "current_session": self.live_record(),
        }


# =========================================================================== #
# Analytics helpers
# =========================================================================== #
def _rank_for_level(level):
    if level <= 5:  return {"rank": "Novice Seeker",   "emoji": "🌱"}
    if level <= 15: return {"rank": "Focused Scholar", "emoji": "📖"}
    if level <= 30: return {"rank": "Master Learner",  "emoji": "🧠"}
    return {"rank": "Flow Sovereign", "emoji": "👑"}

def _level_from_xp(xp):    return int((xp / 10) ** 0.5) if xp > 0 else 1
def _xp_for_minutes(mins):  return mins

def _range_start(label):
    now = datetime.now()
    if label == "week":  return (now - timedelta(days=7)).timestamp()
    if label == "month": return (now - timedelta(days=30)).timestamp()
    if label == "all":   return 0.0
    return now.replace(hour=0, minute=0, second=0, microsecond=0).timestamp()

def _date_str(ts): return datetime.fromtimestamp(ts).strftime("%Y-%m-%d")

def _streak_days(sessions):
    days = sorted({datetime.fromtimestamp(s["start_ts"]).date()
                   for s in sessions if s.get("start_ts")}, reverse=True)
    if not days: return 0
    streak, today = 0, date.today()
    for d in days:
        if d == today - timedelta(days=streak): streak += 1
        elif d == today - timedelta(days=streak - 1): continue
        else: break
    return streak

def _daily_breakdown(sessions, since):
    out = defaultdict(float)
    for s in sessions:
        out[_date_str(s["start_ts"])] += s.get("duration_seconds", 0)
    return {d: out[d] for d in sorted(out)}

def _compute_stats(store, range_label):
    since      = _range_start(range_label)
    sessions   = store.list_sessions(since=since, limit=10000)
    study_secs = sum(s["duration_seconds"] for s in sessions if s["completed"])
    planned    = sum(s.get("planned_duration_seconds", 0) for s in sessions)
    completed  = sum(1 for s in sessions if s["completed"])
    total      = len(sessions)
    compl_rate = (completed / total * 100) if total else 0.0
    total_xp   = int(_xp_for_minutes(study_secs / 60.0))
    level      = max(1, _level_from_xp(total_xp))
    rank       = _rank_for_level(level)
    daily_goal = float(store.get_setting("daily_goal_hours", "4"))
    goal_secs  = daily_goal * 3600
    goal_prog  = min(1.0, study_secs / goal_secs) if goal_secs else 0.0
    cats       = defaultdict(float, store.activity_by_category(since))
    productive = cats.get("productive", 0.0)
    distracting= cats.get("distracting", 0.0)
    neutral    = cats.get("neutral", 0.0)
    idle       = cats.get("idle", 0.0)
    active     = productive + distracting + neutral
    distract_p = (distracting / active * 40.0) if active > 0 else 0.0
    focus_score= max(0.0, min(100.0, goal_prog * 60.0 + 40.0 - distract_p))
    streak     = _streak_days(store.list_sessions(since=0.0, limit=100000))
    return {
        "range": range_label, "since": since,
        "study_seconds": study_secs, "study_hours": round(study_secs/3600.0, 2),
        "planned_seconds": planned, "session_count": total,
        "completed_sessions": completed, "completion_rate": round(compl_rate, 1),
        "xp": total_xp, "level": level, "rank": rank, "streak_days": streak,
        "focus_score": round(focus_score, 1), "goal_progress": round(goal_prog*100, 1),
        "activity_by_category": {"productive": productive, "distracting": distracting,
                                  "neutral": neutral, "idle": idle},
    }


# =========================================================================== #
# HTTP handler
# =========================================================================== #
class TrackerHandler(BaseHTTPRequestHandler):
    server_version = f"FlowTrack/{__version__}"
    protocol_version = "HTTP/1.1"

    def log_message(self, *args): return

    @property
    def store(self):    return self.server.store
    @property
    def tracker(self):  return self.server.tracker
    @property
    def config(self):   return self.server.config
    @property
    def analytics(self): return self.server.analytics

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")

    def _send_json(self, obj, status=200, headers=None):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _send_raw(self, body, content_type, status=200, headers=None):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self._cors()
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
        except ValueError:
            length = 0
        if length <= 0: return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return None

    def _error(self, msg, status=400):
        self._send_json({"error": msg, "status": status}, status=status)

    def _parse_int(self, value, default):
        try:    return int(value)
        except: return default

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("/") or "/"
        qs     = parse_qs(parsed.query)

        if path == "/":
            return self._send_json({"service": SERVICE_NAME, "version": __version__, "endpoints": ROUTE_MAP})
        if path == "/health":
            return self._send_json({"status": "ok", "win32_available": WIN32,
                                    "platform": _platform_name(),
                                    "tracking": self.tracker.status()["tracking"],
                                    "service": SERVICE_NAME, "version": __version__})
        if path == "/active-window":
            return self._send_json(self.tracker.current() or
                                   {"title": "starting up...", "process": "unknown",
                                    "category": "neutral", "is_idle": False, "idle_seconds": 0})
        if path == "/status":   return self._send_json(self.tracker.status())
        if path == "/config":   return self._send_json(self.config.snapshot())
        if path == "/subjects": return self._send_json({"subjects": self.store.list_subjects()})

        if path == "/sessions":
            rng  = (qs.get("range") or ["today"])[0].lower()
            subj = qs.get("subject")
            sid  = self._parse_int((subj or [None])[0], None)
            lim  = self._parse_int((qs.get("limit") or ["1000"])[0], 1000)
            return self._send_json({"range": rng, "sessions": self.store.list_sessions(
                subject_id=sid, since=_range_start(rng), limit=lim)})

        if path == "/stats":
            rng = (qs.get("range") or ["today"])[0].lower()
            return self._send_json(_compute_stats(self.store, rng))

        if path == "/analytics":
            rng   = (qs.get("range") or ["week"])[0].lower()
            since = _range_start(rng)
            sessions = self.store.list_sessions(since=since, limit=10000)
            by_sub = defaultdict(float)
            for s in sessions:
                by_sub[s.get("subject_name") or "Uncategorized"] += s.get("duration_seconds", 0)
            return self._send_json({"range": rng,
                                    "by_subject": {k: round(v,1) for k,v in by_sub.items()},
                                    "daily_breakdown": _daily_breakdown(sessions, since)})

        if path == "/heatmap":
            days  = self._parse_int((qs.get("days") or ["90"])[0], 90)
            since = (datetime.now() - timedelta(days=days)).timestamp()
            sessions = self.store.list_sessions(since=since, limit=100000)
            daily = defaultdict(float)
            for s in sessions:
                daily[_date_str(s["start_ts"])] += s.get("duration_seconds", 0)
            return self._send_json({"days": days,
                                    "heatmap": {d: round(v,1) for d,v in sorted(daily.items())}})

        if path == "/sync":
            return self._send_json({"settings": self.store.all_settings(),
                                    "subjects": self.store.list_subjects(),
                                    "sessions": self.store.list_sessions(since=0.0, limit=100000)})

        if path == "/export": return self._export(qs)

        # ---- App Analytics endpoints ----
        if path == "/app-usage":
            days = self._parse_int((qs.get("days") or ["7"])[0], 7)
            return self._send_json(self.analytics.get_daily_app_usage(days))

        if path == "/browser-usage":
            days = self._parse_int((qs.get("days") or ["7"])[0], 7)
            return self._send_json(self.analytics.get_browser_usage(days))

        if path == "/peak-hours":
            days = self._parse_int((qs.get("days") or ["7"])[0], 7)
            return self._send_json(self.analytics.get_peak_usage_hours(days))

        if path == "/productivity-score":
            days = self._parse_int((qs.get("days") or ["7"])[0], 7)
            return self._send_json(self.analytics.get_productivity_score(days))

        self._error(f"Unknown endpoint: {path}", 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("/") or "/"

        if path == "/config":
            payload = self._read_json()
            if payload is None: return self._error("Invalid JSON", 400)
            return self._send_json({"ok": True, "config": self.config.update(payload)})

        if path == "/subjects":
            payload = self._read_json()
            try:
                return self._send_json({"subject": self.store.create_subject(payload)}, status=201)
            except Exception as e:
                return self._error(str(e), 400)

        if path == "/sessions":
            payload = self._read_json()
            if payload is None: return self._error("Invalid JSON", 400)
            return self._send_json({"session": self.store.upsert_session(payload)}, status=201)

        if path == "/sync":
            payload = self._read_json()
            if payload is None: return self._error("Invalid JSON", 400)
            return self._bulk_sync(payload)

        # ---- Analytics POST endpoints ----
        if path == "/app-usage":
            payload = self._read_json()
            if payload is None: return self._error("Invalid JSON", 400)
            self.analytics.record_app_usage(
                payload.get("app_name", "unknown"),
                payload.get("process_name"),
                float(payload.get("duration_sec", 0)),
                payload.get("category", "neutral"),
                payload.get("browser_url"))
            return self._send_json({"ok": True})

        if path == "/tab-activity":
            payload = self._read_json()
            if payload is None: return self._error("Invalid JSON", 400)
            self.analytics.record_tab_activity(
                payload.get("browser", "unknown"),
                payload.get("url", ""),
                payload.get("title", ""),
                float(payload.get("time_spent_sec", 0)))
            return self._send_json({"ok": True})

        self._error(f"Unknown endpoint: {path}", 404)

    def do_PATCH(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("/") or "/"
        m = re.match(r"^/subjects/(\d+)$", path)
        if m:
            payload = self._read_json()
            if payload is None: return self._error("Invalid JSON", 400)
            updated = self.store.update_subject(int(m.group(1)), payload)
            if updated is None: return self._error("Subject not found", 404)
            return self._send_json({"subject": updated})
        m = re.match(r"^/sessions/(\d+)$", path)
        if m:
            payload = self._read_json()
            if payload is None: return self._error("Invalid JSON", 400)
            payload["id"] = int(m.group(1))
            updated = self.store.upsert_session(payload)
            if updated is None: return self._error("Session not found", 404)
            return self._send_json({"session": updated})
        self._error(f"Unknown endpoint: {path}", 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("/") or "/"
        m = re.match(r"^/subjects/(\d+)$", path)
        if m:
            self.store.delete_subject(int(m.group(1)))
            return self._send_json({"ok": True})
        m = re.match(r"^/sessions/(\d+)$", path)
        if m:
            self.store.delete_session(int(m.group(1)))
            return self._send_json({"ok": True})
        self._error(f"Unknown endpoint: {path}", 404)

    def _bulk_sync(self, payload):
        counts = {"subjects": 0, "sessions": 0, "settings": 0}
        for sub in payload.get("subjects") or []:
            try:
                if sub.get("id"):
                    self.store.update_subject(sub["id"], sub)
                else:
                    existing = [s for s in self.store.list_subjects()
                                if s["name"].lower() == (sub.get("name") or "").lower()]
                    if existing: self.store.update_subject(existing[0]["id"], sub)
                    else:        self.store.create_subject(sub)
                counts["subjects"] += 1
            except Exception: pass
        for k, v in (payload.get("settings") or {}).items():
            self.store.set_setting(k, v); counts["settings"] += 1
        for sess in payload.get("sessions") or []:
            try:
                self.store.upsert_session(sess); counts["sessions"] += 1
            except Exception: pass
        if "activities" in payload:
            try:
                with self.store._lock:
                    self.store.conn.execute("DELETE FROM activities")
                    for act in payload["activities"]:
                        self.store.conn.execute(
                            "INSERT INTO activities "
                            "(start_ts, end_ts, duration, process, title, category, is_idle) "
                            "VALUES (?, ?, ?, ?, ?, ?, ?)",
                            (act.get("start_ts"), act.get("end_ts"), act.get("duration"),
                             act.get("process"), act.get("title"), act.get("category"),
                             1 if act.get("is_idle") else 0))
                    self.store.conn.commit()
                counts["activities"] = len(payload["activities"])
            except Exception: pass
        return self._send_json({"ok": True, "counts": counts})

    def _export(self, qs):
        export_type = (qs.get("type")   or ["sessions"])[0].lower()
        fmt         = (qs.get("format") or ["json"])[0].lower()
        rng         = (qs.get("range")  or ["all"])[0].lower()
        since       = _range_start(rng)
        if export_type == "activities":
            rows     = self.store.activity_export(since)
            filename = f"flowtrack_activities_{rng}.{fmt}"
        else:
            rows     = self.store.list_sessions(since=since, limit=100000)
            filename = f"flowtrack_sessions_{rng}.{fmt}"
        if fmt == "csv":
            if not rows:
                return self._send_raw("", "text/csv",
                                      headers={"Content-Disposition": f"attachment; filename={filename}"})
            buf    = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            for r in rows: writer.writerow(r)
            return self._send_raw(buf.getvalue().encode("utf-8-sig"), "text/csv; charset=utf-8",
                                  headers={"Content-Disposition": f"attachment; filename={filename}"})
        return self._send_raw(json.dumps({export_type: rows}, ensure_ascii=False),
                              "application/json",
                              headers={"Content-Disposition": f"attachment; filename={filename}"})


ROUTE_MAP = {
    "GET /":                    "API map",
    "GET /health":              "Health check",
    "GET /active-window":       "Current foreground window",
    "GET /status":              "Tracker runtime status",
    "GET /config":              "View config",
    "POST /config":             "Update config",
    "GET /subjects":            "List subjects",
    "POST /subjects":           "Create subject",
    "PATCH /subjects/<id>":     "Update subject",
    "DELETE /subjects/<id>":    "Delete subject",
    "GET /sessions":            "List sessions",
    "POST /sessions":           "Create/upsert session",
    "PATCH /sessions/<id>":     "Update session",
    "DELETE /sessions/<id>":    "Delete session",
    "GET /stats":               "Study stats + XP/level/rank/focus score",
    "GET /analytics":           "Subject/daily breakdown",
    "GET /heatmap":             "Study streak heatmap",
    "GET /sync":                "Dump all data",
    "POST /sync":               "Bulk upsert from frontend",
    "GET /export":              "Export data (JSON or CSV)",
    "GET /app-usage":           "Daily app usage analytics",
    "POST /app-usage":          "Record app usage",
    "GET /browser-usage":       "Browser tab analytics",
    "POST /tab-activity":       "Record browser tab activity",
    "GET /peak-hours":          "Peak usage hours",
    "GET /productivity-score":  "Productivity score (0-100)",
}


# =========================================================================== #
# Server bootstrap
# =========================================================================== #
class FlowTrackServer(ThreadingHTTPServer):
    daemon_threads    = True
    allow_reuse_address = True

    def __init__(self, addr, handler, store, tracker, config, analytics):
        super().__init__(addr, handler)
        self.store     = store
        self.tracker   = tracker
        self.config    = config
        self.analytics = analytics


def _banner(host, port, db_path, config_path, config):
    bar = "=" * 68
    return "\n".join([
        bar,
        f"  {SERVICE_NAME}  v{__version__}",
        bar,
        f"  Listening  :  http://{host}:{port}",
        f"  Platform   :  {_platform_name()}",
        f"  Database   :  {db_path}",
        f"  Config     :  {config_path or '(in-memory)'}",
        f"  Poll/Idle  :  {config.poll_interval}s / {config.idle_threshold}s",
        bar,
        "  Core    :  /health  /active-window  /status  /subjects",
        "              /sessions  /stats  /analytics  /heatmap  /sync",
        "  Analytics: /app-usage  /browser-usage  /peak-hours  /productivity-score",
        bar,
        "  Press Ctrl+C to stop.",
        bar, "",
    ])


def run(host, port, db_path, config_path, poll, idle, clear):
    store     = Store(db_path)
    analytics = AppAnalytics(db_path)   # shares same DB file, separate tables
    if clear:
        store.clear()
        print(f"[info] Cleared database {db_path}")
    config  = Config(config_path, poll_interval=poll, idle_threshold=idle)
    tracker = ActivityTracker(store, config)
    try:
        httpd = FlowTrackServer((host, port), TrackerHandler,
                                store, tracker, config, analytics)
    except OSError as e:
        store.close()
        if getattr(e, "errno", None) in (98, 48) or "address already in use" in str(e).lower():
            print(f"[ERROR] Port {port} is already in use.")
            print(f"        Try: python backend.py {port + 1}")
            sys.exit(1)
        raise

    tracker.start()

    def handle_signal(signum, frame):
        print("\n[shutdown] stopping tracker and HTTP server ...")
        tracker.stop()
        threading.Thread(target=httpd.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, handle_signal)
    try:
        signal.signal(signal.SIGTERM, handle_signal)
    except (AttributeError, ValueError):
        pass

    print(_banner(host, port, db_path, config_path, config))
    try:
        httpd.serve_forever()
    finally:
        tracker.stop()
        httpd.server_close()
        store.close()
        print("[shutdown] done. Bye! 👋")


def main():
    parser = argparse.ArgumentParser(
        description=f"{SERVICE_NAME} v{__version__}",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("port", nargs="?", type=int, default=DEFAULT_PORT)
    parser.add_argument("--host",   default="127.0.0.1")
    parser.add_argument("--db",     default="flowtrack.db")
    parser.add_argument("--config", default="flowtrack_config.json")
    parser.add_argument("--poll",   type=float, default=None)
    parser.add_argument("--idle",   type=float, default=None)
    parser.add_argument("--clear",  action="store_true")
    args = parser.parse_args()
    run(host=args.host, port=args.port, db_path=args.db,
        config_path=args.config or None,
        poll=args.poll, idle=args.idle, clear=args.clear)


if __name__ == "__main__":
    main()
