"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  fetchEntries,
  fetchInsights,
  fetchSummary,
  fetchDailyAnalytics,
  fetchWeeklyAnalytics,
  fetchLatestWeeklySummary,
  fetchProfile,
  type SummaryPeriod
} from "../../lib/api";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import { EmotionTrendChart } from "../../components/EmotionTrendChart";
import { EmotionDist } from "../../components/EmotionDist";
import { Heatmap } from "../../components/Heatmap";
import { WeeklySummaryCard } from "../../components/WeeklySummaryCard";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import type { Entry } from "../../shared-types";
import { cn } from "../../lib/utils";
import { AnalyticsDateRangePicker } from "../../components/AnalyticsDateRangePicker";
import { WeekOverWeekSection } from "../../components/WeekOverWeekSection";
import { BehavioralCorrelationsSection } from "../../components/BehavioralCorrelationsSection";
import { WordSentimentMap } from "../../components/WordSentimentMap";
import { WeeklySummaryPanel } from "../../components/WeeklySummaryPanel";
import { rememberUserName, resolveUserName } from "../../lib/user-display";

const TAG_SHORTCUTS = ["Calm", "Anxious", "Proud", "Drained", "Grateful", "Frustrated", "Focused"];
const TIMEFRAME_OPTIONS: Array<{ key: SummaryPeriod; label: string; days: number }> = [
  { key: "day", label: "Today", days: 1 },
  { key: "week", label: "This week", days: 7 },
  { key: "month", label: "This month", days: 30 }
];

function formatRelative(date: Date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMinutes) < 60) {
    if (diffMinutes === 0) return "just now";
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    return rtf.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) < 48) {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    return rtf.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  return rtf.format(diffDays, "day");
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const [token, setToken] = React.useState<string | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);
  const emailRef = React.useRef<string | null>(null);
  const [timeframe, setTimeframe] = React.useState<SummaryPeriod>("week");
  const [dateRange, setDateRange] = React.useState(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return { start, end };
  });

  React.useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const session = data.session;
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
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (isMounted) {
          setToken(null);
          setUserName(null);
          emailRef.current = null;
        }
        router.replace("/login");
      } else {
        if (!isMounted) {
          return;
        }
        setToken(session.access_token);
        emailRef.current = session.user?.email ?? null;
        setUserName(resolveUserName(session));
      }
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
    queryFn: () => fetchEntries(token!),
    enabled: Boolean(token)
  });

  const insightsQuery = useQuery({
    queryKey: ["insights", token, timeframe],
    queryFn: () => {
      const option = TIMEFRAME_OPTIONS.find((opt) => opt.key === timeframe)!;
      return fetchInsights(token!, option.days);
    },
    enabled: Boolean(token)
  });

  const summaryQuery = useQuery({
    queryKey: ["summary", token, timeframe],
    queryFn: () => fetchSummary(token!, timeframe),
    enabled: Boolean(token)
  });

  const startIso = format(dateRange.start, "yyyy-MM-dd");
  const endIso = format(dateRange.end, "yyyy-MM-dd");

  const dailyAnalyticsQuery = useQuery({
    queryKey: ["analytics", "daily", token, startIso, endIso],
    queryFn: () => fetchDailyAnalytics(token!, startIso, endIso),
    enabled: Boolean(token)
  });

  const weeklyAnalyticsQuery = useQuery({
    queryKey: ["analytics", "weekly", token, startIso, endIso],
    queryFn: () => fetchWeeklyAnalytics(token!, startIso, endIso),
    enabled: Boolean(token)
  });

  const weeklySummaryLatestQuery = useQuery({
    queryKey: ["summary-latest", token],
    queryFn: () => fetchLatestWeeklySummary(token!, true),
    enabled: Boolean(token)
  });

  const refreshing = summaryQuery.isRefetching || summaryQuery.isLoading;

  const suggestions = React.useMemo(() => {
    if (!entriesQuery.data) return [];
    const option = TIMEFRAME_OPTIONS.find((opt) => opt.key === timeframe)!;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - option.days + 1);
    return entriesQuery.data
      .filter((entry) => new Date(entry.created_at) >= cutoff)
      .slice(0, 3);
  }, [entriesQuery.data, timeframe]);

  const keywordBubbles = React.useMemo(() => {
    const current = weeklySummaryLatestQuery.data?.current;
    const metrics = (current?.metrics as Record<string, unknown>) || {};
    const keywords = metrics?.top_keywords;
    if (!Array.isArray(keywords)) {
      return [];
    }
    return keywords as Array<{ term: string; count: number; avg_sentiment: number }>;
  }, [weeklySummaryLatestQuery.data]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-10 pb-20"
    >
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[rgba(124,131,253,0.18)] via-[rgba(19,22,32,0.82)] to-[rgba(99,105,255,0.28)] p-10 shadow-[0_0_50px_rgba(124,131,253,0.28)] backdrop-blur-3xl">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-[-10%] top-[-20%] h-60 w-60 rounded-full bg-echoLavender/40 blur-[120px]" />
          <div className="absolute right-[-15%] bottom-[-25%] h-72 w-72 rounded-full bg-echoBlue/35 blur-[140px]" />
        </div>
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-5">
            <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
              Dashboard
            </Badge>
            <h1 className="text-3xl font-semibold text-white drop-shadow-[0_0_18px_rgba(124,131,253,0.45)] sm:text-4xl">
              Welcome back{userName ? `, ${userName}` : ""}
            </h1>
            <p className="max-w-xl text-sm text-slate-200/80 sm:text-base">
              Echo keeps an attentive glow on your mood. Capture quick notes and we’ll transform them
              into patterns, highlights, and gentle next steps.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {TAG_SHORTCUTS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-slate-100 shadow-[0_0_16px_rgba(124,131,253,0.25)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-4">
              <Button asChild size="lg" className="shadow-glow">
                <Link href="/entries/new">New entry</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-white hover:text-white/80">
                <Link href="/">Back to landing</Link>
              </Button>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_0_35px_rgba(124,131,253,0.35)]"
          >
            <h2 className="text-sm uppercase tracking-[0.3em] text-echoLavender/70">Quick pulse</h2>
            <div className="mt-4 grid gap-4 text-sm text-slate-200/80">
              <p>
                <span className="text-white">How are you arriving?</span> Tap a tag or jot a few lines and
                Echo will reflect something back instantly.
              </p>
              <p>
                Ready for a deeper check-in? After your next entry, let Echo know whether you want to keep
                chatting or simply log the moment.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-echoLavender/70">
            View insights for
          </p>
          <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {TIMEFRAME_OPTIONS.map((option) => {
              const active = option.key === timeframe;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTimeframe(option.key)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-medium transition",
                    active ? "bg-white text-echoDark shadow" : "text-slate-200/80 hover:text-white"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7"
          >
            <WeeklySummaryCard
              summary={summaryQuery.data?.summary_text}
              weekStart={summaryQuery.data?.week_start}
              timeframe={timeframe}
              refreshing={refreshing}
              onRefresh={() => summaryQuery.refetch()}
              className="h-full"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:col-span-5"
          >
            <Card className="h-full bg-white/5">
              <CardHeader className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-[0.3em] text-echoLavender/60">
                  Echo coach
                </span>
                <CardTitle>Actionable nudges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.length ? (
                  suggestions.map((entry) => {
                    const createdAt = new Date(entry.created_at);
                    return (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 shadow-[0_0_20px_rgba(124,131,253,0.18)]"
                      >
                        <p className="text-sm font-medium text-white leading-relaxed">
                          {entry.suggestion ??
                            "Echo will craft a suggestion once emotions finish analyzing."}
                        </p>
                        <p className="mt-3 text-xs text-echoLavender/80">
                          Focus • {entry.top_emotion?.label ?? "neutral"} &middot; {formatRelative(createdAt)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-300/70">
                    Log a reflection to see Echo&apos;s latest guidance here.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <AnalyticsDateRangePicker start={dateRange.start} end={dateRange.end} onChange={setDateRange} />

      <WeekOverWeekSection
        weeklyMetrics={weeklyAnalyticsQuery.data}
        isLoading={weeklyAnalyticsQuery.isLoading}
      />

      <BehavioralCorrelationsSection
        dailyMetrics={dailyAnalyticsQuery.data}
        weeklyMetrics={weeklyAnalyticsQuery.data}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <WordSentimentMap keywords={keywordBubbles} />
        </div>
        <div className="lg:col-span-6">
          <WeeklySummaryPanel
            summary={weeklySummaryLatestQuery.data}
            isLoading={weeklySummaryLatestQuery.isLoading}
          />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true, amount: 0.2 }}
          className="lg:col-span-7"
        >
          <Card>
            <CardHeader>
              <CardTitle>Emotion trend</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <EmotionTrendChart data={insightsQuery.data?.trend ?? []} />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.55 }}
          viewport={{ once: true, amount: 0.2 }}
          className="lg:col-span-5"
        >
          <Card>
            <CardHeader>
              <CardTitle>Emotion mix</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <EmotionDist data={insightsQuery.data?.top_emotions ?? []} />
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true, amount: 0.3 }}
          className="lg:col-span-12"
        >
          <Card>
            <CardHeader>
              <CardTitle>Timeline heatmap</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Heatmap data={insightsQuery.data?.heatmap ?? []} />
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </motion.main>
  );
}
