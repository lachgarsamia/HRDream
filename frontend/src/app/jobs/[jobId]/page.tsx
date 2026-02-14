import { notFound } from "next/navigation";
import { JobWorkspaceClient } from "@/components/jobs/job-workspace-client";

type JobPageProps = {
  params: { jobId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function JobWorkspacePage({ params, searchParams }: JobPageProps) {
  const jobId = Number(params.jobId);
  if (!Number.isFinite(jobId) || jobId <= 0) {
    notFound();
  }

  const tabParam = searchParams?.tab;
  const initialTab = typeof tabParam === "string" ? tabParam : undefined;

  return <JobWorkspaceClient jobId={jobId} initialTab={initialTab} />;
}
