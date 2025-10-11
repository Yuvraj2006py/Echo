import type {
  Entry,
  EntryCreateResponse,
  AnalyzeResult,
  InsightsSummary,
  WeeklySummary
} from "../shared-types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

if (!API_BASE) {
  console.warn("NEXT_PUBLIC_API_BASE is not set. API calls will fail.");
}

type FetchOptions = RequestInit & { token?: string };

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  if (!API_BASE) {
    throw new Error("API base URL is not configured.");
  }

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API request failed");
  }

  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}

export interface EntryPayload {
  text: string;
  source?: "mobile" | "web";
  tags?: string[];
}

export function createEntry(payload: EntryPayload, token: string) {
  return apiFetch<EntryCreateResponse>("/entries", {
    method: "POST",
    body: JSON.stringify(payload),
    token
  });
}

export function fetchEntries(token: string, limit = 50) {
  const search = new URLSearchParams({ limit: limit.toString(), offset: "0" });
  return apiFetch<Entry[]>(`/entries?${search.toString()}`, { token });
}

export function fetchEntry(id: string, token: string) {
  return apiFetch<Entry>(`/entries/${id}`, { token });
}

export function analyzeText(text: string, token: string) {
  return apiFetch<AnalyzeResult>("/analyze", {
    method: "POST",
    body: JSON.stringify({ text }),
    token
  });
}

export function fetchInsights(token: string, days = 30) {
  const search = new URLSearchParams({ days: days.toString() });
  return apiFetch<InsightsSummary>(`/insights/summary?${search}`, { token });
}

export type SummaryPeriod = "day" | "week" | "month";

export function fetchSummary(token: string, period: SummaryPeriod = "week") {
  const search = new URLSearchParams({ period });
  return apiFetch<WeeklySummary>(`/summary?${search.toString()}`, { token });
}

export interface TimeBucketMetric {
  message_count?: number;
  avg_sentiment?: number;
}

export interface DailyMetric {
  user_id: string;
  date: string;
  avg_sentiment?: number;
  top_emotion?: string;
  emotion_counts: Record<string, number>;
  message_count: number;
  avg_entry_length?: number;
  time_buckets: Record<string, TimeBucketMetric>;
}

export interface WeeklyMetric {
  user_id: string;
  week_start: string;
  week_end: string;
  avg_sentiment?: number;
  emotion_counts: Record<string, number>;
  message_count: number;
  volatility?: number;
  corr_summary: {
    entry_length_vs_sentiment_pearson?: number | null;
    entry_length_sample_size?: number;
    time_of_day_mean_sentiment?: Record<string, number | null>;
    weekday_mean_sentiment?: Record<string, number | null>;
  };
}

export interface WeeklySummaryRecord {
  id: string;
  user_id?: string | null;
  week_start: string;
  week_end: string;
  metrics: Record<string, unknown>;
  summary_md: string;
  created_at?: string;
}

export interface WeeklySummaryLatestResponse {
  current: WeeklySummaryRecord;
  previous?: WeeklySummaryRecord;
}

export function fetchDailyAnalytics(token: string, start: string, end: string) {
  const search = new URLSearchParams({ start, end });
  return apiFetch<DailyMetric[]>(`/analytics/daily?${search.toString()}`, { token });
}

export function fetchWeeklyAnalytics(token: string, start: string, end: string) {
  const search = new URLSearchParams({ start, end });
  return apiFetch<WeeklyMetric[]>(`/analytics/weekly?${search.toString()}`, { token });
}

export function fetchLatestWeeklySummary(token: string, includePrevious = false) {
  const search = new URLSearchParams();
  if (includePrevious) {
    search.set("include_previous", "true");
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<WeeklySummaryLatestResponse>(`/summary/weekly/latest${suffix}`, { token });
}

export function fetchTriggers(token: string) {
  return apiFetch<any[]>("/triggers", { token });
}

export function saveTrigger(payload: { name: string; words: string[] }, token: string) {
  return apiFetch("/triggers", {
    method: "POST",
    body: JSON.stringify(payload),
    token
  });
}

export function getCopingKit(token: string) {
  return apiFetch<{ actions: string[] }>("/coping/kit", { token });
}

export function saveCopingKit(actions: string[], token: string) {
  return apiFetch<{ actions: string[] }>("/coping/kit", {
    method: "POST",
    body: JSON.stringify({ actions }),
    token
  });
}

export function sendDigestNow(token: string) {
  return apiFetch<{ ok: boolean }>("/digest/send-now", {
    method: "POST",
    token
  });
}

export function getDigestPreference(token: string) {
  return apiFetch<{ enabled: boolean }>("/digest/pref", { token });
}

export function setDigestPreference(enabled: boolean, token: string) {
  return apiFetch<{ enabled: boolean }>("/digest/pref", {
    method: "POST",
    body: JSON.stringify({ enabled }),
    token
  });
}

export function getCalendarAuthorizeUrl(token: string, origin: string) {
  const search = new URLSearchParams();
  if (origin) {
    search.set("origin", origin);
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<{ authorize_url: string }>(`/calendar/oauth/start${suffix}`, { token });
}

export function getCalendarStatus(token: string) {
  return apiFetch<{ connected: boolean }>("/calendar/status", { token });
}

export function disconnectCalendar(token: string) {
  return apiFetch<{ ok: boolean }>("/calendar/disconnect", {
    method: "DELETE",
    token
  });
}
export interface ProfileResponse {
  full_name: string | null;
}

export function fetchProfile(token: string) {
  return apiFetch<ProfileResponse>("/profile", { token });
}

export function saveProfile(token: string, fullName: string) {
  return apiFetch<ProfileResponse>("/profile", {
    method: "POST",
    body: JSON.stringify({ full_name: fullName }),
    token
  });
}
