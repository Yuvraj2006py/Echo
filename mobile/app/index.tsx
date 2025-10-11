import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../src/supabase";
import { fetchEntries, fetchWeeklySummary, syncOfflineEntries } from "../src/api";
import type { Entry } from "../../shared/types";

const PROMPT =
  "Echo: cross-platform emotional journaling w/ one-liners, tags, heatmap, coping kit, triggers, weekly digest, calendar context. Free-tier stack. See /shared/PROMPT.md.";

export default function HomeScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setToken(data.session.access_token);
        setEmail(data.session.user?.email ?? null);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setToken(session.access_token);
        setEmail(session.user?.email ?? null);
      } else {
        setToken(null);
        setEmail(null);
        setEntries([]);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        await syncOfflineEntries(token);
        const [entriesData, summaryData] = await Promise.all([
          fetchEntries(token, 10),
          fetchWeeklySummary(token)
        ]);
        setEntries(entriesData);
        setSummary(summaryData.summary_text);
        setMessage(null);
      } catch (error) {
        console.warn("Failed to refresh home data", error);
        setMessage("Unable to refresh right now. We'll try again soon.");
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>Loading Echo Pocket...</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.title}>Sign in to Echo</Text>
        <Text style={styles.subtitle}>
          Use the web app to request a magic link, then open it on this device to get started.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/journal")}>
          <Text style={styles.primaryButtonText}>Open journal</Text>
        </TouchableOpacity>
        <Text style={styles.prompt}>{PROMPT}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Read /shared/PROMPT.md if lost.</Text>
      <Text style={styles.title}>Hi {email ?? "there"}</Text>
      <Text style={styles.subtitle}>
        How are you feeling? Capture a moment and Echo will support you.
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/journal")}>
          <Text style={styles.primaryButtonText}>New entry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push("/insights")}>
          <Text style={styles.secondaryButtonText}>Mini insights</Text>
        </TouchableOpacity>
      </View>

      {message && <Text style={styles.warning}>{message}</Text>}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly summary</Text>
        <Text style={styles.cardBody}>
          {summary || "Log a few reflections to unlock your AI recap."}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent reflections</Text>
        {entries.slice(0, 3).map((entry) => (
          <View key={entry.id} style={styles.entryItem}>
            <Text style={styles.entryText}>{entry.text}</Text>
            <Text style={styles.entryMeta}>
              {entry.top_emotion?.label ?? "neutral"} -
              {" "}
              {new Date(entry.created_at).toLocaleString()}
            </Text>
          </View>
        ))}
        {entries.length === 0 && (
          <Text style={styles.entryPlaceholder}>No entries yet. Tap "New entry" to start.</Text>
        )}
      </View>

      <TouchableOpacity style={styles.tertiaryButton} onPress={() => router.push("/settings")}>
        <Text style={styles.tertiaryButtonText}>Settings & reminders</Text>
      </TouchableOpacity>
      <Text style={styles.prompt}>{PROMPT}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 56,
    backgroundColor: "#F8FAFC"
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  eyebrow: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#64748B"
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginTop: 8
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 8,
    textAlign: "left"
  },
  prompt: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 24,
    textAlign: "center"
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600"
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#E0E7FF",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "#4338CA",
    fontWeight: "600"
  },
  tertiaryButton: {
    marginTop: 24,
    paddingVertical: 12,
    alignItems: "center"
  },
  tertiaryButtonText: {
    color: "#4338CA",
    fontWeight: "600"
  },
  card: {
    marginTop: 24,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12
  },
  cardBody: {
    fontSize: 15,
    color: "#475569"
  },
  entryItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  entryText: {
    fontSize: 15,
    color: "#334155"
  },
  entryMeta: {
    fontSize: 12,
    marginTop: 4,
    color: "#94A3B8"
  },
  entryPlaceholder: {
    fontSize: 14,
    color: "#94A3B8"
  },
  warning: {
    marginTop: 16,
    color: "#F97316"
  }
});
