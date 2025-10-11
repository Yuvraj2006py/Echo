"use client";

import * as React from "react";
import { format, parseISO, subDays } from "date-fns";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

type Props = {
  start: Date;
  end: Date;
  onChange: (range: { start: Date; end: Date }) => void;
  className?: string;
};

const QUICK_RANGES = [
  { label: "30 days", days: 29 },
  { label: "90 days", days: 89 },
  { label: "180 days", days: 179 }
] as const;

function toInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function clampEnd(start: Date, end: Date) {
  if (end < start) {
    return start;
  }
  return end;
}

export function AnalyticsDateRangePicker({ start, end, onChange, className }: Props) {
  const handleStartChange = (value: string) => {
    const nextStart = parseISO(value);
    onChange({ start: nextStart, end: clampEnd(nextStart, end) });
  };

  const handleEndChange = (value: string) => {
    const nextEnd = parseISO(value);
    onChange({ start, end: clampEnd(start, nextEnd) });
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-200 sm:flex-row sm:items-end sm:justify-between sm:text-sm",
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] uppercase tracking-[0.3em] text-echoLavender/60">
            Start
          </label>
          <input
            type="date"
            value={toInputValue(start)}
            max={toInputValue(end)}
            onChange={(event) => handleStartChange(event.target.value)}
            className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-echoLavender"
          />
        </div>
        <div className="flex flex-col gap-1 sm:ml-4">
          <label className="text-[11px] uppercase tracking-[0.3em] text-echoLavender/60">
            End
          </label>
          <input
            type="date"
            value={toInputValue(end)}
            min={toInputValue(start)}
            onChange={(event) => handleEndChange(event.target.value)}
            className="rounded-lg bg-black/40 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-echoLavender"
          />
        </div>
      </div>
      <div className="flex gap-2">
        {QUICK_RANGES.map((range) => (
          <Button
            key={range.label}
            variant="outline"
            size="sm"
            className="border-white/10 bg-transparent text-xs text-slate-200 hover:bg-white/10"
            onClick={() =>
              onChange({
                start: subDays(end, range.days),
                end
              })
            }
          >
            Last {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

