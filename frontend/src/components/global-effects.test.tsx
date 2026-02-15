import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalEffects } from "@/components/global-effects";
import { useSettingsStore } from "@/lib/settings";

let resolvedThemeMock: "light" | "dark" = "dark";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({
    resolvedTheme: resolvedThemeMock,
  }),
}));

describe("GlobalEffects", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  it("shows snow preview and auto-stops after 10 seconds", () => {
    resolvedThemeMock = "dark";
    render(<GlobalEffects />);
    act(() => {
      useSettingsStore.getState().triggerSnow();
    });

    expect(screen.queryByTestId("snow-overlay")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10020);
    });
    expect(screen.queryByTestId("snow-overlay")).not.toBeInTheDocument();
  });

  it("uses light seasonal overlay instead of snow in light mode", () => {
    resolvedThemeMock = "light";
    useSettingsStore.setState({ seasonalEffects: true, seasonalStyle: "auto" });
    render(<GlobalEffects />);
    expect(screen.queryByTestId("snow-overlay")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sunbeams-overlay")).toBeInTheDocument();
  });

  it("prevents snow/confetti when reduced motion is enabled", () => {
    useSettingsStore.setState({ reducedMotion: true, seasonalEffects: true, partyMode: true });
    render(<GlobalEffects />);
    act(() => {
      useSettingsStore.getState().triggerSnow();
      useSettingsStore.getState().triggerConfetti();
    });

    expect(screen.queryByTestId("snow-overlay")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confetti-burst")).not.toBeInTheDocument();
  });

  it("rate-limits confetti bursts in party mode", () => {
    useSettingsStore.setState({ partyMode: true });
    render(<GlobalEffects />);

    act(() => {
      useSettingsStore.getState().triggerConfetti();
      useSettingsStore.getState().triggerConfetti();
    });
    expect(screen.queryByTestId("confetti-count")).toHaveTextContent("1");

    act(() => {
      vi.advanceTimersByTime(1900);
    });
    act(() => {
      useSettingsStore.getState().triggerConfetti();
    });
    expect(screen.queryByTestId("confetti-count")).toHaveTextContent("2");
  });
});
