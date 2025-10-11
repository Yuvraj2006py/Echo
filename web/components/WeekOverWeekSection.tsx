"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { WeeklyMetric } from "../lib/api";
import { cn } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const EMOTION_ORDER = ["joy", "calm", "neutral", "sadness", "fear", "anger", "anxiety", "disgust"];
const EMOTION_COLORS: Record<string, string> = {
  joy: "#FBBF24",
  calm: "#60A5FA",
  neutral: "#CBD5F5",
  sadness: "#818CF8",
  fear: "#F97316",
  anger: "#F87171",
  anxiety: "#FCA5A5",
  disgust: "#34D399",
  other: "#9CA3AF"
};

type Props = {
  weeklyMetrics?: WeeklyMetric[];
  isLoading?: boolean;
};

function formatWeekLabel(weekStart: string, weekEnd: string) {
  const startDate = parseISO(weekStart);
  const endDate = parseISO(weekEnd);
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  if (sameMonth) {
    return `${format(startDate, "MMM d")} - ${format(endDate, "d")}`;
  }
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d")}`;
}

function sentimentDelta(current?: number | null, previous?: number | null) {
  if (current == null || previous == null) {
    return null;
  }
  return current - previous;
}

export function WeekOverWeekSection({ weeklyMetrics, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Week-over-week momentum</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300/70">Loading analytics…</p>
        </CardContent>
      </Card>
    );
  }

  if (!weeklyMetrics || weeklyMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Week-over-week momentum</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300/70">
            You&apos;ll unlock week-over-week trends once Echo has at least two full weeks of entries.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...weeklyMetrics].sort((a, b) =>
    a.week_start.localeCompare(b.week_start)
  );
  const latestTwo = sorted.slice(-2);
  const current = latestTwo[latestTwo.length - 1];
  const previous = latestTwo.length > 1 ? latestTwo[0] : null;

  const barData = latestTwo.map((record) => ({
    label: formatWeekLabel(record.week_start, record.week_end),
    sentiment: record.avg_sentiment ?? 0
  }));

  const emotionKeys = Array.from(
    new Set(
      latestTwo.flatMap((record) => Object.keys(record.emotion_counts || {}))
    )
  ).sort((a, b) => {
    const indexA = EMOTION_ORDER.indexOf(a);
    const indexB = EMOTION_ORDER.indexOf(b);
    return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) -
      (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
  });

  const stackedData = latestTwo.map((record) => {
    const total = record.message_count || 1;
    const base: Record<string, number | string> = {
      label: formatWeekLabel(record.week_start, record.week_end)
    };
    emotionKeys.forEach((key) => {
      const count = record.emotion_counts?.[key] ?? 0;
      base[key] = Math.round((count / total) * 1000) / 10; // percentage with 0.1 resolution
    });
    return base;
  });

  const delta = sentimentDelta(current.avg_sentiment, previous?.avg_sentiment);
  const topEmotion =
    current.emotion_counts && Object.keys(current.emotion_counts).length > 0
      ? Object.entries(current.emotion_counts).sort((a, b) => b[1] - a[1])[0][0]
      : "—";

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Week-over-week sentiment</CardTitle>
          {delta != null && (
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-[0.3em]",
                delta >= 0 ? "text-emerald-300" : "text-rose-300"
              )}
            >
              {delta >= 0 ? "+" : ""}
              {(delta * 100).toFixed(1)} pts
            </span>
          )}
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer>
            <BarChart data={barData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#cbd5f5" />
              <YAxis domain={[-1, 1]} stroke="#cbd5f5" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Avg sentiment"]}
              />
              <Bar dataKey="sentiment" fill="#7C83FD" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader>
          <CardTitle>Weekly KPIs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-echoLavender/60">Message count</p>
            <p className="mt-2 text-2xl font-semibold text-white">{current.message_count ?? 0}</p>
            {previous && (
              <p className="text-xs text-slate-300/80">
                {current.message_count >= previous.message_count ? "▲" : "▼"}{" "}
                {Math.abs((current.message_count ?? 0) - (previous.message_count ?? 0))} vs prior week
              </p>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-echoLavender/60">Volatility</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {(current.volatility ?? 0).toFixed(2)}
            </p>
            <p className="text-xs text-slate-300/80">
              Variation in daily sentiment for the current week.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-echoLavender/60">Top emotion</p>
            <p className="mt-2 text-2xl font-semibold capitalize text-white">{topEmotion}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-12">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Emotion distribution by week</CardTitle>
          <p className="text-xs text-slate-300/70">
            Share of entries per dominant emotion (stacked).
          </p>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer>
            <BarChart data={stackedData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#cbd5f5" />
              <YAxis unit="%" stroke="#cbd5f5" />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Legend />
              {emotionKeys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="emotions"
                  fill={EMOTION_COLORS[key] || EMOTION_COLORS.other}
                  radius={key === emotionKeys[emotionKeys.length - 1] ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
