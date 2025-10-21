import { getCsrfToken } from "./csrf";
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

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_BASE) {
    throw new Error("API base URL is not configured.");
  }

  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const requiresCsrf = method !== "GET" && method !== "HEAD";
  if (requiresCsrf) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const token = getCsrfToken();
    if (!token) {
      throw new ApiError("Missing CSRF token.", 400);
    }
    headers.set("X-CSRF-Token", token);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(errorText || "API request failed", response.status);
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

export function createEntry(payload: EntryPayload) {
  return apiFetch<EntryCreateResponse>("/entries", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchEntries(limit = 50) {
  const search = new URLSearchParams({ limit: limit.toString(), offset: "0" });
  return apiFetch<Entry[]>(`/entries?${search.toString()}`);
}

export function fetchEntry(id: string) {
  return apiFetch<Entry>(`/entries/${id}`);
}

export function analyzeText(text: string) {
  return apiFetch<AnalyzeResult>("/analyze", {
    method: "POST",
    body: JSON.stringify({ text })
  });
}

export function fetchInsights(days = 30) {
  const search = new URLSearchParams({ days: days.toString() });
  return apiFetch<InsightsSummary>(`/insights/summary?${search}`);
}

export type SummaryPeriod = "day" | "week" | "month";

export function fetchSummary(period: SummaryPeriod = "week") {
  const search = new URLSearchParams({ period });
  return apiFetch<WeeklySummary>(`/summary?${search.toString()}`);
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

export function fetchDailyAnalytics(start: string, end: string) {
  const search = new URLSearchParams({ start, end });
  return apiFetch<DailyMetric[]>(`/analytics/daily?${search.toString()}`);
}

export function fetchWeeklyAnalytics(start: string, end: string) {
  const search = new URLSearchParams({ start, end });
  return apiFetch<WeeklyMetric[]>(`/analytics/weekly?${search.toString()}`);
}

export function fetchLatestWeeklySummary(includePrevious = false) {
  const search = new URLSearchParams();
  if (includePrevious) {
    search.set("include_previous", "true");
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<WeeklySummaryLatestResponse>(`/summary/weekly/latest${suffix}`);
}

export function fetchTriggers() {
  return apiFetch<any[]>("/triggers");
}

export function saveTrigger(payload: { name: string; words: string[] }) {
  return apiFetch("/triggers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getCopingKit() {
  return apiFetch<{ actions: string[] }>("/coping/kit");
}

export function saveCopingKit(actions: string[]) {
  return apiFetch<{ actions: string[] }>("/coping/kit", {
    method: "POST",
    body: JSON.stringify({ actions })
  });
}

export function sendDigestNow() {
  return apiFetch<{ ok: boolean }>("/digest/send-now", {
    method: "POST"
  });
}

export function getDigestPreference() {
  return apiFetch<{ enabled: boolean }>("/digest/pref");
}

export function setDigestPreference(enabled: boolean) {
  return apiFetch<{ enabled: boolean }>("/digest/pref", {
    method: "POST",
    body: JSON.stringify({ enabled })
  });
}

export function getCalendarAuthorizeUrl(origin: string) {
  const search = new URLSearchParams();
  if (origin) {
    search.set("origin", origin);
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<{ authorize_url: string }>(`/calendar/oauth/start${suffix}`);
}

export function getCalendarStatus() {
  return apiFetch<{ connected: boolean }>("/calendar/status");
}

export function disconnectCalendar() {
  return apiFetch<{ ok: boolean }>("/calendar/disconnect", {
    method: "DELETE"
  });
}
export interface ProfileResponse {
  full_name: string | null;
}

export function fetchProfile() {
  return apiFetch<ProfileResponse>("/profile");
}

export function saveProfile(fullName: string) {
  return apiFetch<ProfileResponse>("/profile", {
    method: "POST",
    body: JSON.stringify({ full_name: fullName })
  });
}
