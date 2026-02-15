"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AuroraLayer } from "@/components/delight/aurora-layer";
import { ConfettiBurst } from "@/components/delight/confetti-burst";
import { PetalsOverlay } from "@/components/delight/petals-overlay";
import { SnowOverlay } from "@/components/delight/snow-overlay";
import { SunbeamsOverlay } from "@/components/delight/sunbeams-overlay";
import { useTheme } from "@/components/theme-provider";
import { useSettingsStore } from "@/lib/settings";

export function GlobalEffects() {
  const { resolvedTheme } = useTheme();
  const seasonalEffects = useSettingsStore((state) => state.seasonalEffects);
  const seasonalStyle = useSettingsStore((state) => state.seasonalStyle);
  const snowIntensity = useSettingsStore((state) => state.snowIntensity);
  const auroraEnabled = useSettingsStore((state) => state.auroraEnabled);
  const auroraOpacity = useSettingsStore((state) => state.auroraOpacity);
  const partyMode = useSettingsStore((state) => state.partyMode);
  const confettiStyle = useSettingsStore((state) => state.confettiStyle);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const animationsEnabled = useSettingsStore((state) => state.animationsEnabled);
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const snowPreviewUntil = useSettingsStore((state) => state.snowPreviewUntil);
  const partyBurstTick = useSettingsStore((state) => state.partyBurstTick);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion || reducedMotionSetting || !animationsEnabled;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!snowPreviewUntil) return;
    const remaining = snowPreviewUntil - Date.now();
    if (remaining <= 0) {
      setNowMs(Date.now());
      return;
    }
    const timer = window.setTimeout(() => setNowMs(Date.now()), remaining + 5);
    return () => window.clearTimeout(timer);
  }, [snowPreviewUntil]);

  const snowPreviewOn = Boolean(snowPreviewUntil && nowMs < snowPreviewUntil);
  const seasonalActive = !reduceMotion && (seasonalEffects || snowPreviewOn);
  const resolvedSeasonalStyle =
    seasonalStyle === "auto" ? (resolvedTheme === "dark" ? "snow" : "sunbeams") : seasonalStyle;
  const snowOn = seasonalActive && resolvedSeasonalStyle === "snow";
  const petalsOn = seasonalActive && resolvedSeasonalStyle === "petals";
  const sunbeamsOn = seasonalActive && resolvedSeasonalStyle === "sunbeams";
  const confettiEnabled = !reduceMotion && partyMode;

  return (
    <>
      <AuroraLayer enabled={auroraEnabled && !reduceMotion} opacity={auroraOpacity} />
      <SunbeamsOverlay enabled={sunbeamsOn} intensity={snowIntensity} />
      <PetalsOverlay enabled={petalsOn} intensity={snowIntensity} />
      <SnowOverlay enabled={snowOn} intensity={snowIntensity} />
      <ConfettiBurst trigger={partyBurstTick} enabled={confettiEnabled} style={confettiStyle} soundEnabled={soundEnabled} />
    </>
  );
}
