"use client";

import type { Session } from "@supabase/supabase-js";

const STORAGE_PREFIX = "echo:name:";
const METADATA_KEYS = ["full_name", "name", "display_name"];

function readStoredName(email: string | null | undefined): string | null {
  if (!email || typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${email.toLowerCase()}`);
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export function rememberUserName(email: string | null | undefined, fullName: string) {
  if (!email || typeof window === "undefined") {
    return;
  }
  const trimmed = fullName.trim();
  if (!trimmed) {
    return;
  }
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${email.toLowerCase()}`, trimmed);
  } catch {
    // ignore storage errors
  }
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
