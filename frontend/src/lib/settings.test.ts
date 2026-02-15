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
});
