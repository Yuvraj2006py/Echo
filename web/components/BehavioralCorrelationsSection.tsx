"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";
import type { DailyMetric, WeeklyMetric } from "../lib/api";
import { cn } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Props = {
  dailyMetrics?: DailyMetric[];
  weeklyMetrics?: WeeklyMetric[];
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_BUCKETS = ["Night", "Morning", "Afternoon", "Evening"];

function sentimentColor(value: number | null | undefined) {
  if (value == null) return "rgba(255,255,255,0.08)";
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) {
    const alpha = 0.2 + clamped * 0.6;
    return `rgba(16, 185, 129, ${alpha})`;
  }
  const alpha = 0.2 + Math.abs(clamped) * 0.6;
  return `rgba(248, 113, 113, ${alpha})`;
}

function buildHeatmapRows(latest?: WeeklyMetric) {
  if (!latest) return [];
  const corr = latest.corr_summary || {};
  const rows: Array<{ label: string; value: number | null }> = [];
  rows.push({
    label: "Entry length ↔ sentiment (r)",
    value: (corr.entry_length_vs_sentiment_pearson ?? null) as number | null
  });

  const timeMeans = corr.time_of_day_mean_sentiment || {};
  TIME_BUCKETS.forEach((bucket) => {
    if (bucket in timeMeans) {
      rows.push({
        label: `${bucket} avg sentiment`,
        value: timeMeans[bucket] ?? null
      });
    }
  });

  const weekdayMeans = corr.weekday_mean_sentiment || {};
  WEEKDAY_LABELS.forEach((weekday) => {
    if (weekday in weekdayMeans) {
      rows.push({
        label: `${weekday} avg sentiment`,
        value: weekdayMeans[weekday] ?? null
      });
    }
  });
  return rows;
}

function buildScatterData(daily?: DailyMetric[]) {
  return (daily || [])
    .filter((record) => record.avg_entry_length != null && record.avg_sentiment != null)
    .map((record) => ({
      date: record.date,
      entryLength: record.avg_entry_length ?? 0,
      sentiment: record.avg_sentiment ?? 0
    }));
}

function buildCycleHeatmap(daily?: DailyMetric[]) {
  const buckets: Record<string, Record<string, { total: number; count: number }>> = {};
  TIME_BUCKETS.forEach((bucket) => {
    buckets[bucket] = {};
    WEEKDAY_LABELS.forEach((weekday) => {
      buckets[bucket][weekday] = { total: 0, count: 0 };
    });
  });

  (daily || []).forEach((record) => {
    const weekdayIndex = parseISO(record.date).getDay();
    // JS getDay: 0=Sun -> convert to our order
    const weekdayLabel = WEEKDAY_LABELS[(weekdayIndex + 6) % 7];
    const bucketEntries = record.time_buckets || {};
    Object.entries(bucketEntries).forEach(([bucket, metrics]) => {
      const target = buckets[bucket]?.[weekdayLabel];
      if (!target) return;
      if (metrics.avg_sentiment != null) {
        target.total += metrics.avg_sentiment;
        target.count += 1;
      }
    });
  });

  return TIME_BUCKETS.map((bucket) => {
    const row: Record<string, number | string | null> = { bucket };
    WEEKDAY_LABELS.forEach((weekday) => {
      const item = buckets[bucket][weekday];
      row[weekday] = item.count ? item.total / item.count : null;
    });
    return row;
  });
}

export function BehavioralCorrelationsSection({ dailyMetrics, weeklyMetrics }: Props) {
  const latest = weeklyMetrics
    ? [...weeklyMetrics].sort((a, b) => a.week_start.localeCompare(b.week_start)).at(-1)
    : undefined;

  const heatmapRows = buildHeatmapRows(latest);
  const scatterData = buildScatterData(dailyMetrics);
  const cycleHeatmap = buildCycleHeatmap(dailyMetrics);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-6">
        <CardHeader>
          <CardTitle>Behavioral correlations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {heatmapRows.length === 0 ? (
            <p className="text-sm text-slate-300/70">
              Capture a few more reflections to unlock correlation insights.
            </p>
          ) : (
            <div className="grid gap-2">
              {heatmapRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-3 text-sm"
                >
                  <span className="text-slate-200/90">{row.label}</span>
                  <span
                    className="inline-flex min-w-[80px] justify-center rounded-md px-2 py-1 text-xs font-semibold text-slate-900"
                    style={{ backgroundColor: sentimentColor(row.value) }}
                  >
                    {row.value == null ? "—" : row.value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-6">
        <CardHeader>
          <CardTitle>Entry length vs sentiment</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {scatterData.length === 0 ? (
            <p className="text-sm text-slate-300/70">
              Echo needs more daily averages to plot this relationship.
            </p>
          ) : (
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="entryLength" name="Avg entry length" stroke="#CBD5F5" />
                <YAxis
                  dataKey="sentiment"
                  name="Avg sentiment"
                  domain={[-1, 1]}
                  stroke="#CBD5F5"
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                />
                <ZAxis type="number" range={[80, 200]} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const point = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white">
                        <p>{format(parseISO(point.date), "MMM d, yyyy")}</p>
                        <p>Avg entry length: {point.entryLength?.toFixed(1)}</p>
                        <p>Avg sentiment: {(point.sentiment * 100).toFixed(1)}%</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  name="Daily averages"
                  data={scatterData}
                  fill="#7C83FD"
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-12">
        <CardHeader>
          <CardTitle>24-hour sentiment cycle</CardTitle>
        </CardHeader>
        <CardContent>
          {cycleHeatmap.length === 0 ? (
            <p className="text-sm text-slate-300/70">
              Echo needs a few days across each time bucket to render the 24-hour cycle.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm text-slate-200/90">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs uppercase tracking-[0.3em] text-echoLavender/60">
                      Time bucket
                    </th>
                    {WEEKDAY_LABELS.map((weekday) => (
                      <th
                        key={weekday}
                        className="p-2 text-center text-xs uppercase tracking-[0.3em] text-echoLavender/60"
                      >
                        {weekday}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cycleHeatmap.map((row) => (
                    <tr key={row.bucket as string} className="border-t border-white/5">
                      <td className="p-2 font-medium">{row.bucket}</td>
                      {WEEKDAY_LABELS.map((weekday) => {
                        const value = row[weekday] as number | null;
                        return (
                          <td key={weekday} className="p-1 text-center align-middle">
                            <span
                              className="inline-flex min-w-[70px] justify-center rounded-md px-2 py-1 text-xs"
                              style={{ backgroundColor: sentimentColor(value) }}
                            >
                              {value == null ? "—" : `${(value * 100).toFixed(0)}%`}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
