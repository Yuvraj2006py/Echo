"use client";

import * as React from "react";

import { getSupabaseBrowserClient } from "../../lib/supabase";
import { useCsrf } from "../CsrfProvider";

interface SessionPayload {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
}

async function persistSessionCookies(payload: SessionPayload, csrfSet: (token: string | null) => void) {
  const response = await fetch("/api/auth/set-cookie", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error("Failed to persist session cookies.");
  }
  const data = (await response.json()) as { csrfToken?: string };
  if (typeof data.csrfToken === "string") {
    csrfSet(data.csrfToken);
  } else {
    csrfSet(null);
  }
}

async function clearSessionCookies(csrfSet: (token: string | null) => void) {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: "{}"
  });
  csrfSet(null);
}

export function AuthSessionBridge(): null {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const { set: setCsrfToken, refresh: refreshCsrf } = useCsrf();

  React.useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) {
        return;
      }
      const session = data.session;
      if (session?.access_token) {
        try {
          await persistSessionCookies(
            {
              access_token: session.access_token,
              refresh_token: session.refresh_token ?? null,
              expires_at: session.expires_at ?? null
            },
            setCsrfToken
          );
        } catch {
          // fall back to explicit refresh
          await refreshCsrf();
        }
      } else {
        await refreshCsrf();
      }
    }

    void hydrateSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) {
        return;
      }
      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
        session?.access_token
      ) {
        try {
          await persistSessionCookies(
            {
              access_token: session.access_token,
              refresh_token: session.refresh_token ?? null,
              expires_at: session.expires_at ?? null
            },
            setCsrfToken
          );
        } catch {
          await refreshCsrf();
        }
      }
      if (event === "SIGNED_OUT") {
        await clearSessionCookies(setCsrfToken);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, refreshCsrf, setCsrfToken]);

  return null;
}
