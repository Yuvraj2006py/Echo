"use client";

import { motion } from "framer-motion";
import { cn } from "../lib/utils";

type ChatBubbleProps = {
  role: "user" | "echo";
  message: string;
  delay?: number;
  className?: string;
};

export function ChatBubble({ role, message, delay = 0, className }: ChatBubbleProps) {
  const isEcho = role === "echo";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className={cn(
        "relative max-w-[70%] overflow-hidden rounded-3xl px-5 py-4 text-sm sm:text-base",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 -z-10 rounded-3xl blur-3xl transition-opacity duration-500",
          isEcho ? "opacity-90 bg-echoBlue/50" : "opacity-60 bg-white/10"
        )}
      />
      <div
        className={cn(
          "absolute inset-[1px] -z-10 rounded-[22px]",
          isEcho
            ? "bg-gradient-to-br from-echoBlue/85 via-echoLavender/70 to-echoBlue/90"
            : "border border-white/10 bg-white/10 backdrop-blur-lg"
        )}
      />
      <span className="block whitespace-pre-wrap leading-relaxed">{message}</span>
      <span
        className={cn(
          "absolute h-3 w-3 rotate-45 rounded-sm",
          isEcho
            ? "right-6 top-full -translate-y-[10px] bg-echoBlue/80"
            : "left-6 top-full -translate-y-[10px] border border-white/10 bg-white/10"
        )}
      />
    </motion.div>
  );
}
