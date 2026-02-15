import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MotionShell } from "@/components/motion-shell";
import { useSettingsStore } from "@/lib/settings";

let mockedPathname = "/jobs";

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => false,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    },
  };
});

describe("MotionShell", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      reducedMotion: false,
      smoothTransitions: true,
    });
    mockedPathname = "/jobs";
  });

  it("renders content across route key changes without loop/crash", () => {
    const { rerender } = render(
      <MotionShell>
        <div>Page A</div>
      </MotionShell>
    );
    expect(screen.getByText("Page A")).toBeInTheDocument();

    mockedPathname = "/settings";
    rerender(
      <MotionShell>
        <div>Page B</div>
      </MotionShell>
    );
    expect(screen.getByText("Page B")).toBeInTheDocument();
  });
});

