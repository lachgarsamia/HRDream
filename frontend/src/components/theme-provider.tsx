"use client";

import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { type ThemePreference, useSettingsStore } from "@/lib/settings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemePreferenceSync />
      {children}
    </NextThemeProvider>
  );
}

function ThemePreferenceSync() {
  const { theme, setTheme } = useNextTheme();
  const storedPreference = useSettingsStore((state) => state.themePreference);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!storedPreference) return;
    if (theme === storedPreference) return;
    setTheme(storedPreference);
  }, [mounted, setTheme, storedPreference, theme]);

  return null;
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setAppTheme = useCallback(
    (nextTheme: ThemePreference) => {
      setTheme(nextTheme);
      setThemePreference(nextTheme);
    },
    [setTheme, setThemePreference]
  );

  return {
    mounted,
    theme: (theme as "light" | "dark" | "system" | undefined) ?? "system",
    resolvedTheme: (resolvedTheme as "light" | "dark" | undefined) ?? "light",
    setTheme: setAppTheme,
    toggleTheme: () => setAppTheme(resolvedTheme === "dark" ? "light" : "dark"),
  };
}
