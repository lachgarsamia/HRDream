"use client";

import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import type { ConfettiStyle } from "@/lib/settings";

let lastBurst = 0;

export function ConfettiBurst({
  trigger,
  enabled = true,
  soundEnabled = false,
  style = "celebration",
  rateLimitMs = 1500,
}: {
  trigger: number;
  enabled?: boolean;
  soundEnabled?: boolean;
  style?: ConfettiStyle;
  rateLimitMs?: number;
}) {
  const rm = useReducedMotion();
  const [active, setActive] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled || rm || !trigger) return;
    const now = Date.now();
    if (now - lastBurst <= rateLimitMs) return;

    lastBurst = now;
    setCount((value) => value + 1);
    setActive(true);
    if (soundEnabled) {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(720, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1080, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.17);
    }
    const timer = window.setTimeout(() => setActive(false), 1100);
    return () => window.clearTimeout(timer);
  }, [enabled, rateLimitMs, rm, soundEnabled, trigger]);

  if (rm) return null;

  const palette = ["bg-primary", "bg-foreground/65", "bg-muted-foreground/70"];
  const sparkleCount = style === "sparkle" ? 32 : 22;
  const streamerCount = style === "streamers" ? 16 : 10;

  return (
    <>
      <span data-testid="confetti-count" className="sr-only">
        {count}
      </span>
      <AnimatePresence>
        {active ? (
          <motion.div
            key={`${trigger}-${count}`}
            data-testid="confetti-burst"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed right-6 top-20 z-[72]"
            aria-hidden
          >
            <motion.div
              className="absolute right-8 top-6 h-4 w-4 rounded-full bg-primary/70"
              initial={{ scale: 0.3, opacity: 0.8 }}
              animate={{ scale: [0.3, 1.2, 0.6], opacity: [0.8, 0.4, 0] }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
            <motion.div
              className="absolute right-2 top-1 rounded-full border border-primary/30 bg-background/90 px-2 py-0.5 text-[10px] font-medium text-primary"
              initial={{ x: 0 }}
              animate={{ x: [0, -1.5, 1.5, -1, 1, 0] }}
              transition={{ duration: 0.32, ease: "easeInOut" }}
            >
              Success
            </motion.div>
            {Array.from({ length: streamerCount }).map((_, index) => (
              <motion.div
                key={`streamer-${count}-${index}`}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 0.95, scaleY: 1 }}
                animate={{
                  x: (Math.random() - 0.35) * 110,
                  y: -25 - Math.random() * 80,
                  rotate: (Math.random() - 0.5) * 190,
                  opacity: 0,
                  scaleY: 0.5,
                }}
                transition={{ duration: 0.95, ease: "easeOut", delay: 0.05 + Math.random() * 0.12 }}
                className={`${palette[index % palette.length]} absolute h-4 w-[2px] rounded-full`}
              />
            ))}
            {Array.from({ length: sparkleCount }).map((_, index) => (
              <motion.div
                key={`sparkle-${count}-${index}`}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.9 }}
                animate={{
                  x: (Math.random() - 0.5) * 95,
                  y: -28 - Math.random() * 115,
                  rotate: (Math.random() - 0.5) * 260,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 1.15, ease: "easeOut", delay: 0.08 + Math.random() * 0.2 }}
                className={`${palette[(index + 1) % palette.length]} absolute h-1.5 w-1.5 rounded-sm`}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
