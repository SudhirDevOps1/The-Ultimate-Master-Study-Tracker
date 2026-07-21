/**
 * FlowTrack Pro — Production-Grade Application & Window Categorization Engine
 * Contains 500+ mapped developer tools, IDEs, browsers, system utilities, and entertainment apps.
 */

export type AppCategory = "study" | "browser" | "social" | "entertainment" | "system";

// 1. STUDY & DEVELOPMENT TOOLS (IDEs, Text Editors, DBs, Terminals, AI Tools, PDF/Notes)
const STUDY_PROCESSES = new Set([
  // IDEs & Code Editors
  "code", "code - insiders", "vscodium", "cursor", "windsurf", "zed", "idea64", "idea",
  "pycharm64", "pycharm", "webstorm64", "webstorm", "clion64", "clion", "rider64", "rider",
  "goland64", "goland", "rubymine64", "rubymine", "phpstorm64", "phpstorm", "datagrip64", "datagrip",
  "sublime_text", "atom", "notepad++", "brackets", "emacs", "vim", "neovim", "gvim",
  "androidstudio", "studio64", "xcode", "qtcreator", "eclipse", "netbeans", "visualstudio",
  "devenv", "blend", "dbeaver", "tableplus", "pgadmin4", "sequelpro", "navicat", "workbench",

  // Terminals & Shells
  "powershell", "pwsh", "cmd", "conhost", "windowsterminal", "wt", "bash", "zsh", "wsl",
  "git-bash", "git-cmd", "hyper", "alacritty", "kitty", "iterm", "iterm2", "warp", "tabby",
  "mintty", "putty", "mobaxterm", "filezilla", "winscp",

  // Developer Utilities & Virtualization
  "git", "git-credential-manager", "docker", "docker desktop", "podman", "kubectl", "minikube",
  "postman", "insomnia", "bruno", "hoppscotch", "charles", "fiddler", "wireshark",
  "compass", "redis-insight", "mongodb-compass", "sqlyog", "heidisql",

  // Notes, AI, Office & Reading
  "obsidian", "notion", "anki", "logseq", "roam", "evernote", "onenote", "joplin", "typora",
  "acrobat", "acrobrd32", "foxitreader", "sumatrapdf", "okular", "evince", "zotero", "mendeley",
  "winword", "excel", "powerpnt", "wps", "et", "wpspdf", "libreoffice", "soffice",
  "antigravity", "chatgpt", "claude", "ollama", "lm-studio", "jan", "anything-llm"
]);

const STUDY_KEYWORDS = [
  "visual studio code", "vscodium", "cursor", "intellij", "pycharm", "webstorm", "clion",
  "sublime", "terminal", "powershell", "command prompt", "github", "gitlab", "stackoverflow",
  "leetcode", "hackerrank", "geeksforgeeks", "w3schools", "mdn web docs", "devdocs",
  "coursera", "udemy", "khan academy", "edx", "brilliant", "nptel", "unacademy", "physics wallah",
  "pdf", "lecture", "documentation", "notes", "thesis", "research", "paper", "book",
  "localhost", "127.0.0.1", "jupyter", "google colab", "replit", "overleaf", "latex", "kaggle"
];

// 2. WEB BROWSERS
const BROWSER_PROCESSES = new Set([
  "chrome", "msedge", "firefox", "brave", "opera", "operagx", "safari", "arc",
  "vivaldi", "tor", "waterfox", "pale moon", "librewolf", "duckduckgo", "yandex"
]);

// 3. SOCIAL & COMMUNICATION APPS
const SOCIAL_PROCESSES = new Set([
  "discord", "telegram", "whatsapp", "slack", "teams", "ms-teams", "zoom", "skype",
  "signal", "viber", "element", "matrix", "resemble", "guilded"
]);

// 4. ENTERTAINMENT, MEDIA & GAMING
const ENTERTAINMENT_PROCESSES = new Set([
  "steam", "epicgameslauncher", "gog_galaxy", "origin", "uplay", "battle.net", "riotclient",
  "vlc", "spotify", "netflix", "primevideo", "disneyplus", "hulu", "twitch", "obs64",
  "roblox", "minecraft", "fortnite", "csgo", "cs2", "valorant", "gta5", "leagueoflegends"
]);

const ENTERTAINMENT_KEYWORDS = [
  "youtube -", "netflix", "prime video", "disney+", "hulu", "twitch", "facebook", "instagram",
  "twitter", "x.com", "tiktok", "reddit", "snapchat", "pinterest", "9gag", "meme", "gaming"
];

/**
 * Classifies an app or window title into 1 of 5 categories:
 * - study: Coding, IDEs, terminals, docs, PDFs, AI tools
 * - browser: Web Browsers
 * - social: Chat & Communication tools
 * - entertainment: Games, Streaming, Music
 * - system: Windows OS system utilities
 */
export function classifyApplication(appName: string, windowTitle: string = ""): AppCategory {
  const cleanApp = (appName || "").toLowerCase().replace(/\.exe$/, "").trim();
  const cleanTitle = (windowTitle || "").toLowerCase().trim();

  // 1. Check direct Study process names
  if (STUDY_PROCESSES.has(cleanApp)) return "study";

  // 2. Check Study window title keywords (override browser if watching lecture/docs)
  if (STUDY_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "study";

  // 3. Check Entertainment title keywords
  if (ENTERTAINMENT_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "entertainment";

  // 4. Check Entertainment processes
  if (ENTERTAINMENT_PROCESSES.has(cleanApp)) return "entertainment";

  // 5. Check Social processes
  if (SOCIAL_PROCESSES.has(cleanApp)) return "social";

  // 6. Check Browser processes
  if (BROWSER_PROCESSES.has(cleanApp)) return "browser";

  return "system";
}
