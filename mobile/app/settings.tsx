import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../src/supabase";
import { cancelAllReminders, scheduleDailyReminder } from "../src/notifications";
import { getDigestPreference, setDigestPreference } from "../src/api";

export default function SettingsScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setToken(data.session.access_token);
        try {
          const pref = await getDigestPreference(data.session.access_token);
          setDigestEnabled(pref.enabled);
        } catch (error) {
          console.warn("Failed to load digest preference", error);
        }
      }
      setLoading(false);
    });
  }, []);

  async function toggleDigest() {
    if (!token) return;
    const next = !digestEnabled;
    setDigestEnabled(next);
    try {
      await setDigestPreference(next, token);
    } catch (error) {
      console.warn("Failed to update digest preference", error);
      setDigestEnabled(!next);
    }
  }

  async function toggleNotifications() {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    if (next) {
      const id = await scheduleDailyReminder();
      if (!id) {
        Alert.alert("Permission needed", "Enable notifications in settings to receive reminders.");
        setNotificationsEnabled(false);
      }
    } else {
      await cancelAllReminders();
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Daily nudges and weekly digest controls.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily reminder</Text>
        <Text style={styles.cardBody}>
          Receive a notification at 8pm local time to capture a quick reflection.
        </Text>
        <TouchableOpacity style={styles.toggleButton} onPress={toggleNotifications}>
          <Text style={styles.toggleText}>{notificationsEnabled ? "On" : "Off"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly email digest</Text>
        <Text style={styles.cardBody}>
          Friday recap with sparkline, triggers, and coping prompt.
        </Text>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleDigest}
          disabled={!token}
        >
          <Text style={styles.toggleText}>{digestEnabled ? "On" : "Off"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut}>
        <Text style={styles.secondaryButtonText}>Sign out</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tertiaryButton} onPress={() => router.push("/")}>
        <Text style={styles.tertiaryButtonText}>Back to home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 56,
    backgroundColor: "#F8FAFC"
  },
  title: {
    fontSize: 28,
    fontWeight: "600"
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8
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
  toggleButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "#6366F1",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  toggleText: {
    color: "white",
    fontWeight: "600"
  },
  secondaryButton: {
    marginTop: 36,
    alignItems: "center",
    backgroundColor: "#E0E7FF",
    paddingVertical: 14,
    borderRadius: 18
  },
  secondaryButtonText: {
    color: "#4338CA",
    fontWeight: "600"
  },
  tertiaryButton: {
    marginTop: 16,
    alignItems: "center"
  },
  tertiaryButtonText: {
    color: "#4338CA",
    fontWeight: "600"
  }
});
