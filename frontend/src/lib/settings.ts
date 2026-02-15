"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Locale = "en" | "fr";
export type ThemePreference = "system" | "light" | "dark";
export type Density = "normal" | "dense";
export type AccentPreset = "system" | "indigo" | "emerald" | "rose" | "amber" | "cyan" | "custom";
export type SeasonalStyle = "auto" | "snow" | "petals" | "sunbeams";
export type ConfettiStyle = "celebration" | "streamers" | "sparkle";

function setLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `cv_shortlister_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

type SettingsState = {
  locale: Locale;
  themePreference: ThemePreference;
  reducedMotion: boolean;
  animationsEnabled: boolean;
  smoothTransitions: boolean;
  density: Density;
  accentPreset: AccentPreset;
  customAccentHex: string;
  focusMode: boolean;
  notificationsEnabled: boolean;
  seasonalEffects: boolean;
  seasonalStyle: SeasonalStyle;
  snowIntensity: number;
  auroraEnabled: boolean;
  auroraOpacity: number;
  typingAmbience: boolean;
  partyMode: boolean;
  confettiStyle: ConfettiStyle;
  soundEnabled: boolean;
  snowPreviewUntil: number | null;
  partyBurstTick: number;
  snowTriggerCount: number;
  confettiTriggerCount: number;
  magicHighlightCount: number;
  logoTapCount: number;
  setLocale: (locale: Locale) => void;
  setThemePreference: (theme: ThemePreference) => void;
  setReducedMotion: (value: boolean) => void;
  setAnimationsEnabled: (value: boolean) => void;
  setSmoothTransitions: (value: boolean) => void;
  setDensity: (density: Density) => void;
  setAccentPreset: (preset: AccentPreset) => void;
  setCustomAccentHex: (hex: string) => void;
  setFocusMode: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setSeasonalEffects: (value: boolean) => void;
  setSeasonalStyle: (value: SeasonalStyle) => void;
  setSnowIntensity: (value: number) => void;
  setAuroraEnabled: (value: boolean) => void;
  setAuroraOpacity: (value: number) => void;
  setTypingAmbience: (value: boolean) => void;
  setPartyMode: (value: boolean) => void;
  setConfettiStyle: (value: ConfettiStyle) => void;
  setSoundEnabled: (value: boolean) => void;
  trySnow: () => void;
  burstConfetti: () => void;
  triggerSnow: () => void;
  triggerConfetti: () => void;
  triggerMagicHighlight: () => void;
  registerLogoTap: () => boolean;
};

const storage = createJSONStorage(() => localStorage);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "en",
      themePreference: "system",
      reducedMotion: false,
      animationsEnabled: true,
      smoothTransitions: true,
      density: "normal",
      accentPreset: "system",
      customAccentHex: "#6366f1",
      focusMode: false,
      notificationsEnabled: true,
      seasonalEffects: false,
      seasonalStyle: "auto",
      snowIntensity: 1,
      auroraEnabled: false,
      auroraOpacity: 0.55,
      typingAmbience: true,
      partyMode: false,
      confettiStyle: "celebration",
      soundEnabled: false,
      snowPreviewUntil: null,
      partyBurstTick: 0,
      snowTriggerCount: 0,
      confettiTriggerCount: 0,
      magicHighlightCount: 0,
      logoTapCount: 0,
      setLocale: (locale) => {
        setLocaleCookie(locale);
        set({ locale });
      },
      setThemePreference: (themePreference) => set({ themePreference }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setSmoothTransitions: (smoothTransitions) => set({ smoothTransitions }),
      setDensity: (density) => set({ density }),
      setAccentPreset: (accentPreset) => set({ accentPreset }),
      setCustomAccentHex: (customAccentHex) => set({ customAccentHex }),
      setFocusMode: (focusMode) => set({ focusMode }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setSeasonalEffects: (seasonalEffects) => set({ seasonalEffects }),
      setSeasonalStyle: (seasonalStyle) => set({ seasonalStyle }),
      setSnowIntensity: (snowIntensity) =>
        set({
          snowIntensity: Math.min(2, Math.max(0.4, Number.isFinite(snowIntensity) ? snowIntensity : 1)),
        }),
      setAuroraEnabled: (auroraEnabled) => set({ auroraEnabled }),
      setAuroraOpacity: (auroraOpacity) =>
        set({
          auroraOpacity: Math.min(0.9, Math.max(0.15, Number.isFinite(auroraOpacity) ? auroraOpacity : 0.55)),
        }),
      setTypingAmbience: (typingAmbience) => set({ typingAmbience }),
      setPartyMode: (partyMode) => set({ partyMode }),
      setConfettiStyle: (confettiStyle) => set({ confettiStyle }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      trySnow: () =>
        set((state) => ({
          snowPreviewUntil: Date.now() + 10_000,
          snowTriggerCount: state.snowTriggerCount + 1,
        })),
      burstConfetti: () =>
        set((state) => ({
          partyBurstTick: state.partyBurstTick + 1,
          confettiTriggerCount: state.confettiTriggerCount + 1,
        })),
      triggerSnow: () =>
        set((state) => ({
          snowPreviewUntil: Date.now() + 10_000,
          snowTriggerCount: state.snowTriggerCount + 1,
        })),
      triggerConfetti: () =>
        set((state) => ({
          partyBurstTick: state.partyBurstTick + 1,
          confettiTriggerCount: state.confettiTriggerCount + 1,
        })),
      triggerMagicHighlight: () => set((state) => ({ magicHighlightCount: state.magicHighlightCount + 1 })),
      registerLogoTap: () => {
        let unlocked = false;
        set((state) => {
          const nextCount = state.logoTapCount + 1;
          if (nextCount >= 7 && !state.partyMode) {
            unlocked = true;
            return { logoTapCount: 0, partyMode: true };
          }
          return { logoTapCount: nextCount };
        });
        return unlocked;
      },
    }),
    {
      name: "cv-shortlister-settings",
      storage,
      partialize: (state) => ({
        locale: state.locale,
        themePreference: state.themePreference,
        reducedMotion: state.reducedMotion,
        animationsEnabled: state.animationsEnabled,
        smoothTransitions: state.smoothTransitions,
        density: state.density,
        accentPreset: state.accentPreset,
        customAccentHex: state.customAccentHex,
        focusMode: state.focusMode,
        notificationsEnabled: state.notificationsEnabled,
        seasonalEffects: state.seasonalEffects,
        seasonalStyle: state.seasonalStyle,
        snowIntensity: state.snowIntensity,
        auroraEnabled: state.auroraEnabled,
        auroraOpacity: state.auroraOpacity,
        typingAmbience: state.typingAmbience,
        partyMode: state.partyMode,
        confettiStyle: state.confettiStyle,
        soundEnabled: state.soundEnabled,
        snowPreviewUntil: state.snowPreviewUntil,
        partyBurstTick: state.partyBurstTick,
      }),
    }
  )
);
