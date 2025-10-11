"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type Props = {
  actions: string[];
  onSave: (actions: string[]) => Promise<void>;
};

export function CopingKitCard({ actions, onSave }: Props) {
  const [editMode, setEditMode] = React.useState(false);
  const [draft, setDraft] = React.useState(actions);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDraft(actions);
  }, [actions]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    await onSave(draft.filter(Boolean).slice(0, 3));
    setSaving(false);
    setEditMode(false);
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-25">
        <div className="absolute -right-6 top-8 h-32 w-32 rounded-full bg-echoBlue/30 blur-[90px]" />
      </div>
      <CardHeader className="relative flex flex-row items-center justify-between">
        <CardTitle className="text-white">Coping kit</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditMode((value) => !value)}
          className="border-white/20 bg-white/10 text-white hover:text-white"
        >
          {editMode ? "Cancel" : "Edit"}
        </Button>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {!editMode && (
          <ul className="space-y-3">
            {actions.length === 0 && (
              <li className="rounded-2xl border border-dashed border-white/15 bg-black/10 px-4 py-3 text-sm text-slate-300/80">
                Pin up to three go-to grounding rituals—like “2-minute breath,” “stretch break,” or “call a friend.”
              </li>
            )}
            {actions.map((action, index) => (
              <li
                key={index}
                className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100 shadow-[0_0_16px_rgba(124,131,253,0.2)]"
              >
                {action}
              </li>
            ))}
          </ul>
        )}
        {editMode && (
          <form onSubmit={handleSave} className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Input
                key={index}
                placeholder={`Action ${index + 1}`}
                value={draft[index] ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((prev) => {
                    const next = [...prev];
                    next[index] = value;
                    return next;
                  });
                }}
              />
            ))}
            <Button type="submit" disabled={saving} className="shadow-glow">
              {saving ? "Saving..." : "Save kit"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
