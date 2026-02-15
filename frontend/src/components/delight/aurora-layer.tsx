"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function AuroraLayer({ enabled, opacity = 0.58 }: { enabled: boolean; opacity?: number }) {
  const rm = useReducedMotion();
  if (!enabled || rm) return null;

  return (
    <motion.div
      aria-hidden
      data-testid="aurora-layer"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="absolute inset-[-16%] blur-2xl"
        animate={{
          backgroundPosition: ["0% 45%", "100% 55%", "0% 45%"],
          x: [0, 26, -18, 0],
          y: [0, -12, 10, 0],
        }}
        transition={{
          duration: 24,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          backgroundImage:
            "radial-gradient(58% 64% at 14% 30%, rgba(56,189,248,0.26), transparent 56%)," +
            "radial-gradient(60% 62% at 82% 18%, rgba(99,102,241,0.22), transparent 58%)," +
            "radial-gradient(56% 60% at 63% 78%, rgba(16,185,129,0.16), transparent 60%)",
          backgroundSize: "240% 240%",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.2))",
        }}
      />
    </motion.div>
  );
}
