import { describe, it, expect } from "vitest";
import {
  sanitizeUrl,
  sanitizeSafeUrl,
  getSafeYoutubeId,
  getSafeYoutubeEmbedUrl,
  isSafeStudyFile
} from "../security";

describe("Security & Sanitization Quality Gate Suite", () => {
  // Test 1: DOM XSS javascript: injection prevention
  it("should immediately reject javascript: URI protocol injection and return fallback", () => {
    const malicious = "javascript:alert(document.cookie)";
    expect(sanitizeUrl(malicious)).toBe("about:blank");
    expect(sanitizeSafeUrl(malicious, "https://default.local")).toBe("https://default.local");
  });

  // Test 2: Data URI and VBScript attack vector blocking
  it("should block data:text/html and vbscript: payload schemes", () => {
    const dataPayload = "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==";
    const vbscriptPayload = "vbscript:msgbox(\"owned\")";
    expect(sanitizeUrl(dataPayload)).toBe("about:blank");
    expect(sanitizeUrl(vbscriptPayload)).toBe("about:blank");
  });

  // Test 3: Valid web protocols and local media allowance
  it("should permit legitimate https:// URLs and local-media:// desktop protocol", () => {
    const httpsUrl = "https://www.apnacollege.in/courses";
    const localMediaUrl = "local-media:///C:/StudyNotes/Lecture1.mp4";
    expect(sanitizeUrl(httpsUrl)).toBe(httpsUrl);
    expect(sanitizeUrl(localMediaUrl)).toContain("local-media:///C:/StudyNotes/Lecture1.mp4");
  });

  // Test 4: YouTube ID Extraction and Privacy Embed Verification
  it("should extract strictly 11-char YouTube video ID and construct privacy-enhanced embed URL", () => {
    const standardUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const shortUrl = "https://youtu.be/dQw4w9WgXcQ";
    const invalidUrl = "https://www.youtube.com/watch?v=tooShort";

    expect(getSafeYoutubeId(standardUrl)).toBe("dQw4w9WgXcQ");
    expect(getSafeYoutubeId(shortUrl)).toBe("dQw4w9WgXcQ");
    expect(getSafeYoutubeId(invalidUrl)).toBeNull();

    const embedUrl = getSafeYoutubeEmbedUrl(standardUrl);
    expect(embedUrl).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedUrl).toContain("rel=0");
  });

  // Test 5: Safe Study Document Extension Whitelist Guard
  it("should allow verified study documents and reject hazardous executable files", () => {
    const safePdf = new File(["dummy content"], "Algorithms_Chapter1.pdf", { type: "application/pdf" });
    const safeImage = new File(["dummy png"], "diagram.png", { type: "image/png" });
    const maliciousScript = new File(["malware"], "trojan.exe", { type: "application/x-msdownload" });
    const dangerousBat = new File(["echo off"], "exploit.bat", { type: "application/x-bat" });

    expect(isSafeStudyFile(safePdf)).toBe(true);
    expect(isSafeStudyFile(safeImage)).toBe(true);
    expect(isSafeStudyFile(maliciousScript)).toBe(false);
    expect(isSafeStudyFile(dangerousBat)).toBe(false);
  });

  // Test 6: Null, undefined, and empty string handling
  it("should return fallback cleanly when given null, undefined, or empty values", () => {
    expect(sanitizeUrl(null)).toBe("about:blank");
    expect(sanitizeUrl(undefined)).toBe("about:blank");
    expect(sanitizeUrl("   ")).toBe("about:blank");
    expect(sanitizeUrl("", "custom-fallback")).toBe("custom-fallback");
  });
});
