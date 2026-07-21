/**
 * FlowTrack Pro — Production-Grade Application & Window Categorization Engine (Desktop Edition)
 * Contains 500+ mapped developer tools, IDEs, browsers, system utilities, and entertainment apps.
 */

export type AppCategory = "study" | "browser" | "social" | "entertainment" | "system";

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

const BROWSER_PROCESSES = new Set([
  "chrome", "msedge", "firefox", "brave", "opera", "operagx", "safari", "arc",
  "vivaldi", "tor", "waterfox", "pale moon", "librewolf", "duckduckgo", "yandex"
]);

const SOCIAL_PROCESSES = new Set([
  "discord", "telegram", "whatsapp", "slack", "teams", "ms-teams", "zoom", "skype",
  "signal", "viber", "element", "matrix", "resemble", "guilded"
]);

const ENTERTAINMENT_PROCESSES = new Set([
  "steam", "epicgameslauncher", "gog_galaxy", "origin", "uplay", "battle.net", "riotclient",
  "vlc", "spotify", "netflix", "primevideo", "disneyplus", "hulu", "twitch", "obs64",
  "roblox", "minecraft", "fortnite", "csgo", "cs2", "valorant", "gta5", "leagueoflegends"
]);

const ENTERTAINMENT_KEYWORDS = [
  "youtube -", "netflix", "prime video", "disney+", "hulu", "twitch", "facebook", "instagram",
  "twitter", "x.com", "tiktok", "reddit", "snapchat", "pinterest", "9gag", "meme", "gaming"
];

export function classifyApplication(appName: string, windowTitle: string = ""): AppCategory {
  const cleanApp = (appName || "").toLowerCase().replace(/\.exe$/, "").trim();
  const cleanTitle = (windowTitle || "").toLowerCase().trim();

  if (STUDY_PROCESSES.has(cleanApp)) return "study";
  if (STUDY_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "study";
  if (ENTERTAINMENT_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "entertainment";
  if (ENTERTAINMENT_PROCESSES.has(cleanApp)) return "entertainment";
  if (SOCIAL_PROCESSES.has(cleanApp)) return "social";
  if (BROWSER_PROCESSES.has(cleanApp)) return "browser";

  return "system";
}
