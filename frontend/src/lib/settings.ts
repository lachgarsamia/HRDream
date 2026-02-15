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
  animationsEnabled: boolean;
  smoothTransitions: boolean;
  density: Density;
  focusMode: boolean;
  notificationsEnabled: boolean;
  seasonalEffects: boolean;
  auroraEnabled: boolean;
  typingAmbience: boolean;
  partyMode: boolean;
  soundEnabled: boolean;
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
  setFocusMode: (value: boolean) => void;
  setNotificationsEnabled: (value: boolean) => void;
  setSeasonalEffects: (value: boolean) => void;
  setAuroraEnabled: (value: boolean) => void;
  setTypingAmbience: (value: boolean) => void;
  setPartyMode: (value: boolean) => void;
  setSoundEnabled: (value: boolean) => void;
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
      focusMode: false,
      notificationsEnabled: true,
      seasonalEffects: false,
      auroraEnabled: false,
      typingAmbience: true,
      partyMode: false,
      soundEnabled: false,
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
      setFocusMode: (focusMode) => set({ focusMode }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setSeasonalEffects: (seasonalEffects) => set({ seasonalEffects }),
      setAuroraEnabled: (auroraEnabled) => set({ auroraEnabled }),
      setTypingAmbience: (typingAmbience) => set({ typingAmbience }),
      setPartyMode: (partyMode) => set({ partyMode }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      triggerSnow: () => set((state) => ({ snowTriggerCount: state.snowTriggerCount + 1 })),
      triggerConfetti: () => set((state) => ({ confettiTriggerCount: state.confettiTriggerCount + 1 })),
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
        focusMode: state.focusMode,
        notificationsEnabled: state.notificationsEnabled,
        seasonalEffects: state.seasonalEffects,
        auroraEnabled: state.auroraEnabled,
        typingAmbience: state.typingAmbience,
        partyMode: state.partyMode,
        soundEnabled: state.soundEnabled,
      }),
    }
  )
);
