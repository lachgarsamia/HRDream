"use client";

import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useSettingsStore } from "@/lib/settings";

export function MotionShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const smoothTransitions = useSettingsStore((state) => state.smoothTransitions);
  const prefersReducedMotion = useReducedMotion();
  const disableMotion = reducedMotionSetting || prefersReducedMotion || !smoothTransitions;

  if (disableMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
