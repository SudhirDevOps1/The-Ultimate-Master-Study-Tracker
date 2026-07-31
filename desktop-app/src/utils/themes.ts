import type { ThemeConfig, ThemeName } from "@/types/models";

export const themes: Record<string, ThemeConfig> = {
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
  paper: {
    name: "paper",
    primaryColor: "#0f172a",
    secondaryColor: "#d97706",
    accentColor: "#334155",
    gradientFrom: "from-amber-100",
    gradientTo: "to-orange-100",
    bgGradient: `
      linear-gradient(180deg, #fdfbf7 0%, #f7f4ec 50%, #f0ebd9 100%)
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
  tokyo: {
    name: "tokyo",
    primaryColor: "#7aa2f7",
    secondaryColor: "#bb9af7",
    accentColor: "#7dcfff",
    gradientFrom: "from-blue-400",
    gradientTo: "to-purple-400",
    bgGradient: `
      radial-gradient(circle at top, rgba(122, 162, 247, 0.22) 0%, transparent 28%),
      linear-gradient(180deg, #1a1b26 0%, #16161e 50%, #101014 100%)
    `,
  },
  nordic: {
    name: "nordic",
    primaryColor: "#88c0d0",
    secondaryColor: "#81a1c1",
    accentColor: "#8fbcbb",
    gradientFrom: "from-cyan-300",
    gradientTo: "to-blue-400",
    bgGradient: `
      radial-gradient(circle at top, rgba(136, 192, 208, 0.2) 0%, transparent 28%),
      linear-gradient(180deg, #2e3440 0%, #242933 50%, #1b1e25 100%)
    `,
  },
  dracula: {
    name: "dracula",
    primaryColor: "#bd93f9",
    secondaryColor: "#ff79c6",
    accentColor: "#50fa7b",
    gradientFrom: "from-purple-400",
    gradientTo: "to-pink-400",
    bgGradient: `
      radial-gradient(circle at top, rgba(189, 147, 249, 0.25) 0%, transparent 28%),
      linear-gradient(180deg, #282a36 0%, #1e1f29 50%, #14151d 100%)
    `,
  },
  coffee: {
    name: "coffee",
    primaryColor: "#d97706",
    secondaryColor: "#b45309",
    accentColor: "#f59e0b",
    gradientFrom: "from-amber-600",
    gradientTo: "to-yellow-700",
    bgGradient: `
      radial-gradient(circle at top, rgba(217, 119, 6, 0.2) 0%, transparent 28%),
      linear-gradient(180deg, #1c140e 0%, #130d09 50%, #0a0604 100%)
    `,
  },
  oled: {
    name: "oled",
    primaryColor: "#38bdf8",
    secondaryColor: "#a78bfa",
    accentColor: "#34d399",
    gradientFrom: "from-cyan-400",
    gradientTo: "to-emerald-400",
    bgGradient: `
      linear-gradient(180deg, #000000 0%, #000000 100%)
    `,
  },
};

export function applyTheme(theme: ThemeConfig): void {
  document.documentElement.setAttribute("data-theme", theme.name || "default");
  document.documentElement.style.setProperty("--theme-primary", theme.primaryColor || "#6366f1");
  document.documentElement.style.setProperty("--theme-secondary", theme.secondaryColor || "#22d3ee");
  document.documentElement.style.setProperty("--theme-accent", theme.accentColor || "#a78bfa");
  document.body.style.background = theme.bgGradient || "";
}

export function getThemeColors(themeName: ThemeName): ThemeConfig {
  return themes[themeName] ?? themes.default;
}
