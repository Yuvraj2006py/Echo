"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid
} from "recharts";

type TrendDatum = {
  date: string;
  [emotion: string]: number | string;
};

const emotionPalette: Record<string, string> = {
  joy: "#FDE68A",
  happy: "#C7D2FE",
  gratitude: "#A5B4FC",
  neutral: "#64748B",
  sadness: "#7C83FD",
  anger: "#F472B6",
  fear: "#FCA5A5",
  anxiety: "#FDA4AF",
  disgust: "#C084FC",
  surprise: "#67E8F9"
};

const tooltipFormatter = (value: number | string, name: string) => [
  typeof value === "number" ? `${Math.round(value * 100)}%` : value,
  name
];

export function EmotionTrendChart({ data }: { data: TrendDatum[] }) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-sm text-slate-300/70">
        Not enough data yet. Capture a few entries to unlock trends.
      </div>
    );
  }

  const emotionKeys = Object.keys(data[0]).filter((key) => key !== "date");

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(124,131,253,0.12)" strokeDasharray="6 12" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "rgba(199,210,254,0.6)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(value) => `${Math.round((value as number) * 100)}%`}
          tick={{ fill: "rgba(199,210,254,0.65)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={{
            backgroundColor: "rgba(18,20,30,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            color: "#E5E7FF"
          }}
        />
        <Legend
          wrapperStyle={{
            paddingBottom: 14,
            color: "#C7D2FE"
          }}
        />
        {emotionKeys.map((emotion) => (
          <Line
            key={emotion}
            type="monotone"
            dataKey={emotion}
            stroke={emotionPalette[emotion] ?? "#0F172A"}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
