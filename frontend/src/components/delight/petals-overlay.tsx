"use client";

import React, { useEffect, useRef } from "react";

type Petal = {
  x: number;
  y: number;
  size: number;
  vy: number;
  vx: number;
  rotation: number;
  vr: number;
  alpha: number;
  color: string;
};

const COLORS = ["#f9a8d4", "#fbcfe8", "#fde68a", "#fecdd3", "#fdba74"];

export function PetalsOverlay({ enabled, intensity = 1 }: { enabled: boolean; intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const petalsRef = useRef<Petal[]>([]);
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

    const total = Math.floor(70 * Math.max(0.4, Math.min(2, intensity)));
    petalsRef.current = Array.from({ length: total }).map(() => ({
      x: Math.random() * sizeRef.current.w,
      y: Math.random() * sizeRef.current.h,
      size: 4 + Math.random() * 5,
      vy: 0.35 + Math.random() * 0.75,
      vx: -0.25 + Math.random() * 0.5,
      rotation: Math.random() * Math.PI * 2,
      vr: -0.04 + Math.random() * 0.08,
      alpha: 0.28 + Math.random() * 0.35,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const step = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      for (const petal of petalsRef.current) {
        petal.x += petal.vx;
        petal.y += petal.vy;
        petal.rotation += petal.vr;

        if (petal.y > h + 16) {
          petal.y = -16;
          petal.x = Math.random() * w;
        }
        if (petal.x < -16) petal.x = w + 16;
        if (petal.x > w + 16) petal.x = -16;

        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rotation);
        ctx.globalAlpha = petal.alpha;
        ctx.fillStyle = petal.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, petal.size, petal.size * 0.62, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("resize", resize);
      petalsRef.current = [];
    };
  }, [enabled, intensity]);

  if (!enabled) return null;

  return <canvas ref={canvasRef} data-testid="petals-overlay" className="pointer-events-none fixed inset-0 z-[58]" aria-hidden />;
}

