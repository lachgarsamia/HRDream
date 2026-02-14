"use client";

import { ThemeProvider as NextThemeProvider, useTheme as useNextTheme } from "next-themes";
import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemeProvider>
  );
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  const storedPreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);

  useEffect(() => {
    if (!theme || theme === storedPreference) return;
    if (theme === "light" || theme === "dark" || theme === "system") {
      setThemePreference(theme);
    }
  }, [setThemePreference, storedPreference, theme]);

  useEffect(() => {
    if (storedPreference && storedPreference !== theme) {
      setTheme(storedPreference);
    }
  }, [setTheme, storedPreference, theme]);

  return {
    theme: (theme as "light" | "dark" | "system" | undefined) ?? "system",
    resolvedTheme: (resolvedTheme as "light" | "dark" | undefined) ?? "light",
    setTheme,
    toggleTheme: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
  };
}
