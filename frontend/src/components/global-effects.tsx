"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSettingsStore } from "@/lib/settings";

type Flake = { x: number; y: number; r: number; vy: number; vx: number };

function SnowCanvas({ active, longMode }: { active: boolean; longMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const flakes: Flake[] = [];
    const count = longMode ? 85 : 50;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const spawn = () => {
      flakes.length = 0;
      for (let i = 0; i < count; i += 1) {
        flakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 2 + 1,
          vy: Math.random() * 0.8 + 0.35,
          vx: Math.random() * 0.4 - 0.2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(165, 200, 255, 0.85)";
      for (const flake of flakes) {
        flake.y += flake.vy;
        flake.x += flake.vx;
        if (flake.y > canvas.height + 8) {
          flake.y = -8;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width + 8) flake.x = -8;
        if (flake.x < -8) flake.x = canvas.width + 8;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    spawn();
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, longMode]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[70]" aria-hidden />;
}

export function GlobalEffects() {
  const seasonalEffects = useSettingsStore((state) => state.seasonalEffects);
  const auroraEnabled = useSettingsStore((state) => state.auroraEnabled);
  const partyMode = useSettingsStore((state) => state.partyMode);
  const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const snowTriggerCount = useSettingsStore((state) => state.snowTriggerCount);
  const confettiTriggerCount = useSettingsStore((state) => state.confettiTriggerCount);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion || reducedMotionSetting || !animationsEnabled;

  const [showSnow, setShowSnow] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    if (!snowTriggerCount && !seasonalEffects && !partyMode) return;
    setShowSnow(true);
    const timer = window.setTimeout(() => setShowSnow(false), seasonalEffects || partyMode ? 10000 : 7000);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, seasonalEffects, partyMode, snowTriggerCount]);

  useEffect(() => {
    if (reduceMotion || confettiTriggerCount === 0 || !seasonalEffects) return;
    setShowConfetti(true);
    const timer = window.setTimeout(() => setShowConfetti(false), 1300);
    return () => window.clearTimeout(timer);
  }, [confettiTriggerCount, reduceMotion, seasonalEffects]);

  return (
    <>
      <AnimatePresence>
        {auroraEnabled && !reduceMotion ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.24 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none fixed inset-0 z-[2]"
            style={{
              background:
                "radial-gradient(45rem 25rem at 15% 12%, rgba(66,123,255,0.2), transparent), radial-gradient(35rem 25rem at 85% 8%, rgba(61, 189, 173,0.2), transparent)",
            }}
            aria-hidden
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {partyMode && !reduceMotion ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none fixed inset-0 z-[3]"
            aria-hidden
          >
            {Array.from({ length: 40 }).map((_, index) => (
              <motion.span
                key={index}
                className="absolute h-0.5 w-0.5 rounded-full bg-primary"
                style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
                animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.8, 1] }}
                transition={{ duration: 1.8 + Math.random() * 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSnow && !reduceMotion ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SnowCanvas active={showSnow} longMode={seasonalEffects || partyMode} />
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
            {Array.from({ length: 18 }).map((_, index) => (
              <motion.div
                key={`${confettiTriggerCount}-${index}`}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 60,
                  y: -30 - Math.random() * 100,
                  rotate: (Math.random() - 0.5) * 280,
                  opacity: 0,
                  scale: 0.6,
                }}
                transition={{ duration: 1.05, ease: "easeOut" }}
                className="absolute h-1.5 w-1.5 rounded-sm bg-primary"
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
