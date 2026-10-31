export type AppCategory = "study" | "browser" | "social" | "entertainment" | "system";

export const STUDY_PROCESSES = new Set([
  // IDEs & Code Editors
  "code", "code - insiders", "cursor", "vscodium", "idea64", "pycharm64",
  "webstorm64", "phpstorm64", "clion64", "goland64", "rider64", "rubymine64",
  "devenv", "notepad++", "sublime_text", "atom", "brackets", "vim", "nvim",
  "emacs", "eclipse", "netbeans", "android studio", "xcode",

  // Terminals & Shells
  "windowsterminal", "cmd", "powershell", "pwsh", "bash", "zsh", "fish", "wt",

  // Knowledge, Notes & Docs
  "notion", "obsidian", "logseq", "anki", "remnote", "onenote", "onenotem",
  "winword", "excel", "powerpnt", "acrobat", "acrord32", "foxitreader",
  "sumatrapdf", "pdfxchange", "zotero", "mendeley",

  // Scientific & Design Tools
  "matlab", "rstudio", "mathematica", "geogebra", "blender", "figma"
]);

export const STUDY_KEYWORDS = [
  // Programming & Dev
  "github", "gitlab", "stackoverflow", "stackexchange", "leetcode", "hackerrank",
  "codewars", "w3schools", "mdn web docs", "react documentation", "vue.js",
  "angular", "python documentation", "typescript", "rust-lang", "golang",
  "docker", "kubernetes", "aws documentation", "azure documentation", "gcp documentation",
  "chatgpt", "claude", "gemini", "deepseek", "perplexity", "copilot",

  // Indian EdTech & Exam Prep (PW, Unacademy, UPSC, JEE, NEET)
  "physics wallah", "physicswallah", "pw.live", "pw app", "unacademy", "byju",
  "adda247", "testbook", "drishti ias", "vision ias", "next ias", "vajiram", "khan sir",
  "utkarsh classes", "exampur", "wifistudy", "oliveboard", "study iq", "mrunal", "insightsonindia",
  "forum ias", "iasbaba", "chahal academy", "shankar ias", "vibrant academy", "resonance",
  "fiitjee", "aakash digital", "aakash itutor", "motion education", "etoos india", "career point",
  "narayana", "sri chaitanya", "physics galaxy", "ashish arora", "mohit tyagi", "competishun",
  "unacademy atoms", "vora classes", "sachin sir physics", "aman dhattarwal", "bpsc", "upsc",
  "ssc cgl", "gate 20", "jee main", "jee advanced", "neet 20", "nptel", "swayam", "cbse",
  "ncert", "rd sharma", "hc verma", "irodov", "cengage", "sl arora", "dc pandey", "op tandon",

  // Academic Documents, Research & LaTeX
  "pdf", "lecture", "documentation", "notes", "thesis", "research", "paper", "book",
  "localhost", "127.0.0.1", "jupyter", "google colab", "replit", "overleaf", "latex"
];

export const BROWSER_PROCESSES = new Set([
  "chrome", "msedge", "firefox", "brave", "opera", "operagx", "safari", "arc",
  "vivaldi", "tor", "waterfox", "pale moon", "librewolf", "duckduckgo", "yandex"
]);

export const SOCIAL_PROCESSES = new Set([
  "discord", "telegram", "whatsapp", "slack", "teams", "ms-teams", "zoom", "skype",
  "signal", "viber", "element", "matrix", "resemble", "guilded"
]);

export const ENTERTAINMENT_PROCESSES = new Set([
  "steam", "epicgameslauncher", "gog_galaxy", "origin", "uplay", "battle.net", "riotclient",
  "vlc", "spotify", "netflix", "primevideo", "disneyplus", "hulu", "twitch", "obs64",
  "roblox", "minecraft", "fortnite", "csgo", "cs2", "valorant", "gta5", "leagueoflegends"
]);

export const ENTERTAINMENT_KEYWORDS = [
  "netflix", "prime video", "disney+", "hulu", "twitch", "facebook", "instagram",
  "twitter", "x.com", "tiktok", "reddit", "snapchat", "pinterest", "9gag", "meme", "gaming",
  "hotstar", "zee5", "sonyliv", "jiocinema", "altbalaji", "voot"
];

export function classifyApplication(
  appName: string,
  windowTitle: string = "",
  customOverrides?: Record<string, AppCategory>
): AppCategory {
  const cleanApp = (appName || "").toLowerCase().replace(/\.exe$/, "").trim();
  const cleanTitle = (windowTitle || "").toLowerCase().trim();

  // User configured overrides take highest priority
  if (customOverrides && (customOverrides[cleanApp] || customOverrides[appName])) {
    return customOverrides[cleanApp] || customOverrides[appName];
  }

  if (isSelfApp(appName, windowTitle)) {
    return "system";
  }

  // Explicit dedicated client processes take precedence over generic title tokens
  if (ENTERTAINMENT_PROCESSES.has(cleanApp)) return "entertainment";
  if (SOCIAL_PROCESSES.has(cleanApp)) return "social";
  if (STUDY_PROCESSES.has(cleanApp)) return "study";

  const isBrowser = BROWSER_PROCESSES.has(cleanApp) || cleanApp === "web-portal-browser";

  if (isBrowser) {
    if (cleanTitle.includes("youtube")) {
      if (STUDY_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "study";
      return "entertainment";
    }

    // Explicit check for social media browser tabs
    if (
      cleanTitle.includes("instagram.com") || cleanTitle.includes("instagram") ||
      cleanTitle.includes("facebook.com") || cleanTitle.includes("facebook") || cleanTitle.includes("fb.com") ||
      cleanTitle.includes("twitter.com") || cleanTitle.includes("twitter") || cleanTitle.includes("x.com") ||
      cleanTitle.includes("linkedin.com") || cleanTitle.includes("linkedin")
    ) {
      return "social";
    }

    if (ENTERTAINMENT_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "entertainment";
    if (STUDY_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "study";

    return "browser";
  }

  // Non-browser processes with explicit study keywords in window title
  if (STUDY_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "study";

  return "system";
}

/**
 * Checks if the process name or window title belongs to FlowTrack itself
 */
export function isSelfApp(appName: string, windowTitle: string = ""): boolean {
  const cleanApp = (appName || "").toLowerCase();
  const cleanTitle = (windowTitle || "").toLowerCase();
  return (
    cleanApp.includes("electron") ||
    cleanApp.includes("flowtrack") ||
    cleanTitle.includes("flowtrack pro") ||
    cleanTitle.includes("study tracker")
  );
}
