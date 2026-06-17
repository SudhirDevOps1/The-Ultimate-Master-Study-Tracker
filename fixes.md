# 🐛 Fix Log (Bug & Feature Improvements)

List of key fixes implemented in the tracking ecosystem:

### 1. Monthly Goal Calculations
- **Fix**: Replaced hardcoded monthly target value (50 hours) with dynamically calculated formula derived from weekly target hours ($Target \times 4$).

### 2. SVG Gradient Flickering
- **Fix**: Replaced runtime random IDs (`Math.random()`) in `ProgressRing` with stable static identifier strings to prevent UI flickering on refresh.

### 3. Streak Logic Carry-forward
- **Fix**: Fixed checks so that daily streaks do not reset to zero if the user has not studied *today* yet; it gracefully checks kal (yesterday) first to see if the chain is alive.

### 4. Minimum Study Time Guard (Accidental Completes)
- **Fix**: If a session is started and stopped in under 60 seconds (1 minute), the session status reverts to "planned" instead of "completed", preventing empty study logs.

### 5. Settings Data Reset
- **Fix**: Added Danger Zone confirmation triggers to completely wipe out database/settings values.

### 6. AI Assistant API Integration (v1.3.0)
- **Fix**: Rebuilt the API Fetch calls for Gemini, Groq, and OpenAI to natively support browser-based CORS environments. Correctly bubbles up API failure messages (like "Invalid API Key") instead of silent failures.

### 7. Streak Logic Enhancement (v1.3.0)
- **Fix**: Adjusted calendar parsing on the `AnalyticsPage` so that the activity history only shows days starting from the user's *first study session* up to today, hiding irrelevant future dates.

### 8. Strict Session Guard (v1.3.0)
- **Fix**: Sessions under 60 seconds are strictly reverted to 'planned' status to prevent accidental or fake logs. 

