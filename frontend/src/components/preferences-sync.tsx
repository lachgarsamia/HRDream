"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/settings";

export function PreferencesSync() {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  const density = useSettingsStore((state) => state.density);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);

  return null;
}
