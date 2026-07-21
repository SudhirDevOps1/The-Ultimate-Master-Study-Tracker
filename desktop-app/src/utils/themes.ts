import type { ThemeConfig, ThemeName } from "@/types/models";

export const themes: Record<ThemeName, ThemeConfig> = {
  default: {
    name: "default",
    primaryColor: "#6366f1",
    secondaryColor: "#22d3ee",
    accentColor: "#a78bfa",
    gradientFrom: "from-indigo-500",
    gradientTo: "to-cyan-500",
    bgGradient: `
      radial-gradient(circle at top, rgba(99, 102, 241, 0.22) 0%, transparent 24%),
      radial-gradient(circle at right, rgba(34, 211, 238, 0.14) 0%, transparent 28%),
      linear-gradient(180deg, #0f172a 0%, #0b1220 42%, #060913 100%)
    `,
  },
  ocean: {
    name: "ocean",
    primaryColor: "#0ea5e9",
    secondaryColor: "#06b6d4",
    accentColor: "#38bdf8",
    gradientFrom: "from-sky-500",
    gradientTo: "to-teal-400",
    bgGradient: `
      radial-gradient(circle at top, rgba(14, 165, 233, 0.25) 0%, transparent 28%),
      radial-gradient(circle at right, rgba(6, 182, 212, 0.18) 0%, transparent 32%),
      linear-gradient(180deg, #0c1929 0%, #071318 42%, #030a10 100%)
    `,
  },
  forest: {
    name: "forest",
    primaryColor: "#22c55e",
    secondaryColor: "#84cc16",
    accentColor: "#4ade80",
    gradientFrom: "from-green-500",
    gradientTo: "to-lime-400",
    bgGradient: `
      radial-gradient(circle at top, rgba(34, 197, 94, 0.22) 0%, transparent 26%),
      radial-gradient(circle at right, rgba(132, 204, 22, 0.16) 0%, transparent 30%),
      linear-gradient(180deg, #0a1f13 0%, #071510 42%, #030a07 100%)
    `,
  },
  sunset: {
    name: "sunset",
    primaryColor: "#f97316",
    secondaryColor: "#f43f5e",
    accentColor: "#fb923c",
    gradientFrom: "from-orange-500",
    gradientTo: "to-rose-500",
    bgGradient: `
      radial-gradient(circle at top, rgba(249, 115, 22, 0.24) 0%, transparent 26%),
      radial-gradient(circle at right, rgba(244, 63, 94, 0.18) 0%, transparent 30%),
      linear-gradient(180deg, #1f0f0a 0%, #150a08 42%, #0a0403 100%)
    `,
  },
  galaxy: {
    name: "galaxy",
    primaryColor: "#a855f7",
    secondaryColor: "#ec4899",
    accentColor: "#c084fc",
    gradientFrom: "from-purple-500",
    gradientTo: "to-pink-500",
    bgGradient: `
      radial-gradient(circle at top, rgba(168, 85, 247, 0.25) 0%, transparent 28%),
      radial-gradient(circle at right, rgba(236, 72, 153, 0.18) 0%, transparent 32%),
      linear-gradient(180deg, #1a0a1f 0%, #110515 42%, #08030a 100%)
    `,
  },
  cyber: {
    name: "cyber",
    primaryColor: "#facc15",
    secondaryColor: "#f43f5e",
    accentColor: "#fbbf24",
    gradientFrom: "from-yellow-400",
    gradientTo: "to-rose-500",
    bgGradient: `
      radial-gradient(circle at top, rgba(250, 204, 21, 0.2) 0%, transparent 24%),
      radial-gradient(circle at right, rgba(244, 63, 94, 0.16) 0%, transparent 28%),
      linear-gradient(180deg, #1a1506 0%, #110e04 42%, #080602 100%)
    `,
  },
  neon: {
    name: "neon",
    primaryColor: "#00ffc3",
    secondaryColor: "#ff00e5",
    accentColor: "#00d4ff",
    gradientFrom: "from-cyan-400",
    gradientTo: "to-fuchsia-500",
    bgGradient: `
      radial-gradient(circle at top, rgba(0, 255, 195, 0.2) 0%, transparent 25%),
      radial-gradient(circle at right, rgba(255, 0, 229, 0.15) 0%, transparent 30%),
      linear-gradient(180deg, #0a0a0f 0%, #050508 42%, #020205 100%)
    `,
  },
  paper: {
    name: "paper",
    primaryColor: "#64748b",
    secondaryColor: "#94a3b8",
    accentColor: "#cbd5e1",
    gradientFrom: "from-slate-100",
    gradientTo: "to-slate-300",
    bgGradient: `
      linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)
    `,
  },
};

export function applyTheme(theme: ThemeConfig): void {
  document.documentElement.setAttribute("data-theme", theme.name);
  document.documentElement.style.setProperty("--theme-primary", theme.primaryColor);
  document.documentElement.style.setProperty("--theme-secondary", theme.secondaryColor);
  document.documentElement.style.setProperty("--theme-accent", theme.accentColor);
  document.body.style.background = theme.bgGradient;
}

export function getThemeColors(themeName: ThemeName): ThemeConfig {
  return themes[themeName] ?? themes.default;
}
