"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

import { CsrfProvider } from "./CsrfProvider";
import { AuthSessionBridge } from "./session/AuthSessionBridge";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CsrfProvider>
        <AuthSessionBridge />
        {children}
      </CsrfProvider>
    </QueryClientProvider>
  );
}
