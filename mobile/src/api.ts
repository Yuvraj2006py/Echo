import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  Entry,
  EntryCreateResponse,
  InsightsSummary,
  WeeklySummary
} from "../../shared/types";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
const OFFLINE_QUEUE_KEY = "echo_offline_entries";

type FetchOptions = RequestInit & { token: string };

async function apiFetch<T>(path: string, { token, ...options }: FetchOptions): Promise<T> {
  if (!API_BASE) {
    throw new Error("EXPO_PUBLIC_API_BASE is not configured");
  }

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API request failed");
  }

  return (await response.json()) as T;
}

export async function createEntry(
  payload: { text: string; tags: string[]; source?: "mobile" | "web" },
  token: string
) {
  return apiFetch<EntryCreateResponse>("/entries", {
    method: "POST",
    body: JSON.stringify({ ...payload, source: payload.source ?? "mobile" }),
    token
  });
}

export async function fetchEntries(token: string, limit = 20) {
  const query = new URLSearchParams({ limit: String(limit), offset: "0" });
  return apiFetch<Entry[]>(`/entries?${query.toString()}`, { token });
}

export async function fetchInsights(token: string, days = 30) {
  const query = new URLSearchParams({ days: String(days) });
  return apiFetch<InsightsSummary>(`/insights/summary?${query.toString()}`, { token });
}

export async function fetchWeeklySummary(token: string) {
  return apiFetch<WeeklySummary>("/summary?period=week", { token });
}

export async function storeOfflineEntry(entry: {
  text: string;
  tags: string[];
  createdAt: string;
}) {
  const existingRaw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  const existing = existingRaw ? JSON.parse(existingRaw) : [];
  existing.push(entry);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existing));
}

export async function getOfflineEntries(): Promise<
  { text: string; tags: string[]; createdAt: string }[]
> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearOfflineEntries() {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function syncOfflineEntries(token: string) {
  const queue = await getOfflineEntries();
  if (!queue.length) return [];
  const responses: EntryCreateResponse[] = [];
  for (const item of queue) {
    try {
      const response = await createEntry(
        {
          text: item.text,
          tags: item.tags,
          source: "mobile"
        },
        token
      );
      responses.push(response);
    } catch (error) {
      console.warn("Failed to sync offline entry", error);
    }
  }
  await clearOfflineEntries();
  return responses;
}
