# FlowTrack Pro Web App - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard & Analytics](#dashboard--analytics)
3. [App & Web Monitor](#app--web-monitor)
4. [Timer & Study Sessions](#timer--study-sessions)
5. [AI Study Assistant](#ai-study-assistant)
6. [Offline & Hybrid Modes](#offline--hybrid-modes)

---

## Getting Started

1. **Launch Web App**:
   - Double-click `START.bat` to launch both local web app server (`http://localhost:5173`) and Python backend (`http://localhost:5001`).
   - Or open the Vercel deployed link in any browser.

2. **Create Subjects & Tasks**:
   - Go to **Subjects** tab to add your study subjects.
   - Go to **Today's Tasks** to plan your daily goals.

3. **Start Timer**:
   - Go to **Timer** tab to run Pomodoro or custom focus sessions.

---

## App & Web Monitor

- **Live Activity Tracking**: Shows active window process name and browser tab title.
- **Top Applications & Web Domains**: Aggregates time spent on productive coding tools, documentation sites, or social media.
- **24-Hour Timeline Bar Chart**: Color-coded breakdown of study vs entertainment vs distraction time throughout the day.
- **Hybrid Connection**: Automatically pulls logs from Python backend when running locally, or tracks active browser tabs when offline.

---

## AI Study Assistant

- Supports **Google Gemini**, **OpenAI**, **Groq**, and local **Ollama** models.
- When running local Ollama with Python backend, requests route through local proxy to bypass browser CORS constraints.
