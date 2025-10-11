import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../src/supabase";
import { createEntry, storeOfflineEntry } from "../src/api";

const TAGS = ["Calm", "Anxious", "Proud", "Drained", "Grateful", "Frustrated", "Focused"];

export default function JournalScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [oneLiner, setOneLiner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setToken(data.session.access_token);
      }
    });
  }, []);

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      if (token) {
        const response = await createEntry({ text, tags, source: "mobile" }, token);
        setOneLiner(response.one_liner);
      } else {
        await storeOfflineEntry({ text, tags, createdAt: new Date().toISOString() });
        Alert.alert("Saved offline", "We'll sync this entry once you're back online.");
      }
      setText("");
      setTags([]);
    } catch (error) {
      console.warn("Failed to log entry", error);
      Alert.alert("Error", "We could not save your entry. Try again soon.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.subtitle}>Voice capture arriving soon. For now, type it out.</Text>

      <View style={styles.card}>
        <TextInput
          multiline
          placeholder="What happened? How did it feel?"
          style={styles.textArea}
          value={text}
          onChangeText={setText}
        />
        <View style={styles.tagRow}>
          {TAGS.map((tag) => {
            const active = tags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, active && styles.tagChipActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[styles.tagLabel, active && styles.tagLabelActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? "Saving..." : "Save entry"}</Text>
        </TouchableOpacity>
      </View>

      {oneLiner && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackLabel}>Instant one-liner</Text>
          <Text style={styles.feedbackText}>{oneLiner}</Text>
        </View>
      )}

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
  textArea: {
    minHeight: 160,
    textAlignVertical: "top",
    fontSize: 16,
    color: "#1E293B"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 20
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  tagChipActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1"
  },
  tagLabel: {
    fontSize: 14,
    color: "#4338CA"
  },
  tagLabelActive: {
    color: "white"
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#6366F1",
    borderRadius: 18,
    alignItems: "center",
    paddingVertical: 14
  },
  primaryButtonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600"
  },
  feedbackCard: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#E0E7FF",
    borderRadius: 20
  },
  feedbackLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
    color: "#4338CA"
  },
  feedbackText: {
    marginTop: 10,
    fontSize: 16,
    color: "#1E293B"
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
