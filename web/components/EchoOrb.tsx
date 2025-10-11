"use client";

import { motion } from "framer-motion";
import { cn } from "../lib/utils";

type EchoOrbProps = {
  size?: number;
  className?: string;
};

export function EchoOrb({ size = 220, className }: EchoOrbProps) {
  const dimension = `${size}px`;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: dimension, height: dimension }}>
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-echoBlue via-echoLavender to-[#99A3FF] blur-[50px] opacity-70"
        animate={{
          scale: [0.95, 1.05, 0.98],
          rotate: [0, 6, -4, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[6%] rounded-full bg-gradient-to-br from-white/80 via-echoLavender/65 to-echoBlue/90 opacity-90"
        animate={{
          scale: [0.98, 1.04, 0.99],
          rotate: [0, -4, 2, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[22%] rounded-full bg-gradient-to-br from-echoBlue/40 via-white/70 to-echoLavender/30"
        animate={{
          scale: [1.02, 0.95, 1.01],
          opacity: [0.9, 0.75, 1]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-[35%] rounded-full bg-white/90 shadow-[0_0_40px_rgba(124,131,253,0.6)]"
        animate={{
          scale: [0.95, 1.05, 0.97],
          opacity: [0.8, 1, 0.95]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-x-[30%] bottom-[15%] h-4 rounded-full bg-white/80 blur-lg"
        animate={{ scaleX: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
