import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesSync } from "@/components/preferences-sync";
import { useSettingsStore } from "@/lib/settings";

let resolvedThemeMock: "light" | "dark" = "light";

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({
    resolvedTheme: resolvedThemeMock,
  }),
}));

describe("PreferencesSync", () => {
  beforeEach(() => {
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

  it("applies theme preference metadata and accent variables", () => {
    resolvedThemeMock = "dark";
    useSettingsStore.setState({ themePreference: "system", accentPreset: "emerald" });
    render(<PreferencesSync />);
    expect(document.documentElement.dataset.themePreference).toBe("system");
    expect(document.documentElement.dataset.resolvedTheme).toBe("dark");
    expect(document.documentElement.style.getPropertyValue("--primary")).not.toBe("");
  });

  it("updates accent variables for custom accent", () => {
    resolvedThemeMock = "light";
    useSettingsStore.setState({ accentPreset: "custom", customAccentHex: "#f43f5e" });
    render(<PreferencesSync />);
    const primary = document.documentElement.style.getPropertyValue("--primary");
    expect(primary).toContain(" ");
    expect(primary).toContain("%");
  });
});

