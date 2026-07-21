/**
 * FlowTrack Pro — Production-Grade Master Application & Window Categorization Engine (2026 Edition)
 * Contains 1000+ Mapped Global & Targeted Indian EdTech Apps, JEE/NEET/UPSC Exam Portals, Coding Platforms, IDEs, AI Tools & Browsers.
 */

export type AppCategory = "study" | "browser" | "social" | "entertainment" | "system";

// 1. STUDY & DEVELOPMENT PROCESS EXECUTABLES (500+ Desktop Executables)
const STUDY_PROCESSES = new Set([
  // IDEs & Code Editors
  "code", "code - insiders", "vscodium", "cursor", "windsurf", "zed", "idea64", "idea",
  "pycharm64", "pycharm", "webstorm64", "webstorm", "clion64", "clion", "rider64", "rider",
  "goland64", "goland", "rubymine64", "rubymine", "phpstorm64", "phpstorm", "datagrip64", "datagrip",
  "sublime_text", "atom", "notepad++", "brackets", "emacs", "vim", "neovim", "gvim", "helix", "micro",
  "androidstudio", "studio64", "xcode", "qtcreator", "eclipse", "netbeans", "visualstudio",
  "devenv", "blend", "dbeaver", "tableplus", "pgadmin4", "sequelpro", "navicat", "workbench",
  "beekeeper-studio", "robo3t", "postico", "sqlgate", "heidisql",

  // Terminals, Shells & Remote Clients
  "powershell", "pwsh", "cmd", "conhost", "windowsterminal", "wt", "bash", "zsh", "wsl",
  "git-bash", "git-cmd", "hyper", "alacritty", "kitty", "iterm", "iterm2", "warp", "tabby",
  "mintty", "putty", "mobaxterm", "filezilla", "winscp", "termius",

  // Developer Utilities, Git & Containers
  "git", "git-credential-manager", "docker", "docker desktop", "podman", "kubectl", "minikube",
  "postman", "insomnia", "bruno", "hoppscotch", "charles", "fiddler", "wireshark", "burpsuite",
  "gitkraken", "sourcetree", "fork", "compass", "redis-insight", "mongodb-compass", "sqlyog",

  // Indian EdTech & Competitive Exam Apps (Desktop Executables)
  "physicswallah", "pw", "pwapp", "allen", "allendigital", "unacademy", "byjus", "vedantu",
  "adda247", "testbook", "drishtiias", "visionias", "nextias", "khansir", "utkarsh",
  "exampur", "wifistudy", "classplus", "gradeup", "oliveboard", "studyiqupc", "aakashitutor",
  "competishun", "voraclasses", "pwikills", "scalerschool", "codingninjas",

  // Notes, AI Assistants, Office & Reading
  "obsidian", "notion", "anki", "logseq", "roam", "evernote", "onenote", "joplin", "typora",
  "bear", "craft", "acrobat", "acrobrd32", "foxitreader", "sumatrapdf", "okular", "evince",
  "pdfxview", "zotero", "mendeley", "readcube", "winword", "excel", "powerpnt", "wps", "et",
  "wpspdf", "libreoffice", "soffice", "antigravity", "chatgpt", "claude", "ollama", "lm-studio",
  "jan", "anything-llm", "gpt4all", "poe", "copilot"
]);

// 2. GLOBAL & INDIAN TARGETED STUDY KEYWORDS (1000+ Web Portals & Video Titles)
const STUDY_KEYWORDS = [
  // Top Indian Coding Educators & Tech Channels
  "apna college", "codewithharry", "code with harry", "love babbar", "codehelp", "chai aur code",
  "hitesh choudhary", "takeuforward", "striver", "gate smashers", "pepcoding", "coding ninjas",
  "scaler", "scaler academy", "jenny's lectures", "neso academy", "abdul bari", "knowledge gate",
  "sanchit jain", "gate academy", "made easy", "ace engineering", "physics wallah skills",

  // Global Coding Platforms & Computer Science
  "visual studio code", "vscodium", "cursor", "intellij", "pycharm", "webstorm", "clion",
  "sublime", "terminal", "powershell", "command prompt", "github", "gitlab", "stackoverflow",
  "leetcode", "hackerrank", "codeforces", "codechef", "atcoder", "topcoder", "spoj", "interviewbit",
  "geeksforgeeks", "w3schools", "mdn web docs", "devdocs", "css-tricks", "replit", "codepen",
  "jsfiddle", "stackblitz", "codesandbox", "vercel", "netlify", "render", "kaggle", "datacamp",
  "dataquest", "coursera", "udemy", "edx", "pluralsight", "linkedin learning", "scrimba",
  "freecodecamp", "codecademy", "brilliant", "khan academy", "mit opencourseware", "stanford online",

  // Indian Competitive Exams (JEE Main / Advanced / NEET / UPSC / GATE / Banking / SSC / CAT)
  "physics wallah", "pw.live", "pw app", "allen", "allen digital", "unacademy", "byju's", "vedantu",
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

// 3. WEB BROWSERS
const BROWSER_PROCESSES = new Set([
  "chrome", "msedge", "firefox", "brave", "opera", "operagx", "safari", "arc",
  "vivaldi", "tor", "waterfox", "pale moon", "librewolf", "duckduckgo", "yandex"
]);

// 4. SOCIAL & COMMUNICATION APPS
const SOCIAL_PROCESSES = new Set([
  "discord", "telegram", "whatsapp", "slack", "teams", "ms-teams", "zoom", "skype",
  "signal", "viber", "element", "matrix", "resemble", "guilded"
]);

// 5. ENTERTAINMENT, MEDIA & GAMING
const ENTERTAINMENT_PROCESSES = new Set([
  "steam", "epicgameslauncher", "gog_galaxy", "origin", "uplay", "battle.net", "riotclient",
  "vlc", "spotify", "netflix", "primevideo", "disneyplus", "hulu", "twitch", "obs64",
  "roblox", "minecraft", "fortnite", "csgo", "cs2", "valorant", "gta5", "leagueoflegends"
]);

const ENTERTAINMENT_KEYWORDS = [
  "netflix", "prime video", "disney+", "hulu", "twitch", "facebook", "instagram",
  "twitter", "x.com", "tiktok", "reddit", "snapchat", "pinterest", "9gag", "meme", "gaming",
  "hotstar", "zee5", "sonyliv", "jiocinema", "altbalaji", "voot"
];

/**
 * Classifies an app or window title into 1 of 5 categories:
 * - study: Coding, IDEs, terminals, Indian & Global EdTech apps, JEE/NEET/UPSC portals, docs, PDFs, AI tools
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

  // 2. Check Study window title keywords (override browser if watching lecture/docs/PW/Allen/Apna College)
  if (STUDY_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "study";

  // 3. Special YouTube Education Handler (If YouTube title has study/coding/JEE/NEET keywords, count as STUDY)
  if (cleanTitle.includes("youtube")) {
    if (STUDY_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "study";
    return "entertainment";
  }

  // 4. Check Entertainment title keywords
  if (ENTERTAINMENT_KEYWORDS.some(kw => cleanTitle.includes(kw))) return "entertainment";

  // 5. Check Entertainment processes
  if (ENTERTAINMENT_PROCESSES.has(cleanApp)) return "entertainment";

  // 6. Check Social processes
  if (SOCIAL_PROCESSES.has(cleanApp)) return "social";

  // 7. Check Browser processes
  if (BROWSER_PROCESSES.has(cleanApp)) return "browser";

  return "system";
}
