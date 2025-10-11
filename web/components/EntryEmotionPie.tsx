"use client";

import { EMOTION_COLORS } from "./emotionColors";

type EmotionDatum = {
  label: string;
  score: number;
};

const MAX_EMOTIONS = 5;

function formatLabel(label: string) {
  if (!label) return "neutral";
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

export function EntryEmotionPie({ emotions }: { emotions: EmotionDatum[] }) {
  const sorted = emotions
    .filter((item) => typeof item.score === "number" && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_EMOTIONS);

  if (!sorted.length) {
    return (
      <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5 px-4 text-xs text-slate-300/70">
        Emotions populate once Echo finishes the analysis.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((emotion, index) => {
        const percent = Math.round(emotion.score * 100);
        const barWidth = percent === 0 ? 0 : Math.max(percent, 6);
        const color = EMOTION_COLORS[index % EMOTION_COLORS.length];
        return (
          <div key={emotion.label} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-200/90">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="uppercase tracking-wide text-slate-300/80">
                  {formatLabel(emotion.label)}
                </span>
              </div>
              <span className="font-medium text-white">{percent}%</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${barWidth}%`,
                  maxWidth: "100%",
                  background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.12))`
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

