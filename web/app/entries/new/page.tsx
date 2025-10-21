"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { analyzeText, createEntry, fetchProfile, ApiError } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TAGS = ["Calm", "Anxious", "Proud", "Drained", "Grateful", "Frustrated", "Focused"];

type ConversationMessage = {
  role: "user" | "echo";
  text: string;
  timestamp: Date;
};

export default function NewEntryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [suggestion, setSuggestion] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [wantsChat, setWantsChat] = React.useState<boolean | null>(null);
  const [conversation, setConversation] = React.useState<ConversationMessage[]>([]);
  const [chatInput, setChatInput] = React.useState("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    retry: false,
    staleTime: 1000 * 60 * 5
  });

  React.useEffect(() => {
    const error = profileQuery.error;
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      router.replace("/login");
    }
  }, [profileQuery.error, router]);

  const mutation = useMutation({
    mutationFn: () => createEntry({ text, source: "web", tags }),
    onSuccess: (data) => {
      setSuggestion(data.one_liner);
      setConversation([
        {
          role: "echo",
          text: data.one_liner,
          timestamp: new Date()
        }
      ]);
      setWantsChat(null);
      setText("");
      setTags([]);
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.replace("/login");
      }
    }
  });

  const chatMutation = useMutation({
    mutationFn: (message: string) => analyzeText(message),
    onSuccess: (data) => {
      setConversation((prev) => [
        ...prev,
        { role: "echo", text: data.one_liner, timestamp: new Date() }
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        router.replace("/login");
      }
    }
  });

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await mutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendChat(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatInput.trim()) return;
    const userMessage: ConversationMessage = {
      role: "user",
      text: chatInput.trim(),
      timestamp: new Date()
    };
    setConversation((prev) => [...prev, userMessage]);
    setChatInput("");
    try {
      await chatMutation.mutateAsync(userMessage.text);
    } catch (error) {
      setConversation((prev) => [
        ...prev,
        {
          role: "echo",
          text: "I hit a snag generating a reply. Try again in a moment or take a pause.",
          timestamp: new Date()
        }
      ]);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 pb-16 pt-20">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Capture a reflection</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tag the moment and Echo will respond with an instant suggestion.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <Textarea
          placeholder="What happened? Capture the context, feelings, body cues..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Emotion tags
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    active ? "bg-brand text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" disabled={isSubmitting || !text.trim()}>
            {isSubmitting ? "Echo is thinking..." : "Save entry"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
      </form>

      {suggestion && (
        <div className="rounded-2xl border border-brand bg-brand-muted/80 p-5">
          <Badge variant="outline">Echo&apos;s suggestion</Badge>
          <p className="mt-3 text-slate-800">{suggestion}</p>
        </div>
      )}

      {suggestion && wantsChat === null && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-800">Do you want to keep talking with Echo?</p>
          <p className="mt-1 text-xs text-slate-500">
            Echo can stay with you for a deeper conversation or you can simply log the reflection.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => setWantsChat(true)}>Yes, stay with Echo</Button>
            <Button variant="outline" onClick={() => setWantsChat(false)}>
              No, just log it
            </Button>
          </div>
        </div>
      )}

      {wantsChat && (
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Echo is listening
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Share whatever else is on your mind. Echo responds with gentle, short reflections—right here.
            </p>
          </div>
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4">
            {conversation.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.timestamp.getTime()}`}
                className={cn(
                  "flex flex-col gap-1",
                  message.role === "user" ? "items-end text-right" : "items-start text-left"
                )}
              >
                <span
                  className={cn(
                    "inline-flex max-w-xs rounded-2xl px-4 py-2 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-brand text-white"
                      : "bg-white text-slate-700 shadow-sm"
                  )}
                >
                  {message.text}
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  {message.role === "user" ? "You" : "Echo"} •{" "}
                  {message.timestamp.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendChat} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Textarea
              placeholder="Let Echo know what else is coming up…"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              disabled={chatMutation.isPending}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!chatInput.trim() || chatMutation.isPending}>
                {chatMutation.isPending ? "Echo is thinking..." : "Send"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
