"use client";

import { useState } from "react";
import type { TriggerStat } from "../shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Props = {
  triggers: TriggerStat[];
  onSaveTrigger?: (payload: { name: string; words: string[] }) => Promise<void>;
};

export function TriggersPanel({ triggers, onSaveTrigger }: Props) {
  const [name, setName] = useState("");
  const [words, setWords] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onSaveTrigger) return;
    setSaving(true);
    await onSaveTrigger({
      name,
      words: words
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean)
    });
    setName("");
    setWords("");
    setSaving(false);
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-[-10%] top-[20%] h-40 w-40 rounded-full bg-echoBlue/35 blur-[110px]" />
      </div>
      <CardHeader className="relative">
        <CardTitle className="text-white">Triggers library</CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-5">
        <div className="space-y-3">
          {triggers.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/15 bg-black/10 px-4 py-3 text-sm text-slate-300/80">
              Echo will suggest recurring words after a few more reflections.
            </p>
          )}
          {triggers.map((trigger) => (
            <div
              key={trigger.id ?? trigger.name}
              className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-[0_0_16px_rgba(124,131,253,0.22)]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-base font-semibold text-white">{trigger.name}</h4>
                <span className="text-xs uppercase tracking-wide text-echoLavender/70">
                  {trigger.stats.count} mentions
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.25em] text-echoLavender/60">
                {trigger.words.join(", ")}
              </p>
              {Object.keys(trigger.stats.correlation).length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-slate-200/85">
                  {Object.entries(trigger.stats.correlation).map(([emotion, pct]) => (
                    <li key={emotion}>
                      <span className="capitalize text-white/90">{emotion}</span>:{" "}
                      {pct > 0 ? "+" : ""}
                      {pct}%
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-white/10 p-4">
          <h5 className="text-sm font-semibold text-white/90">Add or rename trigger</h5>
          <Input
            placeholder="Trigger name (e.g. Work pressure)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            placeholder="Comma separated words"
            value={words}
            onChange={(event) => setWords(event.target.value)}
            required
          />
          <Button type="submit" disabled={saving} size="sm" className="shadow-glow">
            {saving ? "Saving..." : "Save trigger"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
