"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchEntry, ApiError } from "../../../lib/api";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { EntryEmotionPie } from "../../../components/EntryEmotionPie";

type EntryDetailPageProps = {
  params: { id: string };
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function EntryDetailPage({ params }: EntryDetailPageProps) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["entry", params.id],
    queryFn: () => fetchEntry(params.id),
    enabled: Boolean(params.id),
    retry: false
  });

  React.useEffect(() => {
    const error = query.error;
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      router.replace("/login");
    }
  }, [query.error, router]);

  if (query.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading entry...</p>
      </main>
    );
  }

  if (query.isError || !query.data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-500">We could not load this entry.</p>
        <Button onClick={() => router.push("/dashboard")}>Back to dashboard</Button>
      </main>
    );
  }

  const entry = query.data;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 pb-20 pt-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            {new Date(entry.created_at).toLocaleString()}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Source: {entry.source ?? "web"}</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),260px]">
        <article className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <p className="whitespace-pre-wrap text-slate-700">{entry.text}</p>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {entry.suggestion && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Echo&apos;s suggestion
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{entry.suggestion}</p>
            </div>
          )}
        </article>
        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Emotion breakdown
          </h2>
          <div className="mt-5">
            <EntryEmotionPie emotions={entry.emotion_json} />
          </div>
        </aside>
      </div>
    </main>
  );
}
