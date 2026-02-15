import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useTypingPulse } from "@/hooks/use-typing-pulse";

function TypingPulseHarness() {
  const { pulsing, onType } = useTypingPulse(500);
  return (
    <div>
      <input aria-label="search" onChange={onType} />
      <span data-testid="pulse-state">{pulsing ? "on" : "off"}</span>
    </div>
  );
}

describe("useTypingPulse", () => {
  it("activates pulse on input change", () => {
    vi.useFakeTimers();
    render(<TypingPulseHarness />);
    fireEvent.change(screen.getByLabelText("search"), { target: { value: "rea" } });
    expect(screen.getByTestId("pulse-state")).toHaveTextContent("on");

    act(() => {
      vi.advanceTimersByTime(520);
    });
    expect(screen.getByTestId("pulse-state")).toHaveTextContent("off");
    vi.useRealTimers();
  });
});

