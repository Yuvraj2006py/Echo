"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import type { SummaryPeriod } from "../lib/api";

type Props = {
  summary?: string;
  weekStart?: string;
  timeframe?: SummaryPeriod;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
};

function formatWindowLabel(weekStart?: string, timeframe: SummaryPeriod = "week") {
  if (!weekStart) return null;
  const date = new Date(weekStart);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (timeframe === "day") {
    return `Today • ${date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    })}`;
  }
  if (timeframe === "month") {
    return `Month of ${date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  }
  return `Week of ${date.toLocaleDateString()}`;
}

export function WeeklySummaryCard({
  summary,
  weekStart,
  timeframe = "week",
  refreshing,
  onRefresh,
  className
}: Props) {
  const summaryLines = React.useMemo(
    () => (summary ? summary.split("\n").map((line) => line.trim()).filter(Boolean) : []),
    [summary]
  );

  const windowLabel = formatWindowLabel(weekStart, timeframe);

  return (
    <Card className={cn("relative overflow-hidden h-full", className)}>
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-echoBlue/30 blur-[90px]" />
        <div className="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-echoLavender/28 blur-[110px]" />
      </div>
      <CardHeader className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-xl text-white">Echo insights</CardTitle>
          {windowLabel && (
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-echoLavender/60">{windowLabel}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="border-white/20 bg-white/10 text-white hover:text-white"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="relative flex flex-col justify-between gap-4 pt-0">
        {summaryLines.length ? (
          <ul className="space-y-2 text-sm text-slate-200/85">
            {summaryLines.map((line) => {
              const [heading, detail] = line.includes("•")
                ? line.split("•").map((part) => part.trim())
                : [undefined, line];
              return (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-echoLavender/70" />
                  <span className="leading-relaxed">
                    {heading ? (
                      <>
                        <span className="font-medium text-white">{heading}</span>
                        {detail ? ` — ${detail}` : null}
                      </>
                    ) : (
                      line
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-slate-200/80">
            Summaries unlock after capturing a few reflections. Keep journaling to let Echo glow with insights.
          </p>
        )}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-echoLavender/80 shadow-[0_0_18px_rgba(124,131,253,0.2)]">
          Echo surfaces small wins, energy shifts, and rituals you can carry into your next {timeframe}.
        </div>
      </CardContent>
    </Card>
  );
}
