self.onmessage = function (e) {
  const { action, sessions, dailyGoalHours } = e.data;

  if (action === "calculate") {
    let totalSeconds = 0;
    const bySubject = {};
    const dailyBreakdown = {};

    if (sessions && Array.isArray(sessions)) {
      sessions.forEach((s) => {
        const duration = s.actualSeconds || 0;
        totalSeconds += duration;

        // Calculate by Subject
        if (s.subjectId) {
          bySubject[s.subjectId] = (bySubject[s.subjectId] || 0) + duration;
        }

        // Calculate Daily Breakdown
        if (s.startTime) {
          try {
            const dateKey = s.startTime.split("T")[0];
            dailyBreakdown[dateKey] = (dailyBreakdown[dateKey] || 0) + duration;
          } catch (err) {
            // ignore invalid date
          }
        }
      });
    }

    const totalXP = Math.floor(totalSeconds / 36);
    const level = Math.floor(totalXP / 1000) + 1;
    const xpInCurrentLevel = totalXP % 1000;
    const xpProgress = (xpInCurrentLevel / 1000) * 100;
    const xpToNextLevel = 1000 - xpInCurrentLevel;

    self.postMessage({
      totalSeconds,
      totalXP,
      level,
      xpProgress,
      xpToNextLevel,
      bySubject,
      dailyBreakdown,
    });
  }
};
