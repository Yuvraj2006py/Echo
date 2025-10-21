"use client";

import * as React from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Keyword = {
  term: string;
  count: number;
  avg_sentiment: number;
};

type Props = {
  keywords?: Keyword[];
};

type BubblePoint = {
  term: string;
  frequency: number;
  sentiment: number;
  size: number;
};

function bubbleColor(sentiment: number) {
  const clamped = Math.max(-1, Math.min(1, sentiment));
  if (clamped >= 0) {
    const alpha = 0.4 + clamped * 0.4;
    return `rgba(56, 189, 248, ${alpha})`;
  }
  const alpha = 0.4 + Math.abs(clamped) * 0.4;
  return `rgba(248, 113, 113, ${alpha})`;
}

export function WordSentimentMap({ keywords }: Props) {
  const data =
    keywords?.map((item) => ({
      term: item.term,
      frequency: item.count,
      sentiment: item.avg_sentiment,
      size: Math.max(40, Math.min(item.count * 20, 200))
    })) ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Word sentiment map</CardTitle>
        <p className="text-xs text-slate-300/70">
          Bubble size = frequency, color = sentiment tone.
        </p>
      </CardHeader>
      <CardContent className="h-80">
        {data.length === 0 ? (
          <p className="text-sm text-slate-300/70">
            Echo needs a few more reflections with keywords to build the sentiment map.
          </p>
        ) : (
          <ResponsiveContainer>
            <ScatterChart margin={{ left: 24, right: 24, top: 24, bottom: 24 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis
                type="number"
                dataKey="frequency"
                name="Frequency"
                stroke="#CBD5F5"
                tickFormatter={(value) => `${value}x`}
              />
              <YAxis
                type="number"
                dataKey="sentiment"
                name="Sentiment"
                domain={[-1, 1]}
                stroke="#CBD5F5"
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <ZAxis type="number" dataKey="size" range={[40, 200]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const point = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white">
                      <p className="text-sm font-semibold">{point.term}</p>
                      <p>Mentions: {point.frequency}</p>
                      <p>Avg sentiment: {(point.sentiment * 100).toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
              <Scatter
                data={data}
                shape={(props: { cx?: number; cy?: number; size?: number; payload?: BubblePoint }) => {
                  const { cx, cy, size, payload } = props;
                  if (typeof cx !== "number" || typeof cy !== "number") {
                    return <g />;
                  }
                  if (!payload) {
                    return <g />;
                  }
                  const radius = Math.sqrt(size ?? 40);
                  return (
                    <g>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={bubbleColor(payload.sentiment)}
                        stroke="rgba(255,255,255,0.2)"
                      />
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-white text-xs font-semibold"
                      >
                        {payload.term}
                      </text>
                    </g>
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
