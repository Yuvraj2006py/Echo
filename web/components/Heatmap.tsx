"use client";

import { format, parseISO } from "date-fns";

const emotionColors: Record<string, string> = {
  joy: "linear-gradient(135deg, #FDE68A, #FACC15)",
  happy: "linear-gradient(135deg, #E0E7FF, #C7D2FE)",
  gratitude: "linear-gradient(135deg, #A5F3FC, #34D399)",
  neutral: "linear-gradient(135deg, #CBD5F5, #94A3B8)",
  sadness: "linear-gradient(135deg, #7C83FD, #6366F1)",
  anger: "linear-gradient(135deg, #F472B6, #FB7185)",
  fear: "linear-gradient(135deg, #FCA5A5, #F87171)",
  anxiety: "linear-gradient(135deg, #C084FC, #FDA4AF)",
  disgust: "linear-gradient(135deg, #A855F7, #F472B6)",
  surprise: "linear-gradient(135deg, #67E8F9, #38BDF8)"
};

type HeatmapDatum = {
  date: string;
  dominant_label: string;
};

function groupByWeek(data: HeatmapDatum[]) {
  const buckets: Record<string, HeatmapDatum[]> = {};
  data.forEach((datum) => {
    const date = parseISO(datum.date);
    const weekKey = format(date, "yyyy-'W'II");
    buckets[weekKey] ??= [];
    buckets[weekKey].push(datum);
  });
  return Object.values(buckets).map((group) => group.sort((a, b) => (a.date < b.date ? -1 : 1)));
}

export function Heatmap({ data }: { data: HeatmapDatum[] }) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-sm text-slate-300/70">
        Emotion heatmap unlocks after a week of entries.
      </div>
    );
  }

  const grouped = groupByWeek(data);

  return (
    <div className="grid w-full grid-cols-1 gap-2">
      {grouped.map((week, index) => (
        <div key={index} className="flex gap-2">
          {week.map((item) => (
            <div key={item.date} className="group relative">
              <div
                style={{ background: emotionColors[item.dominant_label] ?? "rgba(148,163,184,0.55)" }}
                className="h-8 w-8 rounded-xl shadow-[0_0_14px_rgba(124,131,253,0.22)] transition-transform duration-200 group-hover:scale-110"
              />
              <span className="pointer-events-none absolute left-1/2 top-1/2 hidden min-w-[160px] -translate-x-1/2 translate-y-3 rounded-2xl border border-white/10 bg-[rgba(15,17,26,0.92)] px-3 py-2 text-xs text-slate-100 shadow-[0_0_18px_rgba(124,131,253,0.28)] group-hover:block">
                <strong className="block text-echoLavender">{format(parseISO(item.date), "MMM d")}</strong>
                <span className="capitalize text-slate-200/80">{item.dominant_label}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
