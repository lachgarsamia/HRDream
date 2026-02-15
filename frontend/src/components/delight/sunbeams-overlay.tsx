"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function SunbeamsOverlay({ enabled, intensity = 1 }: { enabled: boolean; intensity?: number }) {
  const reduceMotion = useReducedMotion();
  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      data-testid="sunbeams-overlay"
      className="pointer-events-none fixed inset-0 z-[57] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.2 + Math.min(0.25, intensity * 0.08) }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute -left-1/4 top-[-28%] h-[90%] w-[85%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(250,204,21,0.55) 0%, rgba(255,255,255,0) 62%)" }}
        animate={reduceMotion ? undefined : { rotate: [0, 6, 0], x: [0, 25, 0], y: [0, 18, 0] }}
        transition={reduceMotion ? undefined : { duration: 16, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
      />
      <motion.div
        className="absolute right-[-18%] top-[-25%] h-[78%] w-[65%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.35) 0%, rgba(255,255,255,0) 65%)" }}
        animate={reduceMotion ? undefined : { rotate: [0, -4, 0], x: [0, -16, 0], y: [0, 12, 0] }}
        transition={reduceMotion ? undefined : { duration: 18, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.09),transparent_62%)]" />
    </motion.div>
  );
}
