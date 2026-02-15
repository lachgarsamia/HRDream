"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSettingsStore } from "@/lib/settings";

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function GlobalEffects() {
  const seasonalEffects = useSettingsStore((state) => state.seasonalEffects);
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const snowTriggerCount = useSettingsStore((state) => state.snowTriggerCount);
  const confettiTriggerCount = useSettingsStore((state) => state.confettiTriggerCount);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion || reducedMotionSetting;

  const [showSnow, setShowSnow] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    if (!snowTriggerCount && !seasonalEffects) return;
    setShowSnow(true);
    const timer = window.setTimeout(() => setShowSnow(false), seasonalEffects ? 10000 : 7000);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, seasonalEffects, snowTriggerCount]);

  useEffect(() => {
    if (reduceMotion || confettiTriggerCount === 0 || !seasonalEffects) return;
    setShowConfetti(true);
    const timer = window.setTimeout(() => setShowConfetti(false), 1400);
    return () => window.clearTimeout(timer);
  }, [confettiTriggerCount, reduceMotion, seasonalEffects]);

  const snowflakes = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, index) => ({
        id: index,
        left: `${Math.round(random(1, 98))}%`,
        duration: random(3.8, 8.2),
        delay: random(0, 1.8),
        size: random(8, 15),
      })),
    []
  );

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, index) => ({
        id: index,
        x: random(-30, 30),
        y: random(-120, -20),
        rotate: random(-140, 140),
      })),
    []
  );

  return (
    <>
      <AnimatePresence>
        {showSnow ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
            aria-hidden
          >
            {snowflakes.map((flake) => (
              <motion.div
                key={flake.id}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: "110vh", opacity: [0, 0.85, 0.35] }}
                transition={{ duration: flake.duration, delay: flake.delay, ease: "linear" }}
                className="absolute text-primary/65"
                style={{ left: flake.left, fontSize: flake.size }}
              >
                ❄
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showConfetti ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed right-6 top-20 z-[70]"
            aria-hidden
          >
            {confettiPieces.map((piece) => (
              <motion.div
                key={piece.id}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                animate={{ x: piece.x, y: piece.y, rotate: piece.rotate, opacity: 0, scale: 0.6 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                className="absolute h-1.5 w-1.5 rounded-sm bg-primary"
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
