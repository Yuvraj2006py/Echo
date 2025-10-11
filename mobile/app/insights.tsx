import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { VictoryArea, VictoryAxis, VictoryChart, VictoryLine, VictoryTheme } from "victory-native";
import { supabase } from "../src/supabase";
import { fetchInsights } from "../src/api";
import type { InsightsSummary } from "../../shared/types";

const { width } = Dimensions.get("window");

export default function InsightsScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightsSummary | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setToken(data.session.access_token);
      }
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchInsights(token, 30)
      .then(setInsights)
      .catch((error) => console.warn("Failed to load insights", error));
  }, [token]);

  const trendData = insights?.trend ?? [];
  const topEmotions = insights?.top_emotions ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mini insights</Text>
      <Text style={styles.subtitle}>A quick read on recent moods.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dominant emotion trend</Text>
        {trendData.length === 0 ? (
          <Text style={styles.placeholder}>Log a few reflections to unlock charts.</Text>
        ) : (
          <VictoryChart
            width={width - 48}
            height={220}
            padding={{ top: 24, bottom: 40, left: 40, right: 24 }}
            theme={VictoryTheme.material}
          >
            <VictoryAxis tickFormat={() => ""} />
            <VictoryAxis
              dependentAxis
              tickFormat={(tick) => `${Math.round(Number(tick) * 100)}%`}
            />
            {Object.keys(trendData[0])
              .filter((key) => key !== "date")
              .slice(0, 3)
              .map((emotion) => (
                <VictoryLine
                  key={emotion}
                  data={trendData.map((item) => ({ x: item.date, y: Number(item[emotion] ?? 0) }))}
                  interpolation="natural"
                />
              ))}
          </VictoryChart>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Emotion mix</Text>
        {topEmotions.length === 0 ? (
          <Text style={styles.placeholder}>No data yet.</Text>
        ) : (
          <VictoryChart
            width={width - 48}
            height={180}
            padding={{ top: 24, bottom: 40, left: 50, right: 24 }}
            theme={VictoryTheme.material}
          >
            <VictoryAxis dependentAxis tickFormat={(tick) => `${tick}%`} />
            <VictoryAxis tickFormat={(value) => value.slice(0, 3)} />
            <VictoryArea
              data={topEmotions.map((item) => ({ x: item.label, y: item.pct }))}
              style={{ data: { fill: "rgba(99, 102, 241, 0.3)", stroke: "#6366F1", strokeWidth: 2 } }}
            />
          </VictoryChart>
        )}
      </View>

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
  placeholder: {
    fontSize: 14,
    color: "#94A3B8"
  },
  tertiaryButton: {
    marginTop: 24,
    alignItems: "center"
  },
  tertiaryButtonText: {
    color: "#4338CA",
    fontWeight: "600"
  }
});
