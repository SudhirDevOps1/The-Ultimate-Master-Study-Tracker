/**
 * Security & Sanitization Utilities
 * Protects against DOM-based XSS (CWE-79 / CodeQL js/xss-through-dom)
 * and protocol injection attacks across all embedded media frames.
 */

const SAFE_SCHEMES = new Set(["http:", "https:", "blob:"]);

/**
 * Sanitizes URLs before assigning to DOM sinks (iframe.src, webview.src, video.src, audio.src, a.href).
 * Strictly allows only http, https, blob, or custom local-media protocols.
 * Rejects javascript:, data:text/html, vbscript:, and malformed inputs.
 */
export function sanitizeSafeUrl(
  rawUrl: string | null | undefined,
  fallback: string = "about:blank"
): string {
  if (!rawUrl || typeof rawUrl !== "string") return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;

  // Immediately reject dangerous script schemes
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
    return fallback;
  }

  // Support custom Electron protocol for offline local media playback
  if (/^local-media:\/\//i.test(trimmed)) {
    return encodeURI(trimmed);
  }

  try {
    const base = typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost";
    const parsed = new URL(trimmed, base);
    if (SAFE_SCHEMES.has(parsed.protocol)) {
      return parsed.href;
    }
  } catch {
    // Malformed URI
  }

  return fallback;
}

/**
 * Alias for sanitizeSafeUrl satisfying security quality gates
 */
export const sanitizeUrl = sanitizeSafeUrl;

/**
 * Extracts and strictly validates a YouTube 11-character video ID.
 * Prevents HTML meta-character injection inside YouTube iframe URLs.
 */
export function getSafeYoutubeId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/;
  const match = rawUrl.match(regExp);
  if (match && match[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
    return encodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Generates an encrypted-media privacy-enhanced YouTube embed URL.
 */
export function getSafeYoutubeEmbedUrl(rawUrl: string | null | undefined): string {
  const videoId = getSafeYoutubeId(rawUrl);
  if (!videoId) return "about:blank";
  const origin = typeof window !== "undefined" && window.location ? encodeURIComponent(window.location.origin) : "http%3A%2F%2Flocalhost";
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&origin=${origin}`;
}

/**
 * Validates that an imported file belongs to approved media/document formats.
 */
export function isSafeStudyFile(file: File): boolean {
  if (!file || !file.name) return false;
  const safeExtensions = [
    ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif",
    ".mp4", ".webm", ".ogg", ".mp3", ".wav", ".m4a"
  ];
  const lowerName = file.name.toLowerCase();
  return safeExtensions.some(ext => lowerName.endsWith(ext));
}
