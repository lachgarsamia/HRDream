"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useSettingsStore } from "@/lib/settings";

const ACCENT_PRESETS: Record<string, string> = {
  system: "#64748b",
  indigo: "#6366f1",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  cyan: "#06b6d4",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace("#", "");
  const safe = normalized.length === 3
    ? normalized
        .split("")
        .map((ch) => `${ch}${ch}`)
        .join("")
    : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(safe)) return null;
  const value = Number.parseInt(safe, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;
  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    switch (max) {
      case rn:
        hue = ((gn - bn) / delta) % 6;
        break;
      case gn:
        hue = (bn - rn) / delta + 2;
        break;
      default:
        hue = (rn - gn) / delta + 4;
        break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: Math.round(hue),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function getContrastText(rgb: { r: number; g: number; b: number }) {
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.62 ? "222 47% 11%" : "210 40% 98%";
}

export function PreferencesSync() {
  const { resolvedTheme } = useTheme();
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const density = useSettingsStore((state) => state.density);
  const themePreference = useSettingsStore((state) => state.themePreference);
  const accentPreset = useSettingsStore((state) => state.accentPreset);
  const customAccentHex = useSettingsStore((state) => state.customAccentHex);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themePreference = themePreference;
    root.dataset.resolvedTheme = resolvedTheme;
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    const root = document.documentElement;
    const systemDefault = resolvedTheme === "dark" ? "#94a3b8" : "#64748b";
    const accentHex =
      accentPreset === "custom"
        ? customAccentHex
        : accentPreset === "system"
          ? systemDefault
          : ACCENT_PRESETS[accentPreset] ?? ACCENT_PRESETS.indigo;
    const rgb = hexToRgb(accentHex);
    if (!rgb) return;
    const hsl = rgbToHsl(rgb);
    const accentLight = Math.min(94, hsl.l + 40);
    root.style.setProperty("--primary", `${hsl.h} ${Math.max(35, hsl.s)}% ${Math.max(36, Math.min(64, hsl.l))}%`);
    root.style.setProperty("--primary-foreground", getContrastText(rgb));
    root.style.setProperty("--ring", `${hsl.h} ${Math.max(42, hsl.s)}% ${Math.max(35, Math.min(70, hsl.l + 5))}%`);
    root.style.setProperty("--accent-soft", `${hsl.h} ${Math.max(25, hsl.s - 8)}% ${accentLight}%`);
  }, [accentPreset, customAccentHex, resolvedTheme]);

  return null;
}
