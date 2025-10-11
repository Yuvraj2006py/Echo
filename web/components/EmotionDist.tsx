"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipProps } from "recharts";

import { EMOTION_COLORS } from "./emotionColors";

type EmotionSlice = { label: string; pct: number };

function EmotionTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }
  const item = payload[0];
  const color = (item?.payload as { color?: string })?.color ?? "#7C83FD";
  return (
    <div
      className="rounded-xl border border-white/10 bg-[rgba(15,18,28,0.9)] px-3 py-2 text-xs"
      style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
    >
      <div className="flex items-center gap-2 font-medium text-white">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {item.name}
      </div>
      <p className="mt-1 text-[11px] text-slate-200/90">
        {Number(item.value ?? 0).toFixed(1)}%
      </p>
    </div>
  );
}

export function EmotionDist({ data }: { data: EmotionSlice[] }) {
  if (!data.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-sm text-slate-300/70">
        Enter a few reflections to see your emotion mix.
      </div>
    );
  }

  const formattedData = data.map((item, index) => ({
    name: item.label,
    value: Number(item.pct.toFixed(1)),
    color: EMOTION_COLORS[index % EMOTION_COLORS.length]
  }));

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            <Pie
              data={formattedData}
              dataKey="value"
              innerRadius={80}
              outerRadius={110}
              paddingAngle={4}
              labelLine={false}
            >
              {formattedData.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<EmotionTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100/80 md:flex-col md:items-start md:gap-2">
        {formattedData.map((item, index) => (
          <li key={item.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium text-white/90">
              {item.name}:{" "}
              <span className="font-normal text-slate-200/80">{item.value.toFixed(1)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
