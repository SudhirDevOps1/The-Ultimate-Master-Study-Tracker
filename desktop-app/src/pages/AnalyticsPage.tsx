import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { AnalyticsCharts } from "@/components/charts/AnalyticsCharts";
import { Panel } from "@/components/common/Panel";
import { StudyReport } from "@/components/analytics/StudyReport";
import { AppActivityList } from "@/components/analytics/AppActivityList";
import { SubjectRanking } from "@/components/dashboard/SubjectRanking";
import { DownloadModal } from "@/components/analytics/DownloadModal";
import { useAppStore, type AppState } from "@/store/useAppStore";
import type { StudySession, Subject } from "@/types/models";
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
  const [range, setRange] = useState<ExtendedRange>("last30days");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const data = useMemo(() => getRangeMetrics(sessions, range), [range, sessions]);
  const streakData = useStreak();
  const yearHeatmap = useYearHeatmap(selectedYear);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    sessions.forEach((s: StudySession) => years.add(new Date(s.startTime).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [sessions]);

  // Subject stats
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
    : "∞";

  // Month comparison
  const monthComparison = streakData.currentMonthHours - streakData.lastMonthHours;
  const monthComparisonPct = streakData.lastMonthHours > 0
    ? ((monthComparison / streakData.lastMonthHours) * 100).toFixed(0)
    : "∞";

  return (
    <div className="space-y-5">
      {/* Header */}
      <Panel>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">📊 Analytics</p>
            <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">Study Analytics Dashboard</h2>
            <p className="mt-1 text-sm text-slate-400">
              Track your progress over time • View streaks • Compare periods
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDownloadModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-blue-400 transition-all"
          >
            <span>📥</span> Download Report
          </motion.button>
        </div>

        {/* Range Selector */}
        <div className="mt-4 flex flex-wrap gap-2">
          {ranges.map((item) => (
            <motion.button
              key={item.key}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRange(item.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${range === item.key
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </motion.button>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Charts and Heatmap */}
        <div className="lg:col-span-2 space-y-5">
          <AnalyticsCharts data={data} />

          <Panel>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Yearly Activity Heatmap</h3>
              <select
                value={selectedYear}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedYear(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-white"
              >
                {availableYears.map((y: number) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-[700px]">
                {/* Heatmap implementation... (omitted for brevity in replacement) */}
                <div className="grid grid-cols-[repeat(53,1fr)] gap-1">
                  {yearHeatmap.map((day: { day: string; minutes: number }, i: number) => (
                    <div
                      key={i}
                      title={`${format(new Date(day.day), 'MMM d, yyyy')}: ${Math.round(day.minutes)} mins`}
                      className={`aspect-square rounded-[2px] ${day.minutes === 0 ? 'bg-white/5' :
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
          </Panel>
        </div>

        {/* Right Column: Insights & Summaries */}
        <div className="space-y-5">
          {/* Studied vs Skipped Days Log */}
          {(() => {
            // Find all dates from start date (first session or 30 days ago) to today
            const dates: string[] = [];
            const dayMap = new Map<string, number>();
            sessions.forEach(s => {
              if (s.actualSeconds > 0) {
                const dKey = format(new Date(s.startTime), "yyyy-MM-dd");
                dayMap.set(dKey, (dayMap.get(dKey) ?? 0) + s.actualSeconds);
              }
            });

            // Find first study session date
            const studyDates = sessions
              .filter(s => s.actualSeconds > 0)
              .map(s => new Date(s.startTime).getTime())
              .sort((a, b) => a - b);
              
            const minDate = studyDates.length > 0 ? new Date(studyDates[0]) : new Date();
            minDate.setHours(0,0,0,0);

            // Generate dates starting from first study session up to today (max 30 days)
            const cursor = new Date();
            cursor.setHours(0,0,0,0);
            
            for (let i = 0; i < 30; i++) {
              if (cursor.getTime() >= minDate.getTime()) {
                dates.push(format(cursor, "yyyy-MM-dd"));
              }
              cursor.setDate(cursor.getDate() - 1);
            }

            const studiedCount = dates.filter(d => dayMap.has(d)).length;
            const skippedCount = dates.length - studiedCount;

            return (
              <Panel className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center justify-between">
                    <span>📅 Active vs Skipped Days</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">Last 30 Days</span>
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-xl border border-emerald-500/10 bg-emerald-950/5 p-2">
                      <p className="font-bold text-emerald-400">{studiedCount} Days</p>
                      <p className="text-[10px] text-slate-500">Studied ✅</p>
                    </div>
                    <div className="rounded-xl border border-rose-500/10 bg-rose-950/5 p-2">
                      <p className="font-bold text-rose-400">{skippedCount} Days</p>
                      <p className="text-[10px] text-slate-500">Missed ❌</p>
                    </div>
                  </div>
                </div>

                <div className="pretty-scrollbar max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {dates.map(dateStr => {
                    const hasStudied = dayMap.has(dateStr);
                    const totalSec = dayMap.get(dateStr) ?? 0;
                    const hoursVal = (totalSec / 3600).toFixed(1);
                    const parsedDate = new Date(dateStr + "T12:00:00");

                    return (
                      <div 
                        key={dateStr}
                        className={`flex items-center justify-between rounded-lg p-2 text-xs border ${
                          hasStudied 
                            ? "bg-emerald-950/10 border-emerald-500/10 text-emerald-300"
                            : "bg-rose-950/10 border-rose-500/10 text-rose-300"
                        }`}
                      >
                        <span className="font-medium">{format(parsedDate, "EEE, MMM dd, yyyy")}</span>
                        <span className="font-mono font-bold">
                          {hasStudied ? `✅ ${hoursVal}h` : "❌ Missed"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            );
          })()}

          {/* Quick Stats */}
          <Panel>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                <span className="text-slate-400">Total Study Time</span>
                <span className="text-white font-bold">{streakData.allTimeHours}h</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                <span className="text-slate-400">Current Streak</span>
                <span className="text-emerald-400 font-bold">{streakData.daily} Days</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                <span className="text-slate-400">Avg per Study Day</span>
                <span className="text-cyan-400 font-bold">{streakData.avgHoursPerDay}h</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Subject Performance Ranking */}
      <Panel>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Performance</p>
              <h3 className="text-xl font-semibold text-white">Subject Rankings</h3>
            </div>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as ExtendedRange)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              {ranges.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
          </div>
          <SubjectRanking 
            sessions={sessions} 
            subjects={subjects} 
            timeRange={range === "last7days" ? "week" : range === "last30days" || range === "last90days" || range === "last6months" ? "month" : "all"}
          />
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current Streaks */}
        <Panel className="!p-0 overflow-hidden">
          <div className={`bg-gradient-to-br ${getThemeGradient()} p-4`}>
            <p className="text-sm font-medium text-white/80">🔥 Current Streak</p>
            <p className="mt-2 text-4xl font-bold text-white">{streakData.daily} days</p>
            <p className="mt-1 text-sm text-white/70">
              Longest: {streakData.longestStreak} days
            </p>
          </div>
        </Panel>

        <Panel className="!p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-4">
            <p className="text-sm font-medium text-white/80">📅 Weekly Streak</p>
            <p className="mt-2 text-4xl font-bold text-white">{streakData.weekly} weeks</p>
            <p className="mt-1 text-sm text-white/70">
              {streakData.totalDaysStudied} total days
            </p>
          </div>
        </Panel>

        <Panel className="!p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4">
            <p className="text-sm font-medium text-white/80">📆 This Week</p>
            <p className="mt-2 text-4xl font-bold text-white">{streakData.currentWeekHours}h</p>
            <p className={`mt-1 text-sm ${weekComparison >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
              {weekComparison >= 0 ? "↑" : "↓"} {Math.abs(weekComparison).toFixed(1)}h ({weekComparisonPct}%)
            </p>
          </div>
        </Panel>

        <Panel className="!p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-yellow-500 to-orange-500 p-4">
            <p className="text-sm font-medium text-white/80">📊 This Month</p>
            <p className="mt-2 text-4xl font-bold text-white">{streakData.currentMonthHours}h</p>
            <p className={`mt-1 text-sm ${monthComparison >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
              {monthComparison >= 0 ? "↑" : "↓"} {Math.abs(monthComparison).toFixed(1)}h ({monthComparisonPct}%)
            </p>
          </div>
        </Panel>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel>
          <p className="text-sm text-slate-400">This Year</p>
          <p className="mt-1 text-3xl font-bold text-cyan-400">{streakData.thisYearHours}h</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">All Time</p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">{streakData.allTimeHours}h</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">Avg per Study Day</p>
          <p className="mt-1 text-3xl font-bold text-purple-400">{streakData.avgHoursPerDay}h</p>
        </Panel>
        <Panel>
          <p className="text-sm text-slate-400">Total Study Days</p>
          <p className="mt-1 text-3xl font-bold text-yellow-400">{streakData.totalDaysStudied}</p>
        </Panel>
      </div>

      {/* Best Records */}
      <Panel>
        <h3 className="mb-4 text-lg font-semibold text-white">🏆 Personal Bests</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className={`rounded-xl bg-gradient-to-br ${getThemeGradient()} p-[2px]`}>
            <div className="rounded-xl bg-slate-900/95 p-4">
              <p className="text-sm text-slate-400">Best Day</p>
              {streakData.bestDay ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-white">{streakData.bestDay.hours.toFixed(1)}h</p>
                  <p className="text-xs text-slate-400">{format(new Date(streakData.bestDay.date), "MMM d, yyyy")}</p>
                </>
              ) : (
                <p className="mt-1 text-lg text-slate-500">No data yet</p>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-[2px]">
            <div className="rounded-xl bg-slate-900/95 p-4">
              <p className="text-sm text-slate-400">Best Week</p>
              {streakData.bestWeek ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-white">{streakData.bestWeek.hours.toFixed(1)}h</p>
                  <p className="text-xs text-slate-400">Week of {format(new Date(streakData.bestWeek.weekStart), "MMM d, yyyy")}</p>
                </>
              ) : (
                <p className="mt-1 text-lg text-slate-500">No data yet</p>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
            <div className="rounded-xl bg-slate-900/95 p-4">
              <p className="text-sm text-slate-400">Best Month</p>
              {streakData.bestMonth ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-white">{streakData.bestMonth.hours.toFixed(1)}h</p>
                  <p className="text-xs text-slate-400">{format(new Date(streakData.bestMonth.month + "-01"), "MMMM yyyy")}</p>
                </>
              ) : (
                <p className="mt-1 text-lg text-slate-500">No data yet</p>
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Charts */}
      <Panel>
        <h3 className="mb-4 text-lg font-semibold text-white">
          📈 Study Hours - {ranges.find(r => r.key === range)?.label}
        </h3>
        <AnalyticsCharts data={data} />
      </Panel>

      {/* Year Heatmap */}
      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">🔥 {selectedYear} Study Heatmap</h3>
            <p className="text-sm text-slate-400">Your study activity throughout the year</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedYear(Number(e.target.value))}
            className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none"
          >
            {availableYears.map((year: number) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Month labels */}
            <div className="mb-2 flex">
              <div className="w-8" />
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => (
                <div key={month} className="flex-1 text-center text-xs text-slate-400">{month}</div>
              ))}
            </div>

            {/* Heatmap grid - 7 rows (days of week) x 53 cols (weeks) */}
            <div className="flex flex-col gap-0.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-0.5">
                  <span className="w-8 text-xs text-slate-500">{day}</span>
                  <div className="flex flex-1 gap-0.5">
                    {yearHeatmap
                      .filter((_: { day: string; minutes: number }, i: number) => new Date(yearHeatmap[i].day).getDay() === dayIndex)
                      .map((item: { day: string, minutes: number }, i: number) => (
                        <motion.div
                          key={item.day}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.002 }}
                          title={`${format(new Date(item.day), "MMM d, yyyy")}: ${toDurationLabel(item.minutes)}`}
                          className="aspect-square flex-1 rounded-sm transition-transform hover:scale-150 hover:z-10"
                          style={{
                            backgroundColor: item.minutes === 0
                              ? "rgba(148,163,184,0.1)"
                              : `rgba(34, 211, 238, ${Math.min(1, item.minutes / 180)})`,
                            maxWidth: "16px",
                          }}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="h-3 w-3 rounded-sm bg-white/10" />
            <div className="h-3 w-3 rounded-sm bg-cyan-500/25" />
            <div className="h-3 w-3 rounded-sm bg-cyan-500/50" />
            <div className="h-3 w-3 rounded-sm bg-cyan-500/75" />
            <div className="h-3 w-3 rounded-sm bg-cyan-500" />
          </div>
          <span>More</span>
        </div>
      </Panel>

      {/* Subject Breakdown */}
      <Panel>
        <h3 className="mb-4 text-lg font-semibold text-white">📚 Subject Breakdown</h3>
        <div className="space-y-3">
          {subjectStats.map((subject: Subject & { totalHours: number; sessionCount: number; completion: number }, i: number) => {
            const maxHours = Math.max(...subjectStats.map((s: Subject & { totalHours: number }) => s.totalHours), 1);
            const barWidth = (subject.totalHours / maxHours) * 100;

            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl bg-white/5 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="font-medium text-white">{subject.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-cyan-400">{subject.totalHours}h</span>
                    <span className="ml-2 text-sm text-slate-400">({subject.sessionCount} sessions)</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{subject.completion}% completion</span>
                  <span>{((subject.totalHours / Math.max(streakData.allTimeHours, 1)) * 100).toFixed(0)}% of total</span>
                </div>
              </motion.div>
            );
          })}

          {subjectStats.length === 0 && (
            <div className="rounded-xl bg-white/5 p-6 text-center">
              <p className="text-3xl">📚</p>
              <p className="mt-2 text-sm text-slate-400">No subjects yet</p>
            </div>
          )}
        </div>
      </Panel>

      {/* App & Browser Active Windows Tracking Breakdown */}
      <AppActivityList />

      <StudyReport />

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        sessions={sessions}
        subjects={subjects}
      />
    </div>
  );
}
