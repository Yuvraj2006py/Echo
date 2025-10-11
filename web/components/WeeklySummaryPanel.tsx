"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { WeeklySummaryLatestResponse, WeeklySummaryRecord } from "../lib/api";
import { cn } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";

type Props = {
  summary?: WeeklySummaryLatestResponse;
  isLoading?: boolean;
};

type SummaryMetrics = {
  avg_sentiment?: number;
  delta_vs_prev_week?: number | null;
  message_count?: number;
  volatility?: number;
  top_emotion?: string;
  [key: string]: unknown;
};

function extractMetrics(record?: WeeklySummaryRecord): SummaryMetrics {
  if (!record) return {};
  const metrics = record.metrics as SummaryMetrics;
  return metrics || {};
}

function formatPercent(value?: number | null) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function WeeklySummaryPanel({ summary, isLoading }: Props) {
  const [showComparison, setShowComparison] = React.useState(false);
  const current = summary?.current;
  const previous = summary?.previous;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly AI summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300/70">Generating summary…</p>
        </CardContent>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly AI summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300/70">
            Run the weekly analytics workflow to unlock Echo’s narrative summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentMetrics = extractMetrics(current);
  const previousMetrics = extractMetrics(previous);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Weekly AI summary</CardTitle>
          <p className="text-xs text-echoLavender/60">
            Coverage: {current.week_start} → {current.week_end}
          </p>
        </div>
        {previous && (
          <div className="flex items-center gap-2 text-xs text-slate-300/70">
            Compare to prior week
            <Switch checked={showComparison} onCheckedChange={setShowComparison} />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-relaxed text-slate-200/90">
        {showComparison && previous && (
          <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-2">
            <ComparisonStat
              label="Avg sentiment"
              currentDisplay={formatPercent(currentMetrics.avg_sentiment)}
              previousDisplay={formatPercent(previousMetrics.avg_sentiment)}
              currentValue={currentMetrics.avg_sentiment ?? undefined}
              previousValue={previousMetrics.avg_sentiment ?? undefined}
            />
            <ComparisonStat
              label="Entries captured"
              currentDisplay={String(currentMetrics.message_count ?? 0)}
              previousDisplay={String(previousMetrics.message_count ?? 0)}
              currentValue={currentMetrics.message_count ?? undefined}
              previousValue={previousMetrics.message_count ?? undefined}
            />
            <ComparisonStat
              label="Volatility"
              currentDisplay={(currentMetrics.volatility ?? 0).toFixed(2)}
              previousDisplay={(previousMetrics.volatility ?? 0).toFixed(2)}
              currentValue={currentMetrics.volatility ?? undefined}
              previousValue={previousMetrics.volatility ?? undefined}
            />
            <ComparisonStat
              label="Top emotion"
              currentDisplay={String(currentMetrics.top_emotion ?? "—")}
              previousDisplay={String(previousMetrics.top_emotion ?? "—")}
            />
          </div>
        )}

        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="text-xl font-semibold text-white" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-lg font-semibold text-white" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-base font-semibold text-white" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="leading-relaxed text-slate-200/90" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul
                className="ml-4 list-disc space-y-2 text-slate-200/90 marker:text-echoLavender"
                {...props}
              />
            ),
            ol: ({ node, ...props }) => (
              <ol
                className="ml-4 list-decimal space-y-2 text-slate-200/90 marker:text-echoLavender"
                {...props}
              />
            ),
            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
            strong: ({ node, ...props }) => (
              <strong className="text-white font-semibold" {...props} />
            )
          }}
        >
          {current.summary_md}
        </ReactMarkdown>
      </CardContent>
    </Card>
  );
}

type ComparisonStatProps = {
  label: string;
  currentDisplay: string;
  previousDisplay: string;
  currentValue?: number;
  previousValue?: number;
};

function ComparisonStat({ label, currentDisplay, previousDisplay, currentValue, previousValue }: ComparisonStatProps) {
  let delta: string | null = null;

  if (
    typeof currentValue === "number" &&
    typeof previousValue === "number" &&
    !Number.isNaN(currentValue) &&
    !Number.isNaN(previousValue)
  ) {
    const diff = currentValue - previousValue;
    if (diff !== 0) {
      const prefix = diff > 0 ? "+" : "";
      delta = `${prefix}${diff.toFixed(2)}`;
    } else {
      delta = "0.00";
    }
  }

  return (
    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-[0.3em] text-echoLavender/60">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{currentDisplay}</p>
      <p className="text-xs text-slate-400">
        Previous: {previousDisplay}
        {delta ? <span className="ml-2 text-echoLavender/70">({delta})</span> : null}
      </p>
    </div>
  );
}
