"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, MoreVertical, Trash2, UploadCloud } from "lucide-react";
import { Bar, BarChart, Brush, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { FilePickerButton } from "@/components/jobs/file-picker-button";
import { CandidateDetailDrawer } from "@/components/jobs/candidate-detail-drawer";
import { DeleteJobDialog } from "@/components/jobs/delete-job-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ApiError } from "@/lib/api";
import {
  createJobRun,
  deleteJob,
  downloadRunCsv,
  downloadRunPdf,
  fetchCandidateCvBlob,
  getJob,
  getJobCandidateDetails,
  getJobCandidates,
  getRunExportStatus,
  getJobFiles,
  getJobRuns,
  getRunResults,
  saveJobCriteria,
  uploadJobFiles,
  type Job,
  type JobCandidate,
  type JobCandidateDetail,
  type JobFile,
  type RunListItem,
  type RunResultItem,
  type RunResultsResponse,
} from "@/lib/jobs";
import { useSettingsStore } from "@/lib/settings";
import { useTypingPulse } from "@/hooks/use-typing-pulse";

type WorkspaceTab = "upload" | "candidates" | "criteria" | "shortlist" | "exports";

const TAB_ORDER: WorkspaceTab[] = ["upload", "candidates", "criteria", "shortlist", "exports"];
const WARNING_FILTERS: WarningFilter[] = ["low_confidence_email", "low_confidence_phone", "missing_dates", "low_text_extraction", "ocr_needed"];

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

type ShortlistStatus = "shortlisted" | "undecided" | "rejected";
type WarningFilter = "low_confidence_email" | "low_confidence_phone" | "missing_dates" | "low_text_extraction" | "ocr_needed";
type SegmentationPreset = "all" | "passing" | "hard_rejected" | "top_matches";

type ShortlistRowView = {
  row: RunResultItem;
  candidate: JobCandidate | null;
  mustHaveCoverage: number;
  warnings: string[];
  hardFilterFailed: boolean;
  reason: string | null;
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

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
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

type JobWorkspaceClientProps = {
  jobId: number;
  initialTab?: string;
};

export function JobWorkspaceClient({ jobId, initialTab }: JobWorkspaceClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const t = useTranslations("workspace");
  const triggerConfetti = useSettingsStore((state) => state.triggerConfetti);
  const triggerMagicHighlight = useSettingsStore((state) => state.triggerMagicHighlight);
  const magicHighlightCount = useSettingsStore((state) => state.magicHighlightCount);
  const typingAmbience = useSettingsStore((state) => state.typingAmbience);
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion || reducedMotionSetting;
  const { pulsing: searchPulsing, onType: onSearchType } = useTypingPulse(500);
  const tab = parseTab(searchParams.get("tab") ?? initialTab ?? null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [job, setJob] = useState<Job | null>(null);
  const [files, setFiles] = useState<JobFile[]>([]);
  const [candidates, setCandidates] = useState<JobCandidate[]>([]);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [runResults, setRunResults] = useState<RunResultsResponse | null>(null);
  const [runExportStatus, setRunExportStatus] = useState<{ csv_ready: boolean; pdf_ready: boolean; reason?: string } | null>(null);
  const [selectedResult, setSelectedResult] = useState<RunResultItem | null>(null);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<JobCandidateDetail | null>(null);
  const [isCandidateDetailLoading, setIsCandidateDetailLoading] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<ShortlistStatus[]>(["shortlisted", "undecided", "rejected"]);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [selectedWarnings, setSelectedWarnings] = useState<WarningFilter[]>([]);
  const [searchText, setSearchText] = useState("");
  const [denseMode, setDenseMode] = useState(false);
  const [segmentPreset, setSegmentPreset] = useState<SegmentationPreset>("all");
  const [selectedScoreIds, setSelectedScoreIds] = useState<number[]>([]);
  const [insightsOpen, setInsightsOpen] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [isRunningShortlist, setIsRunningShortlist] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isRunResultsLoading, setIsRunResultsLoading] = useState(false);
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
    try {
      setIsRunResultsLoading(true);
      const [data, exportStatus] = await Promise.all([
        getRunResults(runId),
        getRunExportStatus(runId),
      ]);
      setRunResults(data);
      setRunExportStatus(exportStatus);
      setSelectedRunId(runId);
      setSelectedScoreIds([]);
    } finally {
      setIsRunResultsLoading(false);
    }
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

  const candidateForResult = useCallback(
    (result: RunResultItem) => candidates.find((candidate) => candidate.id === result.candidate_id) ?? null,
    [candidates]
  );

  const uploadPickedFiles = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Select at least one file first");
      return;
    }
    console.debug("[Upload] trigger", { jobId, selectedFileCount: selectedFiles.length });

    try {
      setIsUploading(true);
      console.debug("[Upload] request_start", { jobId });
      const response = await uploadJobFiles(jobId, selectedFiles);
      console.debug("[Upload] request_success", { jobId, batchId: response.batch_id, filesCreated: response.files_created });
      toast.success("Upload complete", {
        description: `Batch ${response.batch_id} indexed ${response.files_created} files.`,
      });
      setSelectedFiles([]);
      await loadWorkspace();
    } catch (caught) {
      const apiError = caught as ApiError;
      console.error("[Upload] request_failed", { jobId, status: apiError?.status, detail: apiError?.detail });
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
      triggerConfetti();
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

  const shortlistRows = useMemo(() => runResults?.items ?? [], [runResults]);
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

  const shortlistViews = useMemo<ShortlistRowView[]>(
    () =>
      shortlistRows.map((row) => {
        const candidate = candidateForResult(row);
        const warnings = candidate?.parsing_warnings_json?.items ?? candidate?.warnings_json?.items ?? [];
        const reason = row.breakdown_json?.reason ?? null;
        const hardFilterFailed =
          row.decision === "rejected" &&
          ((row.breakdown_json?.missing_must_have?.length ?? 0) > 0 || (reason?.toLowerCase().includes("hard filter") ?? false));

        return {
          row,
          candidate,
          mustHaveCoverage: Math.round(row.breakdown_json?.breakdown?.skills ?? 0),
          warnings,
          hardFilterFailed,
          reason,
        };
      }),
    [candidateForResult, shortlistRows]
  );

  const statusCounts = useMemo<Record<ShortlistStatus, number>>(
    () => ({
      shortlisted: shortlistViews.filter((item) => item.row.decision === "shortlisted").length,
      undecided: shortlistViews.filter((item) => item.row.decision === "undecided").length,
      rejected: shortlistViews.filter((item) => item.row.decision === "rejected").length,
    }),
    [shortlistViews]
  );

  const filteredShortlistViews = useMemo(() => {
    const filtered = shortlistViews.filter((item) => {
      const rowStatus = item.row.decision as ShortlistStatus;
      if (!selectedStatuses.includes(rowStatus)) return false;
      if (item.row.total_score < minScore || item.row.total_score > maxScore) return false;
      if (searchText) {
        const haystack = `${item.row.full_name} ${item.row.email ?? ""} ${item.row.phone ?? ""} ${item.row.location ?? ""}`.toLowerCase();
        if (!haystack.includes(searchText.toLowerCase())) return false;
      }
      if (selectedWarnings.length > 0 && !selectedWarnings.every((warning) => item.warnings.includes(warning))) {
        return false;
      }
      if (segmentPreset === "passing" && item.row.decision === "rejected") return false;
      if (segmentPreset === "hard_rejected" && !item.hardFilterFailed) return false;
      if (segmentPreset === "top_matches" && item.row.total_score < 80) return false;
      return true;
    });
    return filtered;
  }, [shortlistViews, selectedStatuses, minScore, maxScore, searchText, selectedWarnings, segmentPreset]);

  const histogramData = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, index) => ({
      bucket: `${index * 10}-${index * 10 + 9}`,
      from: index * 10,
      to: index * 10 + 9,
      count: 0,
    }));
    for (const item of filteredShortlistViews) {
      const safeScore = Math.max(0, Math.min(99, Math.floor(item.row.total_score)));
      const bucketIndex = Math.floor(safeScore / 10);
      bins[bucketIndex].count += 1;
    }
    return bins;
  }, [filteredShortlistViews]);

  const statusChartData = useMemo(
    () => [
      { name: "Shortlisted", value: filteredShortlistViews.filter((item) => item.row.decision === "shortlisted").length, key: "shortlisted" as ShortlistStatus },
      { name: "Undecided", value: filteredShortlistViews.filter((item) => item.row.decision === "undecided").length, key: "undecided" as ShortlistStatus },
      { name: "Rejected", value: filteredShortlistViews.filter((item) => item.row.decision === "rejected").length, key: "rejected" as ShortlistStatus },
    ],
    [filteredShortlistViews]
  );

  const warningRate = useMemo(() => {
    if (filteredShortlistViews.length === 0) return 0;
    const withWarnings = filteredShortlistViews.filter((item) => item.warnings.length > 0).length;
    return (withWarnings / filteredShortlistViews.length) * 100;
  }, [filteredShortlistViews]);

  const evidenceCoverageAverage = useMemo(() => {
    if (filteredShortlistViews.length === 0) return 0;
    const reasonsPresent = filteredShortlistViews.filter((item) => Boolean(item.reason) || (item.row.breakdown_json?.missing_must_have?.length ?? 0) > 0).length;
    return (reasonsPresent / filteredShortlistViews.length) * 100;
  }, [filteredShortlistViews]);

  const scores = filteredShortlistViews.map((item) => item.row.total_score);
  const selectedRows = useMemo(
    () => filteredShortlistViews.filter((item) => selectedScoreIds.includes(item.row.score_id)),
    [filteredShortlistViews, selectedScoreIds]
  );

  const copyValue = async (value: string | null | undefined) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  };

  const openCandidateDetail = async (result: RunResultItem) => {
    setSelectedResult(result);
    setSelectedCandidateDetail(null);
    setIsCandidateDetailLoading(true);
    try {
      const detail = await getJobCandidateDetails(jobId, result.candidate_id);
      setSelectedCandidateDetail(detail);
    } catch (caught) {
      const apiError = caught as ApiError;
      toast.error("Unable to load candidate details", { description: apiError?.detail || "Try again." });
    } finally {
      setIsCandidateDetailLoading(false);
    }
  };

  const openCandidateCv = async (download = false) => {
    if (!selectedResult) return;
    try {
      const blob = await fetchCandidateCvBlob(jobId, selectedResult.candidate_id);
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = selectedCandidateDetail?.file_name || `${selectedResult.full_name}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        const popup = window.open(url, "_blank", "noopener,noreferrer");
        if (!popup) {
          toast.error("Popup blocked", { description: "Allow popups to view the CV in a new tab." });
        }
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (caught) {
      const apiError = caught as ApiError;
      toast.error("Unable to open CV", { description: apiError?.detail || "CV is unavailable." });
    }
  };

  const toggleStatusFilter = (statusValue: ShortlistStatus) => {
    triggerMagicHighlight();
    setSelectedStatuses((prev) => {
      if (prev.includes(statusValue)) {
        return prev.length === 1 ? prev : prev.filter((entry) => entry !== statusValue);
      }
      return [...prev, statusValue];
    });
  };

  const toggleWarningFilter = (warning: WarningFilter) => {
    triggerMagicHighlight();
    setSelectedWarnings((prev) =>
      prev.includes(warning) ? prev.filter((entry) => entry !== warning) : [...prev, warning]
    );
  };

  const applyKpiFilter = (statusValue: ShortlistStatus) => {
    triggerMagicHighlight();
    setSelectedStatuses([statusValue]);
    setSegmentPreset("all");
  };

  const setScorePreset = (preset: "top10" | "ge70" | "ge80" | "zero" | "all") => {
    triggerMagicHighlight();
    if (preset === "all") {
      setMinScore(0);
      setMaxScore(100);
      return;
    }
    if (preset === "zero") {
      setMinScore(0);
      setMaxScore(0);
      return;
    }
    if (preset === "ge70") {
      setMinScore(70);
      setMaxScore(100);
      return;
    }
    if (preset === "ge80") {
      setMinScore(80);
      setMaxScore(100);
      return;
    }
    const sorted = [...shortlistViews].sort((a, b) => b.row.total_score - a.row.total_score);
    if (sorted.length === 0) return;
    const cutoffIndex = Math.max(0, Math.floor(sorted.length * 0.1) - 1);
    setMinScore(Math.floor(sorted[cutoffIndex].row.total_score));
    setMaxScore(100);
  };

  const toggleRowSelection = (scoreId: number) => {
    setSelectedScoreIds((prev) =>
      prev.includes(scoreId) ? prev.filter((id) => id !== scoreId) : [...prev, scoreId]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredShortlistViews.map((item) => item.row.score_id);
    const allSelected = visibleIds.every((id) => selectedScoreIds.includes(id));
    if (allSelected) {
      setSelectedScoreIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedScoreIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const applyBulkDecision = (decision: "shortlisted" | "rejected" | "reviewed") => {
    if (selectedRows.length === 0 || !runResults) return;
    const label = decision === "reviewed" ? "mark as reviewed" : `mark as ${decision}`;
    if (!window.confirm(`Apply '${label}' to ${selectedRows.length} candidates?`)) return;

    const updatedRows = runResults.items.map((entry) => {
      if (!selectedScoreIds.includes(entry.score_id)) return entry;
      if (decision === "reviewed") {
        return {
          ...entry,
          breakdown_json: {
            ...entry.breakdown_json,
            reason: entry.breakdown_json?.reason || "Marked as reviewed",
          },
        };
      }
      return { ...entry, decision };
    });
    setRunResults({ ...runResults, items: updatedRows });
    setSelectedScoreIds([]);
    toast.success(`Updated ${selectedRows.length} candidates`);
  };

  const updateSingleDecision = (decision: "shortlisted" | "undecided" | "rejected") => {
    if (!selectedResult || !runResults) return;
    const nextItems = runResults.items.map((entry) =>
      entry.score_id === selectedResult.score_id ? { ...entry, decision } : entry
    );
    const updated = nextItems.find((entry) => entry.score_id === selectedResult.score_id) ?? null;
    setRunResults({ ...runResults, items: nextItems });
    if (updated) setSelectedResult(updated);
    toast.success(`Candidate marked ${decision}`);
  };

  const exportSelectedCsv = () => {
    if (selectedRows.length === 0) return;
    const headers = ["Name", "Email", "Phone", "Location", "Experience", "Status", "Score"];
    const lines = selectedRows.map((item) =>
      [
        item.row.full_name,
        item.row.email ?? "",
        item.row.phone ?? "",
        item.row.location ?? "",
        item.row.years_experience_est ?? "",
        item.row.decision,
        item.row.total_score.toFixed(1),
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shortlist_selected_run_${selectedRunId ?? "latest"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedRows.length} selected rows`);
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
      <AppShell title="Job workspace" subtitle={t("loading")}>
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
        <div className="flex items-center gap-2">
          <Button onClick={runShortlist} disabled={isRunningShortlist || indexedCount === 0}>
            {isRunningShortlist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("runShortlist")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="outline" className="h-10 w-10">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1">
              <DeleteJobDialog
                jobId={job.id}
                jobName={job.name}
                candidateCount={candidates.length}
                onConfirm={async () => {
                  await deleteJob(job.id);
                  router.push("/jobs");
                }}
                trigger={
                  <button type="button" className="flex h-8 w-full items-center rounded-sm px-2 text-left text-sm text-destructive hover:bg-accent">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete job
                  </button>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("checklist")}</CardTitle>
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
                {t(item)}
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
                    <FilePickerButton
                      label="Select files"
                      accept=".pdf,.docx,.zip"
                      onFilesSelected={(files) => {
                        console.debug("[Upload] files_selected", { jobId, count: files.length });
                        setSelectedFiles(files);
                      }}
                    />
                    <FilePickerButton
                      label="Select folder"
                      accept=".pdf,.docx,.zip"
                      directory
                      onFilesSelected={(files) => {
                        console.debug("[Upload] folder_selected", { jobId, count: files.length });
                        setSelectedFiles(files);
                      }}
                    />
                    <Button type="button" onClick={uploadPickedFiles} disabled={isUploading || selectedFiles.length === 0}>
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
                    </Button>
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
                      <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                        {processingCount}
                        {typingAmbience && processingCount > 0 ? (
                          <motion.span
                            className="inline-block h-2.5 w-2.5 rounded-full bg-primary"
                            animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3], scale: [1, 1.15, 1] }}
                            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                            aria-hidden
                          />
                        ) : null}
                      </CardTitle>
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
                <CardTitle>{t("shortlist")}</CardTitle>
                <CardDescription>{t("shortlistSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={runShortlist} disabled={isRunningShortlist || indexedCount === 0}>
                      {isRunningShortlist ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t("runShortlist")}
                    </Button>
                    <select
                      value={selectedRunId ?? ""}
                      onChange={async (event) => {
                        const nextRunId = Number(event.target.value);
                        if (nextRunId > 0) {
                          await loadRunResults(nextRunId);
                        }
                      }}
                      className="h-9 rounded-md border border-border/70 bg-background px-3 text-sm"
                    >
                      {runs.length === 0 ? <option value="">No runs yet</option> : null}
                      {runs.map((run) => (
                        <option key={run.id} value={run.id}>
                          Run #{run.id} · {run.status}
                        </option>
                      ))}
                    </select>
                    <div className="hidden text-xs text-muted-foreground sm:block">
                      Filtered: {filteredShortlistViews.length}/{shortlistViews.length}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground">
                      <input type="checkbox" checked={denseMode} onChange={(event) => setDenseMode(event.target.checked)} />
                      Dense
                    </label>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selectedRunId || selectedRun?.status !== "completed" || !runExportStatus?.csv_ready}
                      onClick={exportCsv}
                    >
                      Export CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setInsightsOpen((value) => !value)}>
                      Insights {insightsOpen ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                    </Button>
                  </div>
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

                <motion.div
                  key={magicHighlightCount}
                  initial={reduceMotion ? false : { boxShadow: "0 0 0 rgba(59,130,246,0)" }}
                  animate={reduceMotion ? undefined : { boxShadow: ["0 0 0 rgba(59,130,246,0)", "0 0 0 2px rgba(59,130,246,0.12)", "0 0 0 rgba(59,130,246,0)"] }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      ["shortlisted", "Shortlisted"],
                      ["undecided", "Undecided"],
                      ["rejected", "Rejected"],
                    ] as [ShortlistStatus, string][]).map(([statusValue, label]) => (
                      <Button
                        key={statusValue}
                        size="sm"
                        variant={selectedStatuses.includes(statusValue) ? "default" : "outline"}
                        onClick={() => toggleStatusFilter(statusValue)}
                        className="h-8"
                      >
                        {label} ({statusCounts[statusValue]})
                      </Button>
                    ))}
                    <Badge variant="outline" className="h-8 rounded-md px-2 text-xs">
                      Score: {minScore}-{maxScore}
                    </Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="min-score" className="text-xs text-muted-foreground">Min score</Label>
                      <Input
                        id="min-score"
                        type="number"
                        min={0}
                        max={100}
                        value={minScore}
                        className="h-9"
                        onChange={(event) => setMinScore(Math.max(0, Math.min(100, Number(event.target.value || 0))))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="max-score" className="text-xs text-muted-foreground">Max score</Label>
                      <Input
                        id="max-score"
                        type="number"
                        min={0}
                        max={100}
                        value={maxScore}
                        className="h-9"
                        onChange={(event) => setMaxScore(Math.max(0, Math.min(100, Number(event.target.value || 100))))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="search-candidates" className="text-xs text-muted-foreground">Search candidates</Label>
                      <Input
                        id="search-candidates"
                        placeholder="Name, email, phone, location"
                        className={`h-9 transition-all duration-200 ${
                          typingAmbience && !reduceMotion && searchPulsing
                            ? "ring-2 ring-primary/40 shadow-[0_0_0_6px_rgba(99,102,241,0.2),0_8px_22px_-14px_rgba(79,70,229,0.7)]"
                            : ""
                        }`}
                        value={searchText}
                        onChange={(event) => {
                          if (typingAmbience && !reduceMotion) onSearchType();
                          setSearchText(event.target.value);
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Presets</span>
                    <Button size="sm" className="h-7" variant="outline" onClick={() => setScorePreset("top10")}>Top 10%</Button>
                    <Button size="sm" className="h-7" variant="outline" onClick={() => setScorePreset("ge70")}>≥ 70</Button>
                    <Button size="sm" className="h-7" variant="outline" onClick={() => setScorePreset("ge80")}>≥ 80</Button>
                    <Button size="sm" className="h-7" variant="outline" onClick={() => setScorePreset("zero")}>= 0</Button>
                    <Button size="sm" className="h-7" variant="ghost" onClick={() => setScorePreset("all")}>Reset</Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {WARNING_FILTERS.map((warning) => (
                      <Button
                        key={warning}
                        size="sm"
                        variant={selectedWarnings.includes(warning) ? "default" : "outline"}
                        onClick={() => toggleWarningFilter(warning)}
                        className="h-7 text-[11px]"
                      >
                        {warning}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {([
                      ["all", "All"],
                      ["passing", "Passing Hard Filters"],
                      ["hard_rejected", "Rejected by Hard Filters"],
                      ["top_matches", "Top Matches"],
                    ] as [SegmentationPreset, string][]).map(([presetValue, label]) => (
                      <Button
                        key={presetValue}
                        size="sm"
                        variant={segmentPreset === presetValue ? "default" : "outline"}
                        onClick={() => {
                          triggerMagicHighlight();
                          setSegmentPreset(presetValue);
                        }}
                        className="h-7"
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </motion.div>

                {insightsOpen ? (
                  <div className="space-y-4 rounded-xl border border-border/60 bg-card/60 p-4 shadow-sm">
                    {isRunResultsLoading ? (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={index} className="h-24 w-full" />
                        ))}
                        <Skeleton className="h-[220px] xl:col-span-8" />
                        <Skeleton className="h-[220px] xl:col-span-4" />
                      </div>
                    ) : filteredShortlistViews.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center">
                        <div className="mx-auto mb-3 h-10 w-10 rounded-full border border-border/80 bg-muted/40" />
                        <p className="text-sm font-medium">Run shortlist to see distribution insights</p>
                        <p className="text-xs text-muted-foreground">Charts and KPI cards appear when this run has results.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSegmentPreset("all");
                              setSelectedStatuses(["shortlisted", "undecided", "rejected"]);
                            }}
                            className="rounded-lg border border-border/70 bg-background/50 p-3 text-left transition-colors hover:border-primary/40"
                          >
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</p>
                            <p className="text-2xl font-semibold tabular-nums">{filteredShortlistViews.length}</p>
                            <p className="text-xs text-muted-foreground">Avg {average(scores).toFixed(1)} · Med {median(scores).toFixed(1)}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyKpiFilter("shortlisted")}
                            className={`rounded-lg border p-3 text-left transition-colors ${selectedStatuses.length === 1 && selectedStatuses[0] === "shortlisted" ? "border-primary bg-primary/5" : "border-border/70 bg-background/50 hover:border-primary/40"}`}
                          >
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Shortlisted</p>
                            <p className="text-2xl font-semibold tabular-nums">{statusChartData.find((entry) => entry.key === "shortlisted")?.value ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Click to focus</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyKpiFilter("undecided")}
                            className={`rounded-lg border p-3 text-left transition-colors ${selectedStatuses.length === 1 && selectedStatuses[0] === "undecided" ? "border-primary bg-primary/5" : "border-border/70 bg-background/50 hover:border-primary/40"}`}
                          >
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Undecided</p>
                            <p className="text-2xl font-semibold tabular-nums">{statusChartData.find((entry) => entry.key === "undecided")?.value ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Parsing warnings {warningRate.toFixed(1)}%</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyKpiFilter("rejected")}
                            className={`rounded-lg border p-3 text-left transition-colors ${selectedStatuses.length === 1 && selectedStatuses[0] === "rejected" ? "border-primary bg-primary/5" : "border-border/70 bg-background/50 hover:border-primary/40"}`}
                          >
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rejected</p>
                            <p className="text-2xl font-semibold tabular-nums">{statusChartData.find((entry) => entry.key === "rejected")?.value ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Evidence {evidenceCoverageAverage.toFixed(1)}%</p>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                          <div className="h-[220px] rounded-lg border border-border/70 bg-background/40 p-3 xl:col-span-8">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">Score distribution</p>
                              <Badge variant="outline" className="text-[10px]">Brush to set score window</Badge>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={histogramData} margin={{ left: 0, right: 4, top: 6, bottom: 0 }}>
                                <XAxis dataKey="bucket" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                  contentStyle={{
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    background: "hsl(var(--background))",
                                  }}
                                />
                                <Bar
                                  dataKey="count"
                                  fill="hsl(var(--primary))"
                                  radius={[3, 3, 0, 0]}
                                  isAnimationActive={!reduceMotion}
                                  animationDuration={220}
                                />
                                <Brush
                                  dataKey="bucket"
                                  height={16}
                                  travellerWidth={8}
                                  stroke="hsl(var(--primary))"
                                  onChange={(range) => {
                                    if (!range) return;
                                    const start = typeof range.startIndex === "number" ? range.startIndex : 0;
                                    const end = typeof range.endIndex === "number" ? range.endIndex : histogramData.length - 1;
                                    const from = histogramData[start]?.from ?? 0;
                                    const to = histogramData[end]?.to ?? 100;
                                    setMinScore(from);
                                    setMaxScore(to);
                                  }}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="h-[220px] rounded-lg border border-border/70 bg-background/40 p-3 xl:col-span-4">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">Status breakdown</p>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={statusChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={46}
                                  outerRadius={74}
                                  paddingAngle={2}
                                  isAnimationActive={!reduceMotion}
                                  animationDuration={220}
                                  onClick={(slice) => {
                                    if (!slice || typeof slice !== "object" || !("key" in slice)) return;
                                    applyKpiFilter((slice as { key: ShortlistStatus }).key);
                                  }}
                                >
                                  {statusChartData.map((entry) => (
                                    <Cell
                                      key={entry.key}
                                      fill={
                                        entry.key === "shortlisted"
                                          ? "hsl(160 65% 40%)"
                                          : entry.key === "undecided"
                                            ? "hsl(var(--primary))"
                                            : "hsl(0 66% 53%)"
                                      }
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    background: "hsl(var(--background))",
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}

                {selectedRows.length > 0 ? (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="flex flex-wrap items-center gap-2 p-3">
                      <p className="text-sm font-medium">{selectedRows.length} selected</p>
                      <Button size="sm" onClick={() => applyBulkDecision("shortlisted")}>Shortlist selected</Button>
                      <Button size="sm" variant="destructive" onClick={() => applyBulkDecision("rejected")}>Reject selected</Button>
                      <Button size="sm" variant="outline" onClick={() => applyBulkDecision("reviewed")}>Mark reviewed</Button>
                      <Button size="sm" variant="outline" onClick={exportSelectedCsv}>Export selected</Button>
                    </CardContent>
                  </Card>
                ) : null}

                {shortlistRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shortlist results yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border/80">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/50 text-left">
                        <tr>
                          <th className="p-3">
                            <input
                              type="checkbox"
                              checked={
                                filteredShortlistViews.length > 0 &&
                                filteredShortlistViews.every((item) => selectedScoreIds.includes(item.row.score_id))
                              }
                              onChange={toggleSelectAllVisible}
                            />
                          </th>
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
                        {filteredShortlistViews.map((item) => {
                          const { row, candidate, mustHaveCoverage, hardFilterFailed, reason } = item;
                          return (
                            <tr
                              key={row.score_id}
                              className="cursor-pointer border-t border-border/70 hover:bg-muted/30"
                              onClick={() => {
                                void openCandidateDetail(row);
                              }}
                            >
                              <td className={`p-3 ${denseMode ? "py-1.5" : ""}`} onClick={(event) => event.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedScoreIds.includes(row.score_id)}
                                  onChange={() => toggleRowSelection(row.score_id)}
                                />
                              </td>
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
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant={row.decision === "shortlisted" ? "default" : row.decision === "rejected" ? "destructive" : "outline"}>
                                    {row.decision}
                                  </Badge>
                                  {hardFilterFailed ? (
                                    <Badge variant="outline" title={reason || "Rejected by hard filters"}>
                                      Hard filter failed
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  <div className="h-1.5 w-20 rounded bg-muted">
                                    <div
                                      className="h-full rounded bg-primary transition-all duration-200"
                                      style={{ width: `${Math.max(0, Math.min(100, row.total_score))}%` }}
                                    />
                                  </div>
                                  <p className="text-xs font-semibold">{row.total_score.toFixed(1)}</p>
                                </div>
                              </td>
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

      <CandidateDetailDrawer
        open={Boolean(selectedResult)}
        result={selectedResult}
        candidate={selectedCandidateDetail}
        loading={isCandidateDetailLoading}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedResult(null);
            setSelectedCandidateDetail(null);
          }
        }}
        onCopy={(value) => {
          void copyValue(value);
        }}
        onViewCv={() => {
          void openCandidateCv(false);
        }}
        onDownloadCv={() => {
          void openCandidateCv(true);
        }}
        onStatusChange={updateSingleDecision}
      />
    </AppShell>
  );
}
