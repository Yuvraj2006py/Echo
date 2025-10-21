"use client";

import type { Session } from "@supabase/supabase-js";

const memoryStore = new Map<string, string>();
const METADATA_KEYS = ["full_name", "name", "display_name"];

function readStoredName(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }
  const stored = memoryStore.get(email.toLowerCase());
  if (!stored) {
    return null;
  }
  const trimmed = stored.trim();
  return trimmed || null;
}

export function rememberUserName(email: string | null | undefined, fullName: string) {
  if (!email) {
    return;
  }
  const trimmed = fullName.trim();
  if (!trimmed) {
    return;
  }
  memoryStore.set(email.toLowerCase(), trimmed);
}

export function resolveUserName(session: Session | null | undefined): string | null {
  if (!session) {
    return null;
  }

  const metadata = (session.user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of METADATA_KEYS) {
    const value = metadata[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return readStoredName(session.user?.email);
}
