"use client";

import { Toaster } from "@/components/ui/sonner";
import { useSettingsStore } from "@/lib/settings";

export function AppToaster() {
  const enabled = useSettingsStore((state) => state.notificationsEnabled);
  if (!enabled) return null;
  return <Toaster />;
}
