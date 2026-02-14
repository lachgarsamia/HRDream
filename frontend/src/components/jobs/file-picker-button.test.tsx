import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { FilePickerButton } from "@/components/jobs/file-picker-button";

describe("FilePickerButton", () => {
  it("clicking button triggers hidden input click", () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    render(<FilePickerButton label="Select files" onFilesSelected={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "Select files" }));

    expect(clickSpy).toHaveBeenCalled();
  });
});
