// Shared Notes & Sticky Notes Design Tokens & Types
export interface BoardFrame {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}

export interface BoardConnector {
  id: string;
  from: string;
  to: string;
  label?: string;
  color?: string;
}

export interface StickyNote {
  id: string;
  title?: string;
  text: string;
  color: string;      // Background Color Class
  textColor: string;  // Custom Text Color Class
  font: string;       // Custom Font Class
  date: string;
  time: string;
  subject: string;
  pinned?: boolean;
  image?: string;     // Base64 / URL image attachment
  isBold?: boolean;
  isHighlighted?: boolean;
  // Free canvas layout extensions (optional, backwards-compatible)
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  z?: number;
  locked?: boolean;
  frameId?: string;
}

export interface NotepadDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
  createdAt: string;
  pinned?: boolean;
}

export const NOTE_BACKGROUNDS = [
  { name: "Yellow", class: "bg-yellow-500/15 border-yellow-400/35" },
  { name: "Emerald", class: "bg-emerald-500/15 border-emerald-400/35" },
  { name: "Cyan", class: "bg-cyan-500/15 border-cyan-400/35" },
  { name: "Purple", class: "bg-purple-500/15 border-purple-400/35" },
  { name: "Pink", class: "bg-pink-500/15 border-pink-400/35" },
  { name: "Rose", class: "bg-rose-500/15 border-rose-400/35" },
  { name: "Dark Slate", class: "bg-slate-900/60 border-slate-700/60" }
];

export const NOTE_TEXT_COLORS = [
  { name: "Amber/Gold", class: "text-amber-200" },
  { name: "Mint Green", class: "text-emerald-200" },
  { name: "Aqua Cyan", class: "text-cyan-200" },
  { name: "Lavender", class: "text-purple-200" },
  { name: "Hot Pink", class: "text-pink-200" },
  { name: "Pure White", class: "text-white" },
  { name: "Cool Gray", class: "text-slate-300" }
];

export const NOTE_FONTS = [
  { name: "System Sans", class: "font-sans" },
  { name: "Classic Serif", class: "font-serif" },
  { name: "Developer Mono", class: "font-mono" },
  { name: "Rozha One (Hindi Stylised)", class: "font-[RozhaOne,serif]" },
  { name: "Poppins (Hindi Modern)", class: "font-[Poppins,sans-serif]" },
  { name: "Kurale (Hindi Classic)", class: "font-[Kurale,serif]" },
  { name: "Yatra One (Hindi Retro)", class: "font-[YatraOne,cursive]" }
];
