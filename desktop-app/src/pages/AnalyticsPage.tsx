import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { AnalyticsCharts } from "@/components/charts/AnalyticsCharts";
import { Panel } from "@/components/common/Panel";
import { Link } from "react-router-dom";
import { 
  Monitor, BarChart3, Flame, Calendar, BookOpen, 
  Download, FileText, Award, ShieldCheck, Zap, 
  TrendingUp, TrendingDown, Layers, Clock, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { SubjectRanking } from "@/components/dashboard/SubjectRanking";
import { DownloadModal } from "@/components/analytics/DownloadModal";
import { StudyReportModal } from "@/components/analytics/StudyReportModal";
import { AppActivityList } from "@/components/analytics/AppActivityList";
import { useAppStore, type AppState } from "@/store/useAppStore";
import { calculateFocusScore } from "@/utils/focusScore";
import { generateMarkdownReview } from "@/utils/reviewGenerator";
import type { StudySession, Subject } from "@/types/models";
import { SubjectHeatmap } from "@/components/analytics/SubjectHeatmap";
import { getRangeMetrics, type ExtendedRange } from "@/utils/analytics";
import { useStreak, useYearHeatmap } from "@/hooks/useStreak";
import { toDurationLabel } from "@/utils/time";

const ranges: { key: ExtendedRange; label: string; icon: string }[] = [
  { key: "last7days", label: "7 Days", icon: "📅" },
  { key: "last30days", label: "30 Days", icon: "📆" },
  { key: "last90days", label: "90 Days", icon: "🗓️" },
  { key: "last6months", label: "6 Months", icon: "📊" },
  { key: "last12months", label: "12 Months", icon: "📈" },
  { key: "alltime", label: "All Time", icon: "♾️" },
];

export function AnalyticsPage() {
  const sessions = useAppStore((state: AppState) => state.sessions);
  const subjects = useAppStore((state: AppState) => state.subjects);
  const theme = useAppStore((state: AppState) => state.theme);

  const [activeTab, setActiveTab] = useState<"overview" | "consistency" | "subjects" | "activity">("overview");
  const [range, setRange] = useState<ExtendedRange>("last30days");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Focus Score breakdown
  const focusScoreBreakdown = useMemo(() => {
    const totalMins = Math.round((sessions?.reduce((sum, s) => sum + (s.actualSeconds || 0), 0) || 0) / 60);
    const completed = (sessions || []).filter(s => s.status === "completed").length;
    const planned = (sessions || []).length;
    return calculateFocusScore({
      studyMinutes: totalMins,
      completedSessions: completed,
      totalPlannedSessions: planned,
      breakAdherenceCount: Math.min(8, Math.floor(totalMins / 30)),
      distractionSeconds: 0,
    });
  }, [sessions]);

  // Range metrics for chart
  const data = useMemo(() => getRangeMetrics(sessions, range), [range, sessions]);

  // Streak & Heatmap hooks
  const streakData = useStreak();
  const yearHeatmap = useYearHeatmap(selectedYear);

  // Available years for heatmap
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    sessions.forEach((s: StudySession) => years.add(new Date(s.startTime).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [sessions]);

  // Subject performance stats
  const subjectStats = useMemo(() => {
    return subjects.map((subject: Subject) => {
      const subjectSessions = sessions.filter((s: StudySession) => s.subjectId === subject.id);
      const totalHours = subjectSessions.reduce((sum: number, s: StudySession) => sum + s.actualSeconds / 3600, 0);
      const totalPlanned = subjectSessions.reduce((sum: number, s: StudySession) => sum + s.plannedMinutes / 60, 0);
      const completion = totalPlanned > 0 ? (totalHours / totalPlanned) * 100 : 0;
      return {
        ...subject,
        totalHours: Number(totalHours.toFixed(1)),
        sessionCount: subjectSessions.length,
        completion: Math.min(100, Number(completion.toFixed(1))),
      };
    }).sort((a: Subject & { totalHours: number }, b: Subject & { totalHours: number }) => b.totalHours - a.totalHours);
  }, [sessions, subjects]);

  const handleDownloadMarkdownReport = () => {
    const md = generateMarkdownReview({
      dateRange: range,
      totalStudySeconds: (sessions || []).reduce((sum, s) => sum + (s.actualSeconds || 0), 0),
      focusScore: focusScoreBreakdown.score,
      completedTasks: [],
      pendingTasks: [],
      subjectsBreakdown: (subjects || []).map(s => ({
        name: s.name,
        seconds: (sessions || []).filter(sess => sess.subjectId === s.id).reduce((sum, sess) => sum + (sess.actualSeconds || 0), 0),
      })),
    });
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowtrack-review-${range}-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getThemeGradient = () => {
    switch (theme) {
      case "ocean": return "from-sky-500 to-teal-400";
      case "forest": return "from-green-500 to-lime-400";
      case "sunset": return "from-orange-500 to-rose-500";
      case "galaxy": return "from-purple-500 to-pink-500";
      case "cyber": return "from-yellow-400 to-rose-500";
      default: return "from-indigo-500 to-cyan-500";
    }
  };

  // Week comparison
  const weekComparison = streakData.currentWeekHours - streakData.lastWeekHours;
  const weekComparisonPct = streakData.lastWeekHours > 0
    ? ((weekComparison / streakData.lastWeekHours) * 100).toFixed(0)
    : "0";

  // Month comparison
  const monthComparison = streakData.currentMonthHours - streakData.lastMonthHours;
  const monthComparisonPct = streakData.lastMonthHours > 0
    ? ((monthComparison / streakData.lastMonthHours) * 100).toFixed(0)
    : "0";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ─── Executive Top Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <BarChart3 className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Study Analytics & Telemetry Hub
            </h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Quantified productivity, transparent focus scores, active streaks, and cognitive workload breakdown.
          </p>
        </div>

        {/* Export Hub Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive PDF</span>
          </button>

          <button
            onClick={() => setIsDownloadModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 px-3.5 py-2 text-xs font-bold text-white transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV/JSON</span>
          </button>

          <button
            onClick={handleDownloadMarkdownReport}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all"
            title="Download clean Markdown summary"
          >
            <span>📝</span>
            <span className="hidden sm:inline">Markdown</span>
          </button>
        </div>
      </div>

      {/* ─── Top Macro KPI Metrics Row ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Study Time</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{streakData.allTimeHours} <span className="text-xs font-normal text-slate-400">hours</span></div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            {weekComparison >= 0 ? (
              <span className="text-emerald-400 font-bold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +{weekComparison.toFixed(1)}h
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center">
                <ArrowDownRight className="w-3 h-3" /> {weekComparison.toFixed(1)}h
              </span>
            )}
            <span>vs previous week</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Focus Score</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
            <span>{focusScoreBreakdown.score}</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              Grade {focusScoreBreakdown.grade}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Verified study & break adherence</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Current Streak</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{streakData.daily} <span className="text-xs font-normal text-slate-400">days</span></div>
          <div className="text-[10px] text-slate-400 mt-1">Personal Best: <strong>{streakData.longestStreak} days</strong></div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Study Velocity</span>
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400">{streakData.avgHoursPerDay} <span className="text-xs font-normal text-slate-400">h / day</span></div>
          <div className="text-[10px] text-slate-400 mt-1">{streakData.totalDaysStudied} active study days logged</div>
        </div>
      </div>

      {/* ─── Navigation Tabs & Range Selector ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-2 rounded-2xl border border-white/10">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === "overview"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview & Trends</span>
          </button>

          <button
            onClick={() => setActiveTab("consistency")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === "consistency"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Consistency & Streaks</span>
          </button>

          <button
            onClick={() => setActiveTab("subjects")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === "subjects"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Subject Deep Work</span>
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              activeTab === "activity"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Activity Telemetry</span>
          </button>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {ranges.map((item) => (
            <button
              key={item.key}
              onClick={() => setRange(item.key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all shrink-0 ${
                range === item.key
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB 1: OVERVIEW & TRENDS ──────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Main Chart Section */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  Study Hours & Cognitive Trends ({ranges.find(r => r.key === range)?.label})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Interactive distribution of verified focus sessions across the selected timeframe.
                </p>
              </div>
            </div>

            <AnalyticsCharts data={data} />
          </Panel>

          {/* Transparent Focus Score Card */}
          <Panel className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-indigo-500/20 shrink-0">
                  {focusScoreBreakdown.grade}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Transparent Focus Score</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                      {focusScoreBreakdown.score} / 100 pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Auditable formula based on verified study duration, session goals, and ergonomic break intervals.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {focusScoreBreakdown.explanation.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-300 flex flex-col justify-center">
                    <span className="font-semibold text-white">{item.split(":")[0]}</span>
                    <span className="text-slate-400 text-[10px]">{item.split(":")[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Period Comparisons */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="!p-0 overflow-hidden">
              <div className={`bg-gradient-to-br ${getThemeGradient()} p-4`}>
                <p className="text-sm font-medium text-white/80">🔥 Current Streak</p>
                <p className="mt-2 text-3xl font-bold text-white">{streakData.daily} days</p>
                <p className="mt-1 text-xs text-white/70">
                  Longest: {streakData.longestStreak} days
                </p>
              </div>
            </Panel>

            <Panel className="!p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-4">
                <p className="text-sm font-medium text-white/80">📅 Weekly Streak</p>
                <p className="mt-2 text-3xl font-bold text-white">{streakData.weekly} weeks</p>
                <p className="mt-1 text-xs text-white/70">
                  {streakData.totalDaysStudied} total days studied
                </p>
              </div>
            </Panel>

            <Panel className="!p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4">
                <p className="text-sm font-medium text-white/80">📆 This Week</p>
                <p className="mt-2 text-3xl font-bold text-white">{streakData.currentWeekHours}h</p>
                <p className={`mt-1 text-xs ${weekComparison >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {weekComparison >= 0 ? "↑" : "↓"} {Math.abs(weekComparison).toFixed(1)}h ({weekComparisonPct}%) vs last week
                </p>
              </div>
            </Panel>

            <Panel className="!p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4">
                <p className="text-sm font-medium text-white/80">📊 This Month</p>
                <p className="mt-2 text-3xl font-bold text-white">{streakData.currentMonthHours}h</p>
                <p className={`mt-1 text-xs ${monthComparison >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {monthComparison >= 0 ? "↑" : "↓"} {Math.abs(monthComparison).toFixed(1)}h ({monthComparisonPct}%) vs last month
                </p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CONSISTENCY & STREAKS ─────────────────────────── */}
      {activeTab === "consistency" && (
        <div className="space-y-5">
          {/* Yearly Activity Heatmap */}
          <Panel>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  {selectedYear} Annual Study Heatmap
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">365-day active study consistency tracker</p>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-[700px]">
                <div className="grid grid-cols-[repeat(53,1fr)] gap-1">
                  {yearHeatmap.map((day: { day: string; minutes: number }, i: number) => (
                    <div
                      key={i}
                      title={`${format(new Date(day.day), 'MMM d, yyyy')}: ${Math.round(day.minutes)} mins`}
                      className={`aspect-square rounded-[2px] transition-all hover:ring-2 hover:ring-cyan-400 ${
                        day.minutes === 0 ? 'bg-white/5' :
                        day.minutes < 60 ? 'bg-cyan-900' :
                        day.minutes < 120 ? 'bg-cyan-700' :
                        day.minutes < 240 ? 'bg-cyan-500' :
                        'bg-cyan-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 text-[10px] text-slate-500 mt-3">
              <span>Less</span>
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-white/5"></span>
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-900"></span>
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-700"></span>
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span>
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-300"></span>
              </div>
              <span>More</span>
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Studied vs Skipped Days Log */}
            <div className="lg:col-span-2">
              {useMemo(() => {
                const dates: string[] = [];
                const dayMap = new Map<string, number>();
                sessions.forEach(s => {
                  if (s.actualSeconds > 0) {
                    const dKey = format(new Date(s.startTime), "yyyy-MM-dd");
                    dayMap.set(dKey, (dayMap.get(dKey) ?? 0) + s.actualSeconds);
                  }
                });

                const studyDates = sessions
                  .filter(s => s.actualSeconds > 0)
                  .map(s => new Date(s.startTime).getTime())
                  .sort((a, b) => a - b);
                  
                const minDate = studyDates.length > 0 ? new Date(studyDates[0]) : new Date();
                minDate.setHours(0,0,0,0);

                const cursor = new Date();
                cursor.setHours(0,0,0,0);
                
                for (let i = 0; i < 30; i++) {
                  if (cursor.getTime() >= minDate.getTime()) {
                    dates.push(format(cursor, "yyyy-MM-dd"));
                  }
                  cursor.setDate(cursor.getDate() - 1);
                }

                const todayStr = format(new Date(), "yyyy-MM-dd");
                const studiedCount = dates.filter(d => dayMap.has(d)).length;
                const skippedCount = dates.filter(d => d !== todayStr && !dayMap.has(d)).length;

                return (
                  <Panel className="space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center justify-between">
                        <span>📅 Active vs Skipped Days</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">Last 30 Days</span>
                      </h3>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="rounded-xl border border-emerald-500/10 bg-emerald-950/20 p-2.5">
                          <p className="font-bold text-emerald-400 text-lg">{studiedCount} Days</p>
                          <p className="text-[10px] text-slate-400">Studied ✅</p>
                        </div>
                        <div className="rounded-xl border border-rose-500/10 bg-rose-950/20 p-2.5">
                          <p className="font-bold text-rose-400 text-lg">{skippedCount} Days</p>
                          <p className="text-[10px] text-slate-400">Missed ❌</p>
                        </div>
                      </div>
                    </div>

                    <div className="pretty-scrollbar max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {dates.map(dateStr => {
                        const isToday = dateStr === todayStr;
                        const hasStudied = dayMap.has(dateStr);
                        const totalSec = dayMap.get(dateStr) ?? 0;
                        const hoursVal = (totalSec / 3600).toFixed(1);
                        const parsedDate = new Date(dateStr + "T12:00:00");

                        let statusBadge = <span className="font-mono font-bold text-rose-400">❌ Missed</span>;
                        let rowClasses = "bg-rose-950/10 border-rose-500/10 text-rose-300";

                        if (hasStudied) {
                          statusBadge = <span className="font-mono font-bold text-emerald-400">✅ {hoursVal}h</span>;
                          rowClasses = "bg-emerald-950/10 border-emerald-500/10 text-emerald-300";
                        } else if (isToday) {
                          statusBadge = <span className="font-mono font-bold text-amber-400">⏳ In Progress</span>;
                          rowClasses = "bg-amber-950/10 border-amber-500/10 text-amber-300";
                        }

                        return (
                          <div 
                            key={dateStr}
                            className={`flex items-center justify-between rounded-xl p-2.5 text-xs border ${rowClasses}`}
                          >
                            <span className="font-medium flex items-center gap-1.5">
                              {format(parsedDate, "EEE, MMM dd, yyyy")}
                              {isToday && (
                                <span className="text-[9px] uppercase font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/25">
                                  Today
                                </span>
                              )}
                            </span>
                            {statusBadge}
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                );
              }, [sessions])}
            </div>

            {/* Personal Bests */}
            <div className="space-y-4">
              <Panel className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  🏆 Personal Bests
                </h3>
                
                <div className="space-y-2.5">
                  <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                    <p className="text-xs text-slate-400">Best Day</p>
                    {streakData.bestDay ? (
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-xl font-bold text-white">{streakData.bestDay.hours.toFixed(1)}h</span>
                        <span className="text-[10px] text-slate-400">{format(new Date(streakData.bestDay.date), "MMM d, yyyy")}</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">No data yet</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                    <p className="text-xs text-slate-400">Best Week</p>
                    {streakData.bestWeek ? (
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-xl font-bold text-white">{streakData.bestWeek.hours.toFixed(1)}h</span>
                        <span className="text-[10px] text-slate-400">Week of {format(new Date(streakData.bestWeek.weekStart), "MMM d")}</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">No data yet</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                    <p className="text-xs text-slate-400">Best Month</p>
                    {streakData.bestMonth ? (
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-xl font-bold text-white">{streakData.bestMonth.hours.toFixed(1)}h</span>
                        <span className="text-[10px] text-slate-400">{format(new Date(streakData.bestMonth.month + "-01"), "MMMM yyyy")}</span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">No data yet</p>
                    )}
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SUBJECT DEEP WORK ──────────────────────────────── */}
      {activeTab === "subjects" && (
        <div className="space-y-5">
          {/* Subject Performance Ranking */}
          <Panel className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Subject Performance Ranking
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Time distribution and focus completion across subjects.</p>
              </div>
            </div>
            
            <SubjectRanking 
              sessions={sessions} 
              subjects={subjects} 
              timeRange={range === "last7days" ? "week" : range === "last30days" || range === "last90days" || range === "last6months" ? "month" : "all"}
            />
          </Panel>

          {/* Detailed Subject Syllabus Breakdown */}
          <Panel className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Syllabus Completion & Target Breakdown
            </h3>
            <div className="space-y-3">
              {subjectStats.map((subject: Subject & { totalHours: number; sessionCount: number; completion: number }, i: number) => {
                const maxHours = Math.max(...subjectStats.map((s: Subject & { totalHours: number }) => s.totalHours), 1);
                const barWidth = (subject.totalHours / maxHours) * 100;

                return (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl bg-white/5 border border-white/5 p-4 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="font-bold text-white text-sm">{subject.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-cyan-400">{subject.totalHours}h</span>
                        <span className="ml-2 text-xs text-slate-400">({subject.sessionCount} sessions)</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <span>{subject.completion}% target completion</span>
                      <span>{((subject.totalHours / Math.max(streakData.allTimeHours, 1)) * 100).toFixed(0)}% of total volume</span>
                    </div>
                  </motion.div>
                );
              })}

              {subjectStats.length === 0 && (
                <div className="rounded-xl bg-white/5 p-8 text-center text-xs text-slate-500">
                  No subjects created yet.
                </div>
              )}
            </div>
          </Panel>

          {/* Subject Heatmap Matrix */}
          <Panel className="space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Multi-Subject Timeline Heatmap
            </h3>
            <div className="overflow-x-auto">
              <SubjectHeatmap />
            </div>
          </Panel>
        </div>
      )}

      {/* ─── TAB 4: ACTIVITY TELEMETRY ─────────────────────────────── */}
      {activeTab === "activity" && (
        <div className="space-y-5">
          {/* Quick link banner to deep App Tracking Suite */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-indigo-950/40 border border-white/10 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Dedicated App & Browser Tracking Suite</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  View detailed 24h Gantt timelines, domain categorizations, and distraction heatmaps in the full tracking suite.
                </p>
              </div>
            </div>
            <Link
              to="/app-tracking"
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shrink-0"
            >
              Open App Tracking →
            </Link>
          </div>

          {/* App & Browser Active Windows Tracking Breakdown */}
          <AppActivityList />
        </div>
      )}

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        sessions={sessions}
        subjects={subjects}
      />

      {/* PDF Executive Study Report Modal */}
      <StudyReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
      />
    </div>
  );
}
