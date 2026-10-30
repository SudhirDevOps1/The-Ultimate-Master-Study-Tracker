import { describe, it, expect } from "vitest";
import {
  isSystemProtected,
  isValidDomain,
  isRuleScheduleActive,
  matchApp,
  matchWebsite,
  normalizeProcess,
} from "../blockMatch";

describe("Block Match Engine (Part G / F5)", () => {
  describe("System Protection & Normalization", () => {
    it("protects critical operating system processes", () => {
      expect(isSystemProtected("explorer.exe")).toBe(true);
      expect(isSystemProtected("explorer")).toBe(true);
      expect(isSystemProtected("dwm.exe")).toBe(true);
      expect(isSystemProtected("svchost.exe")).toBe(true);
      expect(isSystemProtected("electron.exe")).toBe(true);
      expect(isSystemProtected("FlowTrackPro.exe")).toBe(true);
      expect(isSystemProtected("whatsapp.exe")).toBe(false);
      expect(isSystemProtected("discord.exe")).toBe(false);
    });

    it("normalizes process names correctly", () => {
      expect(normalizeProcess("Discord.EXE")).toBe("discord");
      expect(normalizeProcess("  Chrome.exe  ")).toBe("chrome");
      expect(normalizeProcess("whatsapp")).toBe("whatsapp");
    });
  });

  describe("Schedule Enforcement (B13)", () => {
    it("handles 'always' schedule", () => {
      expect(isRuleScheduleActive({ schedule: "always", blocked: true })).toBe(true);
      expect(isRuleScheduleActive({ schedule: "always", blocked: false })).toBe(false);
    });

    it("handles 'study_hours' schedule based on focus session", () => {
      expect(isRuleScheduleActive({ schedule: "study_hours", blocked: true }, new Date(), true)).toBe(true);
      expect(isRuleScheduleActive({ schedule: "study_hours", blocked: true }, new Date(), false)).toBe(false);
    });

    it("handles 'custom' daytime schedule window", () => {
      const at10am = new Date("2026-10-30T10:00:00");
      const at6pm = new Date("2026-10-30T18:00:00");
      const rule = {
        schedule: "custom",
        customStartTime: "09:00",
        customEndTime: "17:00",
        blocked: true,
      };

      expect(isRuleScheduleActive(rule, at10am)).toBe(true);
      expect(isRuleScheduleActive(rule, at6pm)).toBe(false);
    });

    it("handles 'custom' overnight schedule window", () => {
      const at11pm = new Date("2026-10-30T23:00:00");
      const at2am = new Date("2026-10-30T02:00:00");
      const at2pm = new Date("2026-10-30T14:00:00");
      const overnightRule = {
        schedule: "custom",
        customStartTime: "22:00",
        customEndTime: "04:00",
        blocked: true,
      };

      expect(isRuleScheduleActive(overnightRule, at11pm)).toBe(true);
      expect(isRuleScheduleActive(overnightRule, at2am)).toBe(true);
      expect(isRuleScheduleActive(overnightRule, at2pm)).toBe(false);
    });
  });

  describe("App Rule Matching (B14)", () => {
    it("matches target app process name accurately", () => {
      expect(matchApp("whatsapp.exe", "WhatsApp.exe")).toBe(true);
      expect(matchApp("whatsapp", "whatsapp.exe")).toBe(true);
      expect(matchApp("slack", "slack-helper.exe")).toBe(true);
      expect(matchApp("discord.exe", "discord.exe")).toBe(true);
    });

    it("does not match unrelated processes", () => {
      expect(matchApp("whatsapp.exe", "chrome.exe")).toBe(false);
      expect(matchApp("x.com", "explorer.exe")).toBe(false);
      expect(matchApp("code.exe", "idea64.exe")).toBe(false);
    });

    it("refuses to block protected system processes", () => {
      expect(matchApp("explorer.exe", "explorer.exe")).toBe(false);
      expect(matchApp("svchost", "svchost.exe")).toBe(false);
    });
  });

  describe("Website Rule Matching (B14 & B15)", () => {
    it("matches website in browser titles with word boundary", () => {
      expect(
        matchWebsite("youtube.com", "chrome.exe", "Trending Videos - YouTube - Google Chrome")
      ).toBe(true);
      expect(
        matchWebsite("instagram.com", "msedge.exe", "Instagram Feed - Personal - Microsoft Edge")
      ).toBe(true);
      expect(
        matchWebsite("reddit.com", "brave.exe", "Reddit: Dive into anything")
      ).toBe(true);
    });

    it("prevents short token false positives like 'x.com' matching unrelated titles", () => {
      // In old code, 'x.com' split into 'x' and matched any title with an 'x'!
      expect(
        matchWebsite("x.com", "chrome.exe", "Excel Spreadsheets and Tax Reports")
      ).toBe(false);
      expect(
        matchWebsite("x.com", "chrome.exe", "Explore New Features - Google Chrome")
      ).toBe(false);
      // But does match actual x.com tab
      expect(
        matchWebsite("x.com", "chrome.exe", "Home / x.com - Google Chrome")
      ).toBe(true);
    });

    it("ignores website rules if the foreground process is not a browser", () => {
      expect(
        matchWebsite("youtube.com", "notepad.exe", "Notes about youtube video.txt - Notepad")
      ).toBe(false);
    });
  });

  describe("Domain Validation for System Hosts (B9)", () => {
    it("validates legitimate domain names", () => {
      expect(isValidDomain("youtube.com")).toBe(true);
      expect(isValidDomain("web.whatsapp.com")).toBe(true);
      expect(isValidDomain("reddit.com")).toBe(true);
      expect(isValidDomain("store.steampowered.com")).toBe(true);
    });

    it("rejects malicious or invalid strings", () => {
      expect(isValidDomain("")).toBe(false);
      expect(isValidDomain("x")).toBe(false);
      expect(isValidDomain("bad domain.com")).toBe(false);
      expect(isValidDomain("evil.com; rm -rf /")).toBe(false);
      expect(isValidDomain("http://youtube.com")).toBe(false);
      expect(isValidDomain("domain..com")).toBe(false);
    });
  });
});
