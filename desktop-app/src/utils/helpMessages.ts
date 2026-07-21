// Helpful messages and tips for various features

export const HelpMessages = {
  timer: {
    title: "Pomodoro Timer",
    description: "Focused study sessions with breaks to maintain productivity.",
    tip: "Use the timer to track focused study sessions. A typical Pomodoro is 25 minutes of work followed by a 5-minute break.",
  },
  
  dashboard: {
    title: "Dashboard Overview",
    description: "See your daily progress, goals, and activity summary at a glance.",
    tip: "Check your daily progress ring to see how close you are to your study goal. The more filled it is, the better!",
  },
  
  analytics: {
    title: "Analytics & Insights",
    description: "Track detailed study patterns, productive vs. distracting time, and progress over time.",
    tip: "Review your weekly and monthly analytics to identify patterns and improve your study habits.",
  },
  
  subjects: {
    title: "Subject Management",
    description: "Organize your studies by subject and track progress for each.",
    tip: "Create subjects for each course or topic you're studying. This helps organize your sessions and track progress per subject.",
  },
  
  goals: {
    title: "Daily & Weekly Goals",
    description: "Set targets for your study time and track achievement.",
    tip: "Set realistic daily and weekly goals. The app will help you stay on track and celebrate your achievements.",
  },
  
  backendActivity: {
    title: "App & Tab Usage",
    description: "See which applications and websites you spend the most time on, categorized as productive, distracting, or neutral.",
    tip: "To enable this feature, start the backend service using the start_local.bat (Windows) or start_local.sh (macOS/Linux) script.",
  },
  
  achievements: {
    title: "Achievements & Rewards",
    description: "Unlock badges and rewards as you progress through your study journey.",
    tip: "Work consistently to unlock achievements. Each milestone brings you closer to mastery!",
  },
  
  level: {
    title: "Level & XP System",
    description: "Gain XP through study sessions and level up to unlock new features.",
    tip: "Your level increases with consistent study sessions. Higher levels unlock new themes and features.",
  },
};

export function getHelpMessage(feature: keyof typeof HelpMessages) {
  return HelpMessages[feature];
}

export const TroubleshootingTips = {
  backendOffline: {
    problem: "Backend server is offline",
    solutions: [
      "Make sure you've started the backend service using start_local.bat (Windows) or start_local.sh (macOS/Linux)",
      "Check that the port 5000 is not blocked by a firewall",
      "Ensure the Python environment is properly set up with all dependencies installed",
    ],
  },
  
  noActivityData: {
    problem: "No activity data showing",
    solutions: [
      "Backend must be running and connected",
      "Allow FlowTrack some time to collect data (at least 1-2 minutes)",
      "Make sure you're actively using applications and switching between windows",
      "Check that your operating system (Windows/macOS/Linux) is supported",
    ],
  },
  
  timerNotWorking: {
    problem: "Timer not starting or updating",
    solutions: [
      "Refresh the page (Ctrl+R or Cmd+R)",
      "Check browser console for errors (F12 → Console tab)",
      "Try a different browser (Chrome, Firefox, Edge, Safari)",
      "Clear your browser cache and cookies",
    ],
  },
  
  slowPerformance: {
    problem: "App running slowly",
    solutions: [
      "Close unnecessary browser tabs to free up memory",
      "Clear browser cache and temporary files",
      "Disable browser extensions that might interfere with FlowTrack",
      "Check your internet connection speed",
    ],
  },
};

export function getTroubleshootingTips(issue: keyof typeof TroubleshootingTips) {
  return TroubleshootingTips[issue];
}
