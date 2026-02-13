"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ApiError } from "@/lib/api";
import {
  createJobRun,
  downloadRunCsv,
  downloadRunPdf,
  getJob,
  getJobCandidates,
  getRunExportStatus,
  getJobFiles,
  getJobRuns,
  getRunResults,
  saveJobCriteria,
  uploadJobFiles,
  type Job,
  type JobCandidate,
  type JobFile,
  type RunListItem,
  type RunResultItem,
  type RunResultsResponse,
} from "@/lib/jobs";

type WorkspaceTab = "upload" | "candidates" | "criteria" | "shortlist" | "exports";

const TAB_ORDER: WorkspaceTab[] = ["upload", "candidates", "criteria", "shortlist", "exports"];

type CriteriaState = {
  role_title: string;
  must_have_skills: string;
  nice_to_have_skills: string;
  location_mode: "any" | "remote" | "hybrid" | "onsite";
  min_years_experience: number;
  reject_if_missing_must_have: boolean;
  reject_if_location_mismatch: boolean;
  reject_if_min_exp_not_met: boolean;
};

function parseTab(value: string | null): WorkspaceTab {
  if (value === "upload" || value === "candidates" || value === "criteria" || value === "shortlist" || value === "exports") {
    return value;
  }
  return "upload";
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getErrorMessage(error: ApiError | null): string {
  if (!error) return "";
  if (error.status === 401) return "Session expired. Please log in again.";
  if (error.status === 403) return "You do not have access to this job.";
  if (error.status === 404) return "Job not found.";
  if (error.status === 422) return "Request invalid. Please refresh the page.";
  return "Something went wrong while loading this job.";
}

function confidenceBadge(confidence: number | null | undefined) {
  if (confidence === null || confidence === undefined) {
    return <Badge variant="outline">unknown</Badge>;
  }
  if (confidence >= 0.85) {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">high</Badge>;
  }
  if (confidence >= 0.6) {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">medium</Badge>;
  }
  return <Badge variant="destructive">low</Badge>;
}

export default function JobWorkspacePage() {
  const params = useParams<{ jobId?: string | string[] }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const rawJobId = Array.isArray(params?.jobId) ? params.jobId[0] : params?.jobId;
  const jobId = Number(rawJobId);
  const tab = parseTab(searchParams.get("tab"));

  const directoryInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [job, setJob] = useState<Job | null>(null);
  const [files, setFiles] = useState<JobFile[]>([]);
  const [candidates, setCandidates] = useState<JobCandidate[]>([]);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [runResults, setRunResults] = useState<RunResultsResponse | null>(null);
  const [runExportStatus, setRunExportStatus] = useState<{ csv_ready: boolean; pdf_ready: boolean; reason?: string } | null>(null);
  const [selectedResult, setSelectedResult] = useState<RunResultItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [isRunningShortlist, setIsRunningShortlist] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [criteriaSavedAt, setCriteriaSavedAt] = useState<string | null>(null);

  const [criteria, setCriteria] = useState<CriteriaState>({
    role_title: "",
    must_have_skills: "",
    nice_to_have_skills: "",
    location_mode: "any",
    min_years_experience: 3,
    reject_if_missing_must_have: true,
    reject_if_location_mismatch: false,
    reject_if_min_exp_not_met: true,
  });

  const setTab = useCallback((next: WorkspaceTab) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", next);
    router.replace(`${pathname}?${nextParams.toString()}`);
  }, [pathname, router, searchParams]);

  const loadRunResults = useCallback(async (runId: number) => {
    const [data, exportStatus] = await Promise.all([
      getRunResults(runId),
      getRunExportStatus(runId),
    ]);
    setRunResults(data);
    setRunExportStatus(exportStatus);
    setSelectedRunId(runId);
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!Number.isFinite(jobId) || jobId <= 0) {
      setError({ status: 404, detail: "Invalid job id" });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [jobData, fileData, candidateData, runData] = await Promise.all([
        getJob(jobId),
        getJobFiles(jobId, 1, 200),
        getJobCandidates(jobId, 1, 200),
        getJobRuns(jobId, 1, 20),
      ]);

      setJob(jobData);
      setFiles(fileData.items);
      setCandidates(candidateData.items);
      setRuns(runData.items);

      if (runData.items.length > 0) {
        await loadRunResults(runData.items[0].id);
      } else {
        setRunResults(null);
        setSelectedRunId(null);
        setRunExportStatus(null);
      }
    } catch (caught) {
      const apiError = caught as ApiError;
      console.error("[Job workspace load error]", {
        jobId,
        status: apiError?.status,
        detail: apiError?.detail,
      });
      if (apiError?.status === 401) {
        router.push("/login");
        return;
      }
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [jobId, loadRunResults, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isAuthenticated) return;
    void loadWorkspace();
  }, [authLoading, isAuthenticated, loadWorkspace, router]);

  useEffect(() => {
    if (job && !criteria.role_title) {
      setCriteria((prev) => ({ ...prev, role_title: job.name }));
    }
  }, [criteria.role_title, job]);

  const indexedCount = useMemo(() => files.filter((file) => file.status === "indexed").length, [files]);
  const failedCount = useMemo(() => files.filter((file) => file.status === "failed").length, [files]);
  const processingCount = useMemo(
    () => files.filter((file) => !["indexed", "failed"].includes(file.status)).length,
    [files]
  );

  const batches = useMemo(() => {
    const grouped = new Map<string, { total: number; indexed: number; failed: number; time: string }>();
    for (const file of files) {
      const current = grouped.get(file.batch_id) ?? {
        total: 0,
        indexed: 0,
        failed: 0,
        time: file.created_at,
      };
      current.total += 1;
      if (file.status === "indexed") current.indexed += 1;
      if (file.status === "failed") current.failed += 1;
      if (new Date(file.created_at).getTime() > new Date(current.time).getTime()) {
        current.time = file.created_at;
      }
      grouped.set(file.batch_id, current);
    }

    return Array.from(grouped.entries())
      .map(([batchId, meta]) => ({ batchId, ...meta }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [files]);

  const setupChecklist = [
    {
      label: "Upload complete",
      done: indexedCount > 0,
      action: () => setTab("upload"),
      actionLabel: "Upload CVs",
    },
    {
      label: "Criteria saved",
      done: Boolean(criteriaSavedAt),
      action: () => setTab("criteria"),
      actionLabel: "Save criteria",
    },
    {
      label: "Shortlist run exists",
      done: runs.length > 0,
      action: () => setTab("shortlist"),
      actionLabel: "Run shortlist",
    },
  ];

  const runInputSummary = runResults?.provenance;

  const candidateForResult = (result: RunResultItem) => candidates.find((candidate) => candidate.id === result.candidate_id) ?? null;

  const uploadPickedFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Select at least one file first");
      return;
    }

    try {
      setIsUploading(true);
      const response = await uploadJobFiles(jobId, selectedFiles);
      toast.success("Upload complete", {
        description: `Batch ${response.batch_id} indexed ${response.files_created} files.`,
      });
      setSelectedFiles([]);
      await loadWorkspace();
    } catch (caught) {
      const apiError = caught as ApiError;
      console.error("[Upload error]", apiError);
      toast.error("Upload failed", { description: apiError?.detail || "Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const saveCriteria = async () => {
    try {
      setIsSavingCriteria(true);
      const payload = {
        role_title: criteria.role_title,
        must_have_technical_skills: splitCsv(criteria.must_have_skills),
        must_have_frameworks: [],
        must_have_tools: [],
        nice_to_have_skills: splitCsv(criteria.nice_to_have_skills),
        nice_to_have_frameworks: [],
        nice_to_have_tools: [],
        location_mode: criteria.location_mode,
        min_years_experience: criteria.min_years_experience,
        hard_filter_toggles: {
          reject_if_missing_must_have: criteria.reject_if_missing_must_have,
          reject_if_location_mismatch: criteria.reject_if_location_mismatch,
          reject_if_min_exp_not_met: criteria.reject_if_min_exp_not_met,
          reject_if_missing_language: false,
        },
      };

      const result = await saveJobCriteria(jobId, payload);
      setCriteriaSavedAt(result.updated_at);
      toast.success("Criteria saved");
    } catch (caught) {
      const apiError = caught as ApiError;
      console.error("[Save criteria error]", apiError);
      toast.error("Unable to save criteria", { description: apiError?.detail || "Try again." });
    } finally {
      setIsSavingCriteria(false);
    }
  };

  const runShortlist = async () => {
    if (indexedCount === 0) {
      toast.error("Upload CVs first");
      return;
    }

    try {
      setIsRunningShortlist(true);
      const run = await createJobRun(jobId);
      toast.success("Shortlist run completed", {
        description: `Run #${run.id} scored ${run.included_candidate_count} candidates.`,
      });
      await loadWorkspace();
      setTab("shortlist");
    } catch (caught) {
      const apiError = caught as ApiError;
      console.error("[Run shortlist error]", apiError);
      toast.error("Unable to run shortlist", { description: apiError?.detail || "Try again." });
    } finally {
      setIsRunningShortlist(false);
    }
  };

  const shortlistRows = runResults?.items ?? [];
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

  const copyValue = async (value: string | null | undefined) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const exportCsv = async () => {
    if (!selectedRunId) return;
    try {
      setIsDownloadingCsv(true);
      await downloadRunCsv(selectedRunId);
      toast.success("CSV export downloaded");
    } catch (caught) {
      const apiError = caught as ApiError;
      toast.error("CSV export failed", { description: apiError?.detail || "Unable to export run CSV." });
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const exportPdf = async () => {
    if (!selectedRunId) return;
    try {
      setIsDownloadingPdf(true);
      await downloadRunPdf(selectedRunId);
      toast.success("PDF report downloaded");
    } catch (caught) {
      const apiError = caught as ApiError;
      toast.error("PDF export failed", { description: apiError?.detail || "Unable to export run PDF." });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Job workspace" subtitle="Loading workspace...">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error || !job) {
    return (
      <AppShell title="Job workspace" subtitle="Unable to load this job.">
        <Card className="max-w-xl border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {error?.status === 401 ? "Session expired" : error?.status === 403 ? "No access" : error?.status === 404 ? "Job not found" : error?.status === 422 ? "Request invalid" : "Something went wrong"}
            </CardTitle>
            <CardDescription>{getErrorMessage(error)}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {error?.status === 401 ? (
              <Button onClick={() => router.push("/login")}>Go to login</Button>
            ) : (
              <Button onClick={() => void loadWorkspace()}>Retry</Button>
            )}
            <Button variant="outline" onClick={() => router.push("/jobs")}>Back to Jobs</Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={job.name}
      subtitle="Create Job -> Upload CVs -> Define Criteria -> Run Shortlist -> Review Results -> Export"
      contextLabel="Job"
      contextValue={`#${job.id}`}
      primaryAction={
        <Button onClick={runShortlist} disabled={isRunningShortlist || indexedCount === 0}>
          {isRunningShortlist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Run Shortlist
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup checklist</CardTitle>
            <CardDescription>Follow this sequence to keep results trustworthy and scoped to this job.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {setupChecklist.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/80 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Badge variant="outline">Pending</Badge>}
                </div>
                {!item.done ? (
                  <Button size="sm" variant="outline" className="mt-3" onClick={item.action}>
                    {item.actionLabel}
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(value) => setTab(value as WorkspaceTab)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            {TAB_ORDER.map((item) => (
              <TabsTrigger key={item} value={item} className="capitalize">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload batch</CardTitle>
                <CardDescription>Upload PDF, DOCX, or ZIP. Files stay in your workspace and are scoped to this job only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
                  <UploadCloud className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <p className="text-sm text-muted-foreground">Drop files here or use the buttons below.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                        accept=".pdf,.docx,.zip"
                      />
                      <Button type="button" variant="outline">Select files</Button>
                    </Label>
                    <Button type="button" variant="outline" onClick={() => directoryInputRef.current?.click()}>
                      Select folder
                    </Button>
                    <Button type="button" onClick={uploadPickedFiles} disabled={isUploading || selectedFiles.length === 0}>
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
                    </Button>
                    <input
                      ref={directoryInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                      // @ts-expect-error webkitdirectory is intentionally non-standard
                      webkitdirectory=""
                    />
                  </div>
                </div>

                {selectedFiles.length > 0 ? (
                  <div className="rounded-lg border border-border/80 p-3 text-sm text-muted-foreground">
                    Selected: {selectedFiles.slice(0, 5).map((file) => file.name).join(", ")}
                    {selectedFiles.length > 5 ? ` +${selectedFiles.length - 5} more` : ""}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total CVs</CardDescription>
                      <CardTitle className="text-2xl">{files.length}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Indexed</CardDescription>
                      <CardTitle className="text-2xl text-emerald-600">{indexedCount}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Processing</CardDescription>
                      <CardTitle className="text-2xl text-primary">{processingCount}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Failed</CardDescription>
                      <CardTitle className="text-2xl text-destructive">{failedCount}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Batch history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {batches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No batches yet.</p>
                ) : (
                  batches.map((batch) => (
                    <div key={batch.batchId} className="rounded-lg border border-border/80 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs">{batch.batchId}</p>
                        <p className="text-xs text-muted-foreground">{new Date(batch.time).toLocaleString()}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Total {batch.total} · Indexed {batch.indexed} · Failed {batch.failed}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ingestion queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No uploaded files yet.</p>
                ) : (
                  files.map((file) => {
                    const progress = file.status === "indexed" ? 100 : file.status === "failed" ? 100 : 55;
                    return (
                      <div key={file.id} className="rounded-lg border border-border/80 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{file.original_filename}</p>
                          <Badge variant={file.status === "failed" ? "destructive" : "outline"}>{file.status}</Badge>
                        </div>
                        <Progress className="mt-2" value={progress} />
                        {file.warnings_json?.items?.length ? (
                          <p className="mt-2 text-xs text-amber-600">Warnings: {file.warnings_json.items.join(", ")}</p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="candidates">
            <Card>
              <CardHeader>
                <CardTitle>Candidate pool</CardTitle>
                <CardDescription>Only candidates indexed from this job appear here and feed shortlist runs.</CardDescription>
              </CardHeader>
              <CardContent>
                {candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No candidates yet. Upload CVs first.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border/80">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="p-3">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Email conf.</th>
                          <th className="p-3">Phone</th>
                          <th className="p-3">Phone conf.</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">Years</th>
                          <th className="p-3">Top skills</th>
                          <th className="p-3">File status</th>
                          <th className="p-3">Parsing warnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((candidate) => (
                          <tr key={candidate.id} className="border-t border-border/70 hover:bg-muted/30">
                            <td className="p-3 font-medium">{candidate.full_name}</td>
                            <td className="p-3">{candidate.email || "-"}</td>
                            <td className="p-3">
                              {confidenceBadge(candidate.extracted_contacts_json?.email?.confidence)}
                            </td>
                            <td className="p-3">{candidate.phone || "-"}</td>
                            <td className="p-3">
                              {confidenceBadge(candidate.extracted_contacts_json?.phone?.confidence)}
                            </td>
                            <td className="p-3">{candidate.location || "-"}</td>
                            <td className="p-3">{candidate.years_experience_est ?? "-"}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {(candidate.skills_top_json?.items ?? []).slice(0, 4).map((skill) => (
                                  <Badge key={`${candidate.id}-${skill}`} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{candidate.file_status}</Badge>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {(candidate.parsing_warnings_json?.items ?? candidate.warnings_json?.items ?? []).slice(0, 3).map((warning) => (
                                  <Badge key={`${candidate.id}-${warning}`} variant="outline" className="text-xs">
                                    {warning}
                                  </Badge>
                                ))}
                                {(candidate.parsing_warnings_json?.items ?? candidate.warnings_json?.items ?? []).length === 0 ? "-" : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="criteria">
            <Card>
              <CardHeader>
                <CardTitle>Criteria</CardTitle>
                <CardDescription>Define structured criteria used by shortlist scoring for this job.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Role title</Label>
                    <Input
                      value={criteria.role_title}
                      onChange={(event) => setCriteria((prev) => ({ ...prev, role_title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location mode</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={criteria.location_mode}
                      onChange={(event) => setCriteria((prev) => ({ ...prev, location_mode: event.target.value as CriteriaState["location_mode"] }))}
                    >
                      <option value="any">Any</option>
                      <option value="remote">Remote only</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">Onsite only</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Must-have skills (comma separated)</Label>
                  <Textarea
                    value={criteria.must_have_skills}
                    onChange={(event) => setCriteria((prev) => ({ ...prev, must_have_skills: event.target.value }))}
                    placeholder="react, typescript, design systems"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nice-to-have skills (comma separated)</Label>
                  <Textarea
                    value={criteria.nice_to_have_skills}
                    onChange={(event) => setCriteria((prev) => ({ ...prev, nice_to_have_skills: event.target.value }))}
                    placeholder="next.js, jest"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Minimum years of experience</Label>
                    <Input
                      type="number"
                      min={0}
                      value={criteria.min_years_experience}
                      onChange={(event) =>
                        setCriteria((prev) => ({
                          ...prev,
                          min_years_experience: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={criteria.reject_if_missing_must_have}
                      onChange={(event) => setCriteria((prev) => ({ ...prev, reject_if_missing_must_have: event.target.checked }))}
                    />
                    Reject missing must-have
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={criteria.reject_if_location_mismatch}
                      onChange={(event) => setCriteria((prev) => ({ ...prev, reject_if_location_mismatch: event.target.checked }))}
                    />
                    Reject location mismatch
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={criteria.reject_if_min_exp_not_met}
                      onChange={(event) => setCriteria((prev) => ({ ...prev, reject_if_min_exp_not_met: event.target.checked }))}
                    />
                    Reject below min experience
                  </label>
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveCriteria} disabled={isSavingCriteria}>
                    {isSavingCriteria ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Criteria
                  </Button>
                  <Button variant="outline" onClick={runShortlist} disabled={isRunningShortlist || indexedCount === 0}>
                    Run Shortlist
                  </Button>
                  {criteriaSavedAt ? (
                    <p className="self-center text-xs text-muted-foreground">Saved {new Date(criteriaSavedAt).toLocaleString()}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shortlist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shortlist</CardTitle>
                <CardDescription>Evidence-backed ranking for this job candidate pool only.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={runShortlist} disabled={isRunningShortlist || indexedCount === 0}>
                    {isRunningShortlist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Run Shortlist
                  </Button>
                  <select
                    value={selectedRunId ?? ""}
                    onChange={async (event) => {
                      const nextRunId = Number(event.target.value);
                      if (nextRunId > 0) {
                        await loadRunResults(nextRunId);
                      }
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {runs.length === 0 ? <option value="">No runs yet</option> : null}
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        Run #{run.id} · {run.status}
                      </option>
                    ))}
                  </select>
                </div>

                {runInputSummary ? (
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-sm">
                    <p>
                      This run used {runInputSummary.included_candidate_count} candidates from batches {runInputSummary.included_batches.join(", ") || "n/a"}.
                    </p>
                    <p className="text-muted-foreground">
                      Criteria version: {runInputSummary.criteria_version} · Scoring config: {runInputSummary.scoring_config_version}
                    </p>
                  </div>
                ) : null}

                {shortlistRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shortlist results yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border/80">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/50 text-left">
                        <tr>
                          <th className="p-3">Name</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Phone</th>
                          <th className="p-3">Location</th>
                          <th className="p-3">Exp yrs</th>
                          <th className="p-3">Must-have %</th>
                          <th className="p-3">Warnings</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortlistRows.map((row) => {
                          const candidate = candidateForResult(row);
                          const mustHaveCoverage = Math.round(row.breakdown_json?.breakdown?.skills ?? 0);
                          return (
                            <tr
                              key={row.score_id}
                              className="cursor-pointer border-t border-border/70 hover:bg-muted/30"
                              onClick={() => setSelectedResult(row)}
                            >
                              <td className="p-3 font-medium">{row.full_name}</td>
                              <td className="p-3">{row.email || "-"}</td>
                              <td className="p-3">{row.phone || "-"}</td>
                              <td className="p-3">{row.location || "-"}</td>
                              <td className="p-3">{row.years_experience_est ?? "-"}</td>
                              <td className="p-3">{mustHaveCoverage}%</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {(candidate?.parsing_warnings_json?.items ?? []).slice(0, 2).map((warning) => (
                                    <Badge key={`${row.score_id}-${warning}`} variant="outline" className="text-xs">
                                      {warning}
                                    </Badge>
                                  ))}
                                  {(candidate?.parsing_warnings_json?.items?.length ?? 0) === 0 ? "-" : null}
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant={row.decision === "shortlisted" ? "default" : row.decision === "rejected" ? "destructive" : "outline"}>
                                  {row.decision}
                                </Badge>
                              </td>
                              <td className="p-3 font-semibold">{row.total_score.toFixed(1)}</td>
                              {candidate ? null : null}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exports">
            <Card>
              <CardHeader>
                <CardTitle>Exports</CardTitle>
                <CardDescription>Download shortlist outputs for your consulting workflow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-sm">Run</Label>
                  <select
                    value={selectedRunId ?? ""}
                    onChange={async (event) => {
                      const nextRunId = Number(event.target.value);
                      if (nextRunId > 0) {
                        await loadRunResults(nextRunId);
                      }
                    }}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {runs.length === 0 ? <option value="">No runs yet</option> : null}
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        Run #{run.id} · {run.status}
                      </option>
                    ))}
                  </select>
                  <Badge variant="outline">
                    {runExportStatus?.reason ? runExportStatus.reason : selectedRun?.status ?? "n/a"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={!selectedRunId || selectedRun?.status !== "completed" || !runExportStatus?.csv_ready || isDownloadingCsv}
                    onClick={exportCsv}
                  >
                    {isDownloadingCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Export shortlist CSV
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!selectedRunId || selectedRun?.status !== "completed" || !runExportStatus?.pdf_ready || isDownloadingPdf}
                    onClick={exportPdf}
                  >
                    {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Export PDF report
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exports are enabled only for completed runs. API status is checked via <code>/runs/{`{run_id}`}/export/status</code>.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={Boolean(selectedResult)} onOpenChange={(open) => !open && setSelectedResult(null)}>
        <SheetContent className="w-[460px] sm:w-[560px]">
          <SheetHeader>
            <SheetTitle>{selectedResult?.full_name || "Candidate"}</SheetTitle>
          </SheetHeader>
          {selectedResult ? (
            <div className="mt-4 space-y-4 text-sm">
              {(() => {
                const candidate = candidateForResult(selectedResult);
                return (
                  <div className="rounded-lg border border-border/80 p-3">
                    <p className="mb-2 font-medium">Contacts</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p title={candidate?.extracted_contacts_json?.email?.evidence?.snippet || ""}>
                            {selectedResult.email || "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {confidenceBadge(candidate?.extracted_contacts_json?.email?.confidence)}
                          <Button variant="outline" size="sm" onClick={() => void copyValue(selectedResult.email)}>
                            Copy
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p title={candidate?.extracted_contacts_json?.phone?.evidence?.snippet || ""}>
                            {selectedResult.phone || "-"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {confidenceBadge(candidate?.extracted_contacts_json?.phone?.confidence)}
                          <Button variant="outline" size="sm" onClick={() => void copyValue(selectedResult.phone)}>
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="rounded-lg border border-border/80 p-3">
                <p className="text-muted-foreground">Score</p>
                <p className="text-2xl font-semibold">{selectedResult.total_score.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-border/80 p-3">
                <p className="mb-2 font-medium">Breakdown</p>
                {Object.entries(selectedResult.breakdown_json?.breakdown || {}).map(([key, value]) => (
                  <div key={key} className="mb-2">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="capitalize">{key}</span>
                      <span>{Number(value).toFixed(1)}%</span>
                    </div>
                    <Progress value={Number(value)} />
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border/80 p-3">
                <p className="mb-2 font-medium">Evidence</p>
                {selectedResult.breakdown_json?.reason ? (
                  <p className="text-muted-foreground">Reason: {selectedResult.breakdown_json.reason}</p>
                ) : (
                  <p className="text-muted-foreground">No explicit rejection reason. Review candidate profile and CV.</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">PDF highlight viewer hooks can be attached to this panel.</p>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
