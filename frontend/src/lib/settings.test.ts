import { beforeEach, describe, expect, it } from "vitest";
import { useSettingsStore } from "@/lib/settings";

describe("settings store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
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
    });
  });

  it("updates theme preference without recursive updates", () => {
    const setThemePreference = useSettingsStore.getState().setThemePreference;
    setThemePreference("dark");
    expect(useSettingsStore.getState().themePreference).toBe("dark");
    setThemePreference("light");
    expect(useSettingsStore.getState().themePreference).toBe("light");
  });

  it("unlocks party mode after 7 logo taps", () => {
    const registerLogoTap = useSettingsStore.getState().registerLogoTap;
    let unlocked = false;
    for (let i = 0; i < 7; i += 1) {
      unlocked = registerLogoTap();
    }
    expect(unlocked).toBe(true);
    expect(useSettingsStore.getState().partyMode).toBe(true);
  });

  it("persists locale cookie when language changes", () => {
    useSettingsStore.getState().setLocale("fr");
    expect(document.cookie).toContain("cv_shortlister_locale=fr");
  });

  it("toggles seasonal effects and triggers snow preview state", () => {
    useSettingsStore.getState().setSeasonalEffects(true);
    useSettingsStore.getState().trySnow();

    const state = useSettingsStore.getState();
    expect(state.seasonalEffects).toBe(true);
    expect(state.snowTriggerCount).toBe(1);
    expect(state.snowPreviewUntil).not.toBeNull();
  });

  it("stores accent settings for personalization", () => {
    useSettingsStore.getState().setAccentPreset("emerald");
    useSettingsStore.getState().setCustomAccentHex("#22c55e");
    expect(useSettingsStore.getState().accentPreset).toBe("emerald");
    expect(useSettingsStore.getState().customAccentHex).toBe("#22c55e");
  });
});
