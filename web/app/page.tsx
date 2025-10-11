"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, MessageSquareHeart, BarChart3 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { EchoOrb } from "../components/EchoOrb";
import { ChatBubble } from "../components/ChatBubble";

const chatPreview = [
  {
    role: "user" as const,
    message: "Today felt heavy. I kept bouncing between meetings and barely caught my breath.",
    delay: 0.2
  },
  {
    role: "echo" as const,
    message:
      "Thank you for sharing that with me. Try placing a gentle pause between commitments tonight—maybe a slow walk or a quiet check-in with your body.",
    delay: 0.34
  },
  {
    role: "user" as const,
    message: "I’ll try scheduling a break. I don’t want to burn out again.",
    delay: 0.48
  },
  {
    role: "echo" as const,
    message:
      "You’re already protecting your energy by noticing the pattern. Let’s celebrate that. How could tomorrow begin with something soothing?",
    delay: 0.6
  }
];

const features = [
  {
    title: "Bubbly journaling flow",
    description:
      "Echo’s glow keeps you grounded with gentle prompts, replies, and breathing space as you write.",
    icon: MessageSquareHeart
  },
  {
    title: "Emotion intelligence, live",
    description:
      "Track how your feelings shift through glowing timelines, trend lines, and calming heatmaps.",
    icon: TrendingUp
  },
  {
    title: "Weekly reflections that resonate",
    description:
      "Receive compassionate summaries and micro-practices that keep emotional care actionable.",
    icon: BarChart3
  },
  {
    title: "Copilot for coping kits",
    description:
      "Pin your go-to grounding rituals. Echo will surface them when your mood needs softness.",
    icon: Sparkles
  }
];

export default function LandingPage() {
  return (
    <div className="pb-24 pt-10">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
      >
        <div className="space-y-8">
          <Badge variant="outline" className="w-fit bg-white/5 text-echoLavender/90">
            Echo · Your calm emotional mirror
          </Badge>
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold leading-tight text-white drop-shadow-[0_0_18px_rgba(124,131,253,0.45)] sm:text-5xl lg:text-6xl">
              Float through your feelings with a glowing companion.
            </h1>
            <p className="max-w-xl text-base text-slate-200/80 sm:text-lg">
              Echo listens, reflects, and keeps your emotional patterns luminous. Capture quick entries,
              receive empathetic nudges, and find the rituals that steady your day—across web and mobile.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className="shadow-glow">
              <Link href="/login">Open Echo</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-white hover:text-white/90">
              <Link href="/entries/new">Write a reflection</Link>
            </Button>
          </div>
          <div className="grid gap-3 text-xs text-slate-400 sm:text-sm">
            <span className="uppercase tracking-[0.4em] text-echoLavender/60">Powered by Journal AI</span>
            <p className="max-w-md text-slate-300/70">
              Echo’s free-tier AI blends soft conversation, emotion tagging, coping kits, and weekly digests—
              so you can observe yourself with curiosity instead of judgment.
            </p>
          </div>
        </div>
        <div className="relative flex flex-col items-center justify-center gap-8 rounded-[32px] border border-white/10 bg-[rgba(12,14,22,0.65)] p-10 shadow-glow backdrop-blur-3xl">
          <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/5 bg-gradient-to-br from-white/5 via-transparent to-echoBlue/10 opacity-40" />
          <div className="relative flex items-center justify-center">
            <EchoOrb className="shadow-[0_0_120px_rgba(124,131,253,0.55)]" size={260} />
            <Image
              src="/images/echo-mascot.png"
              alt="Echo mascot"
              width={220}
              height={220}
              priority
              className="relative z-10 drop-shadow-[0_12px_40px_rgba(124,131,253,0.45)]"
            />
          </div>
          <motion.div
            className="flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-[0_0_35px_rgba(124,131,253,0.35)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          >
            {chatPreview.map((bubble, index) => (
              <ChatBubble key={index} {...bubble} />
            ))}
          </motion.div>
        </div>
      </motion.section>

      <section className="mt-20 grid gap-8 rounded-[32px] border border-white/10 bg-[rgba(13,16,26,0.7)] p-10 shadow-[0_0_40px_rgba(124,131,253,0.25)] backdrop-blur-3xl lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          <div className="relative h-24 w-40">
            <Image
              src="/images/echo-logo.png"
              alt="Echo wordmark"
              fill
              priority
              className="object-contain drop-shadow-[0_0_20px_rgba(124,131,253,0.55)]"
            />
          </div>
          <p className="max-w-sm text-base text-slate-200/85">
            Echo’s smiling companion embodies the journal experience—a calm light that floats beside you,
            ready when you need to reflect, celebrate, or pause.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_0_24px_rgba(124,131,253,0.18)]">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-echoLavender/70">
              Personality
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200/85">
              Gentle, observant, and encouraging. Echo keeps space for whatever you feel and responds with
              kindness.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_0_24px_rgba(124,131,253,0.18)]">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-echoLavender/70">
              Visual glow
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200/85">
              The mascot’s orbit and the brand gradients mirror soft bioluminescence—lighting the path
              and never overwhelming.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_0_24px_rgba(124,131,253,0.18)]">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-echoLavender/70">
              Voice
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200/85">
              Clear and human. Echo reflects emotions back, celebrates progress, and suggests gentle next steps.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-[0_0_24px_rgba(124,131,253,0.18)]">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-echoLavender/70">
              Product promise
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200/85">
              Keep your emotional world organized across devices, and receive AI guidance that feels like a calm friend.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-24 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.5 }}
            viewport={{ once: true, amount: 0.4 }}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[rgba(15,17,26,0.65)] p-6 shadow-[0_0_30px_rgba(124,131,253,0.18)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(124,131,253,0.45)]"
          >
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-40">
              <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-echoBlue/40 blur-[80px]" />
            </div>
            <feature.icon className="h-6 w-6 text-echoLavender" />
            <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300/80">{feature.description}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
