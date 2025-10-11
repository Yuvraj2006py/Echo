"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDigestPreference,
  setDigestPreference,
  sendDigestNow,
  getCopingKit,
  saveCopingKit,
  getCalendarAuthorizeUrl,
  getCalendarStatus,
  disconnectCalendar
} from "../../lib/api";
import { getSupabaseBrowserClient } from "../../lib/supabase";
import { Switch } from "../../components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), []);
  const queryClient = useQueryClient();
  const [token, setToken] = React.useState<string | null>(null);
  const [actionsDraft, setActionsDraft] = React.useState<string[]>(["", "", ""]);
  const [isConnectingCalendar, setIsConnectingCalendar] = React.useState(false);
  const [calendarNotice, setCalendarNotice] = React.useState<string | null>(null);
  const [calendarError, setCalendarError] = React.useState<string | null>(null);
  const apiBaseOrigin = React.useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE;
    if (!base) {
      return null;
    }
    try {
      return new URL(base).origin;
    } catch {
      return null;
    }
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
      } else {
        setToken(data.session.access_token);
      }
    });
  }, [router, supabase]);

  const calendarStatusQuery = useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => getCalendarStatus(token!),
    enabled: Boolean(token)
  });

  const digestQuery = useQuery({
    queryKey: ["digest-pref"],
    queryFn: () => getDigestPreference(token!),
    enabled: Boolean(token)
  });

  const kitQuery = useQuery({
    queryKey: ["coping-kit"],
    queryFn: () => getCopingKit(token!),
    enabled: Boolean(token),
    onSuccess: (data) => {
      const base = data?.actions ?? [];
      setActionsDraft([...base, "", "", ""].slice(0, 3));
    }
  });

  const updateDigestMutation = useMutation({
    mutationFn: (enabled: boolean) => setDigestPreference(enabled, token!),
    onSuccess: (data) => {
      queryClient.setQueryData(["digest-pref"], data);
    }
  });

  const sendDigestMutation = useMutation({
    mutationFn: () => sendDigestNow(token!),
    onSuccess: () => {
      // no-op; you could toast success
    }
  });

  const saveKitMutation = useMutation({
    mutationFn: (actions: string[]) => saveCopingKit(actions, token!),
    onSuccess: (data) => {
      queryClient.setQueryData(["coping-kit"], data);
    }
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: () => disconnectCalendar(token!),
    onSuccess: () => {
      setCalendarNotice("Calendar disconnected.");
      setCalendarError(null);
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
    },
    onError: (error: unknown) => {
      setCalendarError(
        error instanceof Error ? error.message : "Unable to disconnect calendar right now."
      );
    }
  });

  React.useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const allowedOrigins = [window.location.origin];
      if (apiBaseOrigin) {
        allowedOrigins.push(apiBaseOrigin);
      }
      if (!allowedOrigins.includes(event.origin)) {
        return;
      }
      const messageType = (event.data as { type?: string } | null)?.type;
      if (messageType === "echo-calendar-connected") {
        setCalendarNotice("Calendar connected. Echo will start correlating your events.");
        setCalendarError(null);
        queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      } else if (messageType === "echo-calendar-error") {
        setCalendarError("Calendar connection failed. Please try again.");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [apiBaseOrigin, queryClient]);

  function handleActionChange(index: number, value: string) {
    setActionsDraft((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleCalendarConnect() {
    if (!token) {
      return;
    }
    setCalendarNotice(null);
    setCalendarError(null);
    setIsConnectingCalendar(true);
    try {
      const { authorize_url: authorizeUrl } = await getCalendarAuthorizeUrl(
        token,
        window.location.origin
      );
      const popup = window.open(
        authorizeUrl,
        "echo-calendar-oauth",
        "width=520,height=640,left=200,top=120"
      );
      if (!popup) {
        setCalendarError("Popup blocked. Please allow popups for Echo to connect your calendar.");
      }
    } catch (error) {
      setCalendarError(
        error instanceof Error
          ? error.message
          : "Unable to start the Google Calendar connection. Please try again."
      );
    } finally {
      setIsConnectingCalendar(false);
    }
  }

  const calendarConnected = calendarStatusQuery.data?.connected ?? false;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 pb-20 pt-20">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">
          Control digest emails, calendar bridge, and your coping kit.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly digest</CardTitle>
          <CardDescription>Get a Friday email with a sparkline and coping reminder.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">
              {digestQuery.data?.enabled ? "Digest is on." : "Digest emails are paused."}
            </p>
          </div>
          <Switch
            checked={digestQuery.data?.enabled ?? true}
            onCheckedChange={(checked) => updateDigestMutation.mutate(checked)}
          />
        </CardContent>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => sendDigestMutation.mutate()}
            disabled={sendDigestMutation.isLoading}
          >
            {sendDigestMutation.isLoading ? "Sending…" : "Send digest now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar bridge</CardTitle>
          <CardDescription>
            Connect read-only events to surface how meetings and deadlines influence your energy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Once connected, Echo will fetch your calendar events with read-only access so Insights can
            highlight patterns between meetings and mood.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCalendarConnect}
              disabled={
                !token || isConnectingCalendar || calendarStatusQuery.isLoading || calendarConnected
              }
            >
              {calendarStatusQuery.isLoading
                ? "Checking connection..."
                : calendarConnected
                  ? "Calendar connected"
                  : isConnectingCalendar
                    ? "Opening Google..."
                    : "Connect Google Calendar"}
            </Button>
            {calendarConnected && (
              <Button
                variant="ghost"
                onClick={() => disconnectCalendarMutation.mutate()}
                disabled={disconnectCalendarMutation.isLoading}
              >
                {disconnectCalendarMutation.isLoading ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
          </div>
          {calendarNotice && (
            <p className="text-sm text-emerald-600">{calendarNotice}</p>
          )}
          {calendarError && <p className="text-sm text-rose-600">{calendarError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage coping kit</CardTitle>
          <CardDescription>Keep up to three micro-actions handy for tough moments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveKitMutation.mutate(actionsDraft.filter(Boolean).slice(0, 3));
            }}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <Input
                key={index}
                placeholder={`Action ${index + 1}`}
                value={actionsDraft[index] ?? ""}
                onChange={(event) => handleActionChange(index, event.target.value)}
              />
            ))}
            <Button type="submit" disabled={saveKitMutation.isLoading}>
              {saveKitMutation.isLoading ? "Saving…" : "Save actions"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
