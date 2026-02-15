"use client";

import { useEffect, useMemo, useState } from "react";

export function useTypingPulse(delay = 140) {
  const [pulsing, setPulsing] = useState(false);

  const api = useMemo(() => {
    let timer: number | null = null;
    return {
      onType: () => {
        setPulsing(true);
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => setPulsing(false), delay);
      },
      cleanup: () => {
        if (timer) window.clearTimeout(timer);
      },
    };
  }, [delay]);

  useEffect(() => () => api.cleanup(), [api]);

  return { pulsing, onType: api.onType };
}

