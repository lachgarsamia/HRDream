import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DeleteJobDialog } from "@/components/jobs/delete-job-dialog";

describe("DeleteJobDialog", () => {
  it("requires exact job name before confirming deletion", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteJobDialog
        jobId={42}
        jobName="Platform Engineer"
        candidateCount={12}
        onConfirm={onConfirm}
        trigger={<button type="button">Delete</button>}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const deleteButton = screen.getByRole("button", { name: "Delete job" });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Type Platform Engineer to confirm/i), {
      target: { value: "Platform Engineer" },
    });
    expect(deleteButton).toBeEnabled();

    fireEvent.click(deleteButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

