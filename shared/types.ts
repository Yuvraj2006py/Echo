export type EmotionScore = {
  label: string;
  score: number;
};

export type Entry = {
  id: string;
  user_id: string;
  text: string;
  source?: "mobile" | "web";
  tags: string[];
  emotion_json: EmotionScore[];
  top_emotion?: EmotionScore | null;
  created_at: string;
  suggestion?: string | null;
};

export type EntryCreateResponse = {
  entry: Entry;
  one_liner: string;
};

export type AnalyzeResult = {
  emotions: EmotionScore[];
  top: EmotionScore;
  one_liner: string;
};

export type InsightsSummary = {
  top_emotions: { label: string; pct: number }[];
  trend: { date: string; [emotion: string]: number | string }[];
  keywords: { word: string; count: number }[];
  heatmap: { date: string; dominant_label: string }[];
};

export type WeeklySummary = {
  summary_text: string;
  week_start: string;
};

export type CopingKit = {
  actions: string[];
};

export type TriggerStat = {
  id?: string;
  name: string;
  words: string[];
  stats: {
    count: number;
    correlation: Record<string, number>;
  };
};
