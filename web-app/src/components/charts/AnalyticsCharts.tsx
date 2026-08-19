import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsMetric } from "@/types/models";

interface AnalyticsChartsProps {
  data: AnalyticsMetric[];
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0]?.payload;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-md space-y-1">
        <p className="font-bold text-white mb-1.5">{item?.fullLabel || label}</p>
        <p className="text-indigo-300 font-medium">🟣 Planned: <span className="font-mono font-bold text-white">{item?.plannedHours}h</span></p>
        <p className="text-cyan-300 font-medium">🔵 Actual Focus: <span className="font-mono font-bold text-white">{item?.actualHours}h</span></p>
        <p className="text-emerald-300 font-medium">🎯 Completion: <span className="font-mono font-bold text-white">{item?.completionPct}%</span></p>
      </div>
    );
  }
  return null;
};

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0]?.payload;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-md space-y-1">
        <p className="font-bold text-white mb-1.5">{item?.fullLabel || label}</p>
        <p className="text-emerald-300 font-medium">📈 Completion Rate: <span className="font-mono font-bold text-white">{item?.completionPct}%</span></p>
        <p className="text-slate-400">({item?.actualHours}h focus / {item?.plannedHours}h planned)</p>
      </div>
    );
  }
  return null;
};

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-80 rounded-2xl bg-black/20 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-white">📊 Focus Hours (Planned vs Actual)</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="h" />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ paddingBottom: "8px", fontSize: "11px" }}
              />
              <Bar name="Planned (h)" dataKey="plannedHours" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar name="Actual Focus (h)" dataKey="actualHours" fill="#22d3ee" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="h-80 rounded-2xl bg-black/20 p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-white">📈 Completion Rate Trend (%)</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip content={<CustomLineTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ paddingBottom: "8px", fontSize: "11px" }}
              />
              <Line name="Completion (%)" type="monotone" dataKey="completionPct" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#34d399" }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
