"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchEntries, fetchProfile } from "../../lib/api";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import type { Entry } from "../../shared-types";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { EntryEmotionPie } from "../../components/EntryEmotionPie";
import { rememberUserName, resolveUserName } from "../../lib/user-display";

export default function EntriesPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [token, setToken] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);
  const emailRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (!data.session) {
        setToken(null);
        setUserName(null);
        emailRef.current = null;
        router.replace("/login");
        return;
      }
      setToken(data.session.access_token);
      emailRef.current = data.session.user?.email ?? null;
      setUserName(resolveUserName(data.session));
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      if (!session) {
        setToken(null);
        setUserName(null);
        emailRef.current = null;
        router.replace("/login");
        return;
      }
      setToken(session.access_token);
      emailRef.current = session.user?.email ?? null;
      setUserName(resolveUserName(session));
    });
    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  useQuery({
    queryKey: ["profile", token],
    queryFn: () => fetchProfile(token!),
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5,
    onSuccess: (data) => {
      const fetchedName = data.full_name?.trim();
      if (!fetchedName) {
        return;
      }
      setUserName((previous) => (previous === fetchedName ? previous : fetchedName));
      rememberUserName(emailRef.current, fetchedName);
    }
  });

  const entriesQuery = useQuery({
    queryKey: ["entries", token],
    queryFn: () => fetchEntries(token!, 100),
    enabled: Boolean(token),
  });

  const entries: Entry[] = entriesQuery.data ?? [];

  return (
    <main className="space-y-10 pb-16">
      <section className="space-y-6 rounded-[28px] border border-white/10 bg-white/5 p-8 text-white shadow-[0_0_40px_rgba(124,131,253,0.24)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
              Entries
            </Badge>
            <h1 className="text-3xl font-semibold drop-shadow-[0_0_18px_rgba(124,131,253,0.45)]">
              Your reflections{userName ? `, ${userName}` : ""}
            </h1>
            <p className="max-w-xl text-sm text-slate-200/80">
              Every journal entry you log appears here with its captured emotions. Select an entry to
              revisit the full reflection or log a new note to keep Echo tuned to your day.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="lg" className="shadow-glow">
              <Link href="/entries/new">New entry</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-white hover:text-white/80">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent reflections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entriesQuery.isLoading ? (
              <p className="text-sm text-slate-300/80">Loading your reflections...</p>
            ) : entries.length === 0 ? (
              <div className="space-y-3 text-sm text-slate-300/80">
                <p>You haven&apos;t logged any reflections yet.</p>
                <Button asChild size="sm">
                  <Link href="/entries/new">Write your first entry</Link>
                </Button>
              </div>
            ) : (
              entries.map((entry) => {
                const createdAt = new Date(entry.created_at).toLocaleString();
                return (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_24px_rgba(124,131,253,0.16)] transition hover:border-echoLavender/40 hover:shadow-[0_0_32px_rgba(124,131,253,0.28)]"
                  >
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),240px]">
                      <div className="space-y-3">
                        <div>
                          <h2 className="text-lg font-semibold text-white">
                            {entry.top_emotion?.label ?? "Neutral"} &middot; {createdAt}
                          </h2>
                          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-echoLavender/70">
                            Echo&apos;s reflection
                          </p>
                        </div>
                        <p className="line-clamp-3 text-sm leading-relaxed text-slate-200/90">
                          {entry.text}
                        </p>
                        {(entry.tags ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {(entry.tags ?? []).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-xs uppercase tracking-wide text-slate-100/90"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {entry.suggestion && (
                          <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm text-slate-100/90 shadow-[0_0_18px_rgba(124,131,253,0.18)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-echoLavender/70">
                              Echo&apos;s suggestion
                            </p>
                            <p className="mt-2 leading-relaxed text-slate-200/90">{entry.suggestion}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/entries/${entry.id}`}>Open entry</Link>
                          </Button>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200/70">
                          Emotion breakdown
                        </h3>
                        <div className="mt-3">
                          <EntryEmotionPie emotions={entry.emotion_json} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
