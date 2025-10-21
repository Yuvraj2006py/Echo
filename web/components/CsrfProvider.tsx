"use client";

import * as React from "react";

import { setCsrfToken as storeCsrfToken } from "../lib/csrf";

interface CsrfContextValue {
  token: string | null;
  refresh: () => Promise<void>;
  set: (token: string | null) => void;
}

const CsrfContext = React.createContext<CsrfContextValue>({
  token: null,
  refresh: async () => {
    storeCsrfToken(null);
  },
  set: (token: string | null) => {
    storeCsrfToken(token);
  }
});

async function requestCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/csrf", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });
    if (!response.ok) {
      storeCsrfToken(null);
      return null;
    }
    const data = (await response.json()) as { csrfToken?: string };
    if (typeof data.csrfToken === "string") {
      storeCsrfToken(data.csrfToken);
      return data.csrfToken;
    }
    storeCsrfToken(null);
    return null;
  } catch {
    storeCsrfToken(null);
    return null;
  }
}

export function CsrfProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(null);

  const set = React.useCallback((value: string | null) => {
    storeCsrfToken(value);
    setToken(value);
  }, []);

  const refresh = React.useCallback(async () => {
    const next = await requestCsrfToken();
    set(next);
  }, [set]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo(() => ({ token, refresh, set }), [token, refresh, set]);

  return <CsrfContext.Provider value={value}>{children}</CsrfContext.Provider>;
}

export function useCsrf(): CsrfContextValue {
  return React.useContext(CsrfContext);
}
