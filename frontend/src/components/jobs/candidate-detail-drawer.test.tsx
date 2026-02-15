import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandidateDetailDrawer } from "@/components/jobs/candidate-detail-drawer";
import type { JobCandidateDetail, RunResultItem } from "@/lib/jobs";

const baseResult: RunResultItem = {
  score_id: 11,
  candidate_id: 7,
  job_id: 3,
  run_id: 5,
  full_name: "Alice Candidate",
  email: "alice@example.com",
  phone: "+12025550180",
  location: "Paris, France",
  years_experience_est: 6,
  skills_top_json: { items: ["React", "TypeScript"] },
  total_score: 86.2,
  breakdown_json: { breakdown: { skills: 88 }, reason: "Strong must-have match" },
  decision: "shortlisted",
};

const baseCandidate: JobCandidateDetail = {
  id: 7,
  job_id: 3,
  file_id: 9,
  full_name: "Alice Candidate",
  email: "alice@example.com",
  phone: "+12025550180",
  location: "Paris, France",
  years_experience_est: 6,
  skills_top_json: { items: ["React", "TypeScript"] },
  extracted_contacts_json: {
    email: { value: "alice@example.com", confidence: 0.94 },
    phone: { value: "+12025550180", confidence: 0.9 },
  },
  extracted_meta_json: null,
  parsing_warnings_json: { items: ["missing_dates"] },
  status: "indexed",
  batch_id: "batch-1",
  file_status: "indexed",
  warnings_json: { items: ["missing_dates"] },
  created_at: new Date().toISOString(),
  structured_json: null,
  file_name: "alice_cv.pdf",
  file_mime_type: "application/pdf",
  cv_available: true,
};

describe("CandidateDetailDrawer", () => {
  it("renders candidate details and triggers cv/status actions", () => {
    const onViewCv = vi.fn();
    const onDownloadCv = vi.fn();
    const onStatusChange = vi.fn();
    const onCopy = vi.fn();

    render(
      <CandidateDetailDrawer
        open
        result={baseResult}
        candidate={baseCandidate}
        loading={false}
        onOpenChange={() => {}}
        onCopy={onCopy}
        onViewCv={onViewCv}
        onDownloadCv={onDownloadCv}
        onStatusChange={onStatusChange}
      />
    );

    expect(screen.getByText("Alice Candidate")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Copy" })[0]);
    expect(onCopy).toHaveBeenCalledWith("alice@example.com");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(onStatusChange).toHaveBeenCalledWith("rejected");

    expect(onViewCv).not.toHaveBeenCalled();
    expect(onDownloadCv).not.toHaveBeenCalled();
  });
});
