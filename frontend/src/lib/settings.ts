"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Locale = "en" | "fr";
export type ThemePreference = "system" | "light" | "dark";
export type Density = "normal" | "dense";

function setLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `cv_shortlister_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

type SettingsState = {
  locale: Locale;
  themePreference: ThemePreference;
  reducedMotion: boolean;
  density: Density;
  focusMode: boolean;
  notificationsEnabled: boolean;
  seasonalEffects: boolean;
  soundEnabled: boolean;
  snowTriggerCount: number;
  confettiTriggerCount: number;
  magicHighlightCount: number;
  setLocale: (locale: Locale) => void;
  setThemePreference: (theme: ThemePreference) => void;
  setReducedMotion: (value: boolean) => void;
  setDensity: (density: Density) => void;
  setFocusMode: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setSeasonalEffects: (value: boolean) => void;
  setSoundEnabled: (value: boolean) => void;
  triggerSnow: () => void;
  triggerConfetti: () => void;
  triggerMagicHighlight: () => void;
};

const storage = createJSONStorage(() => localStorage);

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "en",
      themePreference: "system",
      reducedMotion: false,
      density: "normal",
      focusMode: false,
      notificationsEnabled: true,
      seasonalEffects: false,
      soundEnabled: false,
      snowTriggerCount: 0,
      confettiTriggerCount: 0,
      magicHighlightCount: 0,
      setLocale: (locale) => {
        setLocaleCookie(locale);
        set({ locale });
      },
      setThemePreference: (themePreference) => set({ themePreference }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setDensity: (density) => set({ density }),
      setFocusMode: (focusMode) => set({ focusMode }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setSeasonalEffects: (seasonalEffects) => set({ seasonalEffects }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      triggerSnow: () => set((state) => ({ snowTriggerCount: state.snowTriggerCount + 1 })),
      triggerConfetti: () => set((state) => ({ confettiTriggerCount: state.confettiTriggerCount + 1 })),
      triggerMagicHighlight: () => set((state) => ({ magicHighlightCount: state.magicHighlightCount + 1 })),
    }),
    {
      name: "cv-shortlister-settings",
      storage,
      partialize: (state) => ({
        locale: state.locale,
        themePreference: state.themePreference,
        reducedMotion: state.reducedMotion,
        density: state.density,
        focusMode: state.focusMode,
        notificationsEnabled: state.notificationsEnabled,
        seasonalEffects: state.seasonalEffects,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);
