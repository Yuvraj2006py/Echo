"use client";

export function EmotionCloud({
  keywords
}: {
  keywords: { word: string; count: number }[];
}) {
  if (!keywords.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 text-sm text-slate-300/70">
        Track more entries to surface your recurring words.
      </div>
    );
  }

  const maxCount = Math.max(...keywords.map((item) => item.count));

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.slice(0, 25).map((keyword) => {
        const weight = maxCount ? keyword.count / maxCount : 0.5;
        const fontSize = 0.85 + weight * 1.1;
        return (
          <span
            key={keyword.word}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-echoLavender/90 shadow-[0_0_12px_rgba(124,131,253,0.2)]"
            style={{ fontSize: `${fontSize}rem` }}
          >
            {keyword.word}
          </span>
        );
      })}
    </div>
  );
}
