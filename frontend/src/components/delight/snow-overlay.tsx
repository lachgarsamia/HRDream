"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  enabled: boolean;
  intensity?: number;
  testId?: string;
};

type Flake = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  a: number;
};

export function SnowOverlay({ enabled, intensity = 1, testId = "snow-overlay" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const flakesRef = useRef<Flake[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      sizeRef.current = { w, h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const targetCount = Math.floor(140 * intensity);
    if (flakesRef.current.length === 0) {
      flakesRef.current = Array.from({ length: targetCount }).map(() => ({
        x: Math.random() * sizeRef.current.w,
        y: Math.random() * sizeRef.current.h,
        r: 0.8 + Math.random() * 2.2,
        vy: 0.6 + Math.random() * 1.6,
        vx: -0.3 + Math.random() * 0.6,
        a: 0.35 + Math.random() * 0.45,
      }));
    }

    const step = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      for (const flake of flakesRef.current) {
        flake.x += flake.vx;
        flake.y += flake.vy;

        if (flake.y > h + 10) {
          flake.y = -10;
          flake.x = Math.random() * w;
        }
        if (flake.x < -10) flake.x = w + 10;
        if (flake.x > w + 10) flake.x = -10;

        ctx.beginPath();
        ctx.globalAlpha = flake.a;
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("resize", resize);
      flakesRef.current = [];
    };
  }, [enabled, intensity]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid={testId}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

