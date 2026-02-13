"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  CircleDashed,
  Download,
  FileWarning,
  Filter,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Search,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getJob, getJobs, type Job } from "@/lib/jobs";
import { cn } from "@/lib/utils";

type WorkspaceTab = "upload" | "criteria" | "shortlist" | "exports";
type UploadStatus = "queued" | "extracting" | "ocr" | "structuring" | "indexed" | "failed";
type RunState = "completed" | "running" | "failed";

type IngestionItem = {
  id: string;
  filename: string;
  status: UploadStatus;
  progress: number;
  parseWarnings: string[];
};

type CriteriaWeights = {
  skills: number;
  embedding: number;
  experience: number;
  location: number;
  keyword: number;
};

type CriteriaFormState = {
  jobTitle: string;
  jobDescription: string;
  mustHaveSkills: string[];
  mustHaveKeywords: string[];
  rejectMissingMustHave: boolean;
  niceToHaveSkills: string[];
  niceToHaveKeywords: string[];
  locationMode: "Any" | "Remote only" | "Onsite only" | "Hybrid";
  cities: string[];
  countries: string[];
  rejectLocationMismatch: boolean;
  minYears: number;
  rejectLowExperience: boolean;
  weights: CriteriaWeights;
};

type EvidenceItem = {
  id: string;
  criterion: string;
  snippet: string;
  page: number;
  confidence: "High" | "Medium" | "Low";
  coords: { x: number; y: number; w: number; h: number };
};

type CandidateRow = {
  id: string;
  name: string;
  location: string;
  experience: number;
  mustHaveCoverage: number;
  score: number;
  status: "Shortlisted" | "Rejected" | "Undecided";
  profileSummary: { skills: string[]; education: string; location: string; experience: string };
  missingMustHaves: string[];
  breakdown: { label: string; value: number }[];
  evidence: EvidenceItem[];
};

type ShortlistRunOption = {
  id: string;
  label: string;
  state: RunState;
};

type ColumnKey = "name" | "location" | "experience" | "mustHaveCoverage" | "score" | "status";
type SortDirection = "asc" | "desc";

const TAB_ORDER: WorkspaceTab[] = ["upload", "criteria", "shortlist", "exports"];

const sampleCandidates: CandidateRow[] = [
  {
    id: "c1",
    name: "Lena Rahman",
    location: "New York, US",
    experience: 8,
    mustHaveCoverage: 100,
    score: 92,
    status: "Shortlisted",
    profileSummary: {
      skills: ["React", "TypeScript", "Next.js", "Design Systems", "Jest"],
      education: "BSc Computer Science",
      location: "New York, US",
      experience: "8 years",
    },
    missingMustHaves: [],
    breakdown: [
      { label: "Skills", value: 95 },
      { label: "Embedding", value: 90 },
      { label: "Experience", value: 88 },
      { label: "Location", value: 92 },
      { label: "Keywords", value: 94 },
    ],
    evidence: [
      {
        id: "e1",
        criterion: "Must-have: React",
        snippet: "Led migration of 60k LOC React codebase to strict TypeScript in 9 months.",
        page: 2,
        confidence: "High",
        coords: { x: 12, y: 28, w: 72, h: 8 },
      },
      {
        id: "e2",
        criterion: "Must-have: Design Systems",
        snippet: "Built and governed a shared design system used by six product squads.",
        page: 3,
        confidence: "High",
        coords: { x: 10, y: 54, w: 75, h: 8 },
      },
    ],
  },
  {
    id: "c2",
    name: "Marco Silva",
    location: "Austin, US",
    experience: 6,
    mustHaveCoverage: 83,
    score: 86,
    status: "Undecided",
    profileSummary: {
      skills: ["React", "TypeScript", "Node.js", "GraphQL"],
      education: "MSc Software Engineering",
      location: "Austin, US",
      experience: "6 years",
    },
    missingMustHaves: ["Design Systems"],
    breakdown: [
      { label: "Skills", value: 87 },
      { label: "Embedding", value: 83 },
      { label: "Experience", value: 79 },
      { label: "Location", value: 86 },
      { label: "Keywords", value: 88 },
    ],
    evidence: [
      {
        id: "e3",
        criterion: "Must-have: TypeScript",
        snippet: "Implemented strict TypeScript checks across frontend and reduced runtime bugs by 31%.",
        page: 1,
        confidence: "High",
        coords: { x: 9, y: 35, w: 78, h: 8 },
      },
      {
        id: "e4",
        criterion: "Experience",
        snippet: "Six years shipping B2B SaaS dashboards with weekly release cadence.",
        page: 2,
        confidence: "Medium",
        coords: { x: 11, y: 62, w: 70, h: 8 },
      },
    ],
  },
  {
    id: "c3",
    name: "Anika Choudhury",
    location: "Remote, UK",
    experience: 7,
    mustHaveCoverage: 66,
    score: 80,
    status: "Undecided",
    profileSummary: {
      skills: ["Vue", "TypeScript", "Cypress", "Figma"],
      education: "BEng Information Systems",
      location: "Remote, UK",
      experience: "7 years",
    },
    missingMustHaves: ["React", "Design Systems"],
    breakdown: [
      { label: "Skills", value: 72 },
      { label: "Embedding", value: 81 },
      { label: "Experience", value: 86 },
      { label: "Location", value: 78 },
      { label: "Keywords", value: 77 },
    ],
    evidence: [
      {
        id: "e5",
        criterion: "Nice-to-have: Testing",
        snippet: "Built an E2E Cypress pipeline with mandatory quality gates.",
        page: 3,
        confidence: "Medium",
        coords: { x: 13, y: 23, w: 65, h: 8 },
      },
    ],
  },
];

for (let index = 4; index <= 24; index += 1) {
  sampleCandidates.push({
    id: `c${index}`,
    name: `Candidate ${index}`,
    location: index % 2 === 0 ? "Remote" : "Chicago, US",
    experience: 2 + (index % 10),
    mustHaveCoverage: 45 + (index % 55),
    score: 55 + (index % 45),
    status: ["Undecided", "Rejected", "Shortlisted"][index % 3] as CandidateRow["status"],
    profileSummary: {
      skills: ["React", "TypeScript", "Communication"],
      education: "BSc",
      location: index % 2 === 0 ? "Remote" : "Chicago, US",
      experience: `${2 + (index % 10)} years`,
    },
    missingMustHaves: index % 2 === 0 ? [] : ["Design Systems"],
    breakdown: [
      { label: "Skills", value: 55 + (index % 35) },
      { label: "Embedding", value: 54 + (index % 32) },
      { label: "Experience", value: 50 + (index % 38) },
      { label: "Location", value: 53 + (index % 34) },
      { label: "Keywords", value: 58 + (index % 30) },
    ],
    evidence: [
      {
        id: `e${index}`,
        criterion: "Skill match",
        snippet: "Matched baseline frontend criteria with supporting project context.",
        page: (index % 4) + 1,
        confidence: index % 2 === 0 ? "Medium" : "High",
        coords: { x: 10, y: 18 + (index % 60), w: 72, h: 8 },
      },
    ],
  });
}

function parseTab(value: string | null): WorkspaceTab {
  if (value === "upload" || value === "criteria" || value === "shortlist" || value === "exports") {
    return value;
  }
  return "upload";
}

function statusIcon(status: UploadStatus) {
  if (status === "indexed") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5" />;
  if (status === "queued") return <CircleDashed className="h-3.5 w-3.5" />;
  return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
}

function statusBadgeClass(status: UploadStatus) {
  if (status === "indexed") return "border-transparent bg-emerald-500/10 text-emerald-600";
  if (status === "failed") return "border-transparent bg-destructive/10 text-destructive";
  if (status === "queued") return "border-border bg-secondary text-secondary-foreground";
  return "border-transparent bg-primary/10 text-primary";
}

function normalizeWeights(weights: CriteriaWeights, updatedKey: keyof CriteriaWeights, updatedValue: number): CriteriaWeights {
  const keys: (keyof CriteriaWeights)[] = ["skills", "embedding", "experience", "location", "keyword"];
  const clamped = Math.min(100, Math.max(0, updatedValue));
  const remaining = 100 - clamped;

  const next: CriteriaWeights = { ...weights, [updatedKey]: clamped };
  const otherKeys = keys.filter((key) => key !== updatedKey);
  const currentOtherTotal = otherKeys.reduce((total, key) => total + weights[key], 0);

  if (currentOtherTotal === 0) {
    const equalShare = Math.floor(remaining / otherKeys.length);
    let allocated = 0;
    for (const key of otherKeys) {
      next[key] = equalShare;
      allocated += equalShare;
    }
    next[otherKeys[0]] += remaining - allocated;
    return next;
  }

  let allocated = 0;
  for (const key of otherKeys) {
    const value = Math.max(0, Math.round((weights[key] / currentOtherTotal) * remaining));
    next[key] = value;
    allocated += value;
  }

  const diff = remaining - allocated;
  if (diff !== 0) {
    next[otherKeys[0]] = Math.max(0, next[otherKeys[0]] + diff);
  }

  return next;
}

type ChipsInputProps = {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
};

function ChipsInput({ label, items, onAdd, onRemove, placeholder }: ChipsInputProps) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-lg border border-input bg-background p-2">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="flex items-center gap-1">
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="ml-1 rounded-sm text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${item}`}
            >
              ×
            </button>
          </Badge>
        ))}
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.trim()) {
              event.preventDefault();
              onAdd(value.trim());
              setValue("");
            }
          }}
          placeholder={placeholder}
          className="min-w-[180px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p className="text-xs text-muted-foreground">Press Enter to add each value.</p>
    </div>
  );
}

export default function JobWorkspacePage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const jobId = Number(params.jobId);
  const tab = parseTab(searchParams.get("tab"));
  const runDropdownRef = useRef<HTMLSelectElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [jobLoadFailed, setJobLoadFailed] = useState(false);
  const [queue, setQueue] = useState<IngestionItem[]>([]);
  const [criteriaSaved, setCriteriaSaved] = useState(false);
  const [showAdvancedWeights, setShowAdvancedWeights] = useState(false);

  const [criteria, setCriteria] = useState<CriteriaFormState>({
    jobTitle: "",
    jobDescription: "",
    mustHaveSkills: ["React", "TypeScript"],
    mustHaveKeywords: ["frontend", "design system"],
    rejectMissingMustHave: true,
    niceToHaveSkills: ["Next.js", "Jest"],
    niceToHaveKeywords: ["analytics", "scale"],
    locationMode: "Any",
    cities: [],
    countries: ["United States"],
    rejectLocationMismatch: false,
    minYears: 4,
    rejectLowExperience: true,
    weights: {
      skills: 35,
      embedding: 25,
      experience: 20,
      location: 10,
      keyword: 10,
    },
  });

  const [search, setSearch] = useState("");
  const [denseMode, setDenseMode] = useState(false);
  const [sortBy, setSortBy] = useState<ColumnKey>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [drawerCandidate, setDrawerCandidate] = useState<CandidateRow | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "evidence" | "cv" | "feedback">("overview");
  const [focusedEvidenceId, setFocusedEvidenceId] = useState<string | null>(null);

  const [columnFilters, setColumnFilters] = useState({
    name: "",
    location: "",
    experience: "",
    mustHaveCoverage: "",
    score: "",
    status: "all",
  });

  const runOptions: ShortlistRunOption[] = [
    { id: "run-17", label: "Latest (Run #17)", state: "completed" },
    { id: "run-16", label: "Run #16", state: "completed" },
    { id: "run-15", label: "Run #15", state: "failed" },
  ];
  const [selectedRunId, setSelectedRunId] = useState(runOptions[0].id);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    if (Number.isNaN(jobId)) {
      setJobLoadFailed(true);
      setLoadingData(false);
      return;
    }

    void (async () => {
      try {
        setLoadingData(true);
        setJobLoadFailed(false);
        const [jobsResponse, foundJob] = await Promise.all([getJobs(1, 200), getJob(jobId)]);
        setJobs(jobsResponse.items);
        setCurrentJob(foundJob);
        setCriteria((previous) => ({
          ...previous,
          jobTitle: foundJob.name ?? "",
          jobDescription: foundJob.description ?? "",
        }));
      } catch {
        setJobLoadFailed(true);
        setCurrentJob(null);
        toast.error("Unable to load this job", { description: "The job may not exist or you may not have access." });
      } finally {
        setLoadingData(false);
      }
    })();
  }, [authLoading, isAuthenticated, jobId, router]);

  useEffect(() => {
    if (directoryInputRef.current) {
      directoryInputRef.current.setAttribute("webkitdirectory", "");
      directoryInputRef.current.setAttribute("directory", "");
    }
  }, []);

  useEffect(() => {
    if (queue.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setQueue((previous) => {
        const activeIndex = previous.findIndex((item) => item.status !== "indexed" && item.status !== "failed");

        if (activeIndex === -1) {
          return previous;
        }

        const next = [...previous];
        const item = next[activeIndex];
        const nextProgress = Math.min(100, item.progress + 20);

        let nextStatus: UploadStatus = item.status;
        if (nextProgress <= 20) nextStatus = "queued";
        else if (nextProgress <= 40) nextStatus = "extracting";
        else if (nextProgress <= 60) nextStatus = "ocr";
        else if (nextProgress < 100) nextStatus = "structuring";
        else nextStatus = Math.random() < 0.12 ? "failed" : "indexed";

        const nextWarnings =
          nextStatus === "indexed" && Math.random() < 0.25 ? ["Low confidence extraction on one section"] : item.parseWarnings;

        next[activeIndex] = {
          ...item,
          progress: nextProgress,
          status: nextStatus,
          parseWarnings: nextWarnings,
        };

        if (nextStatus === "indexed" && item.status !== "indexed") {
          toast.success("CV indexed", { description: item.filename });
        }

        if (nextStatus === "failed" && item.status !== "failed") {
          toast.error("CV processing failed", { description: item.filename });
        }

        return next;
      });
    }, 550);

    return () => window.clearInterval(interval);
  }, [queue.length]);

  const indexedCount = queue.filter((item) => item.status === "indexed").length;
  const failedCount = queue.filter((item) => item.status === "failed").length;
  const processingCount = queue.filter((item) => !["indexed", "failed"].includes(item.status)).length;

  const latestRunState: RunState = processingCount > 0 ? "running" : failedCount > 0 ? "failed" : "completed";

  const completedSteps = {
    upload: indexedCount > 0,
    criteria: criteriaSaved,
    shortlist: false,
  };

  const candidates = useMemo(() => {
    const minExperience = Number(columnFilters.experience);
    const minCoverage = Number(columnFilters.mustHaveCoverage);
    const minScore = Number(columnFilters.score);

    const filtered = sampleCandidates.filter((candidate) => {
      const matchesSearch =
        !search ||
        candidate.name.toLowerCase().includes(search.toLowerCase()) ||
        candidate.location.toLowerCase().includes(search.toLowerCase());

      const matchesName = !columnFilters.name || candidate.name.toLowerCase().includes(columnFilters.name.toLowerCase());
      const matchesLocation = !columnFilters.location || candidate.location.toLowerCase().includes(columnFilters.location.toLowerCase());
      const matchesExperience = Number.isNaN(minExperience) || candidate.experience >= minExperience;
      const matchesCoverage = Number.isNaN(minCoverage) || candidate.mustHaveCoverage >= minCoverage;
      const matchesScore = Number.isNaN(minScore) || candidate.score >= minScore;
      const matchesStatus = columnFilters.status === "all" || candidate.status === columnFilters.status;

      return matchesSearch && matchesName && matchesLocation && matchesExperience && matchesCoverage && matchesScore && matchesStatus;
    });

    return filtered.sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const a = left[sortBy];
      const b = right[sortBy];

      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * direction;
      }

      return String(a).localeCompare(String(b)) * direction;
    });
  }, [columnFilters, search, sortBy, sortDirection]);

  const pageSize = denseMode ? 12 : 8;
  const totalPages = Math.max(1, Math.ceil(candidates.length / pageSize));
  const paginatedCandidates = candidates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, columnFilters, denseMode]);

  useEffect(() => {
    setSelectedCandidateIds((previous) => previous.filter((id) => candidates.some((candidate) => candidate.id === id)));
  }, [candidates]);

  const allPageSelected = paginatedCandidates.length > 0 && paginatedCandidates.every((candidate) => selectedCandidateIds.includes(candidate.id));

  const navigateToTab = (nextTab: WorkspaceTab) => {
    const paramsSnapshot = new URLSearchParams(searchParams.toString());
    paramsSnapshot.set("tab", nextTab);
    router.replace(`/jobs/${jobId}?${paramsSnapshot.toString()}`, { scroll: false });
  };

  const onFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const incoming = Array.from(files).map<IngestionItem>((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      filename: file.name,
      status: "queued",
      progress: 0,
      parseWarnings: [],
    }));

    setQueue((previous) => [...previous, ...incoming]);

    toast.success("Upload started", {
      description: `${incoming.length} file${incoming.length > 1 ? "s" : ""} added to ingestion queue.`,
    });
  };

  const retryItem = (itemId: string) => {
    setQueue((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: "queued",
              progress: 0,
              parseWarnings: [],
            }
          : item
      )
    );
    toast.success("Retry queued");
  };

  const updateWeight = (key: keyof CriteriaWeights, value: number) => {
    setCriteria((previous) => ({
      ...previous,
      weights: normalizeWeights(previous.weights, key, value),
    }));
  };

  const addChip = (key: keyof CriteriaFormState, value: string) => {
    setCriteria((previous) => {
      const current = previous[key];
      if (!Array.isArray(current) || current.includes(value)) {
        return previous;
      }
      return {
        ...previous,
        [key]: [...current, value],
      };
    });
  };

  const removeChip = (key: keyof CriteriaFormState, value: string) => {
    setCriteria((previous) => {
      const current = previous[key];
      if (!Array.isArray(current)) {
        return previous;
      }
      return {
        ...previous,
        [key]: current.filter((item) => item !== value),
      };
    });
  };

  const saveCriteria = () => {
    setCriteriaSaved(true);
    toast.success("Criteria saved", {
      description: "You can now run shortlist for this job.",
    });
  };

  const runShortlist = () => {
    if (indexedCount === 0) {
      toast.error("Upload CVs first");
      return;
    }
    toast.success("Shortlist run started", {
      description: "Candidates are being scored with evidence extraction.",
    });
    navigateToTab("shortlist");
  };

  const toggleSort = (column: ColumnKey) => {
    if (sortBy === column) {
      setSortDirection((previous) => (previous === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDirection("desc");
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidateIds((previous) =>
      previous.includes(candidateId) ? previous.filter((id) => id !== candidateId) : [...previous, candidateId]
    );
  };

  const runBulkAction = (action: "shortlist" | "reject" | "export") => {
    const label = action === "shortlist" ? "Shortlisted" : action === "reject" ? "Rejected" : "Exported";
    toast.success(`${label} ${selectedCandidateIds.length} selected candidate${selectedCandidateIds.length > 1 ? "s" : ""}.`);
    if (action !== "export") {
      setSelectedCandidateIds([]);
    }
  };

  if (loadingData) {
    return (
      <AppShell title="Job Workspace" subtitle="Loading job workspace...">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[460px] w-full" />
        </div>
      </AppShell>
    );
  }

  if (jobLoadFailed || !currentJob) {
    return (
      <AppShell title="Job Workspace" subtitle="Unable to open this job.">
        <Card className="max-w-xl border-border/80">
          <CardHeader>
            <CardTitle>Job not available</CardTitle>
            <CardDescription>
              This job could not be loaded. It may not exist, or you may not have access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/jobs")}>Back to Jobs</Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={currentJob.name}
      subtitle="Upload CVs, define criteria, and generate evidence-backed shortlists."
      contextLabel="Job"
      contextValue={currentJob.name}
      primaryAction={
        <div className="flex items-center gap-2">
          <Link href="/jobs/new">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </Link>
        </div>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Card className="h-fit border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Jobs</CardTitle>
            <CardDescription>Switch jobs without leaving the workstation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}?tab=${tab}`}>
                <div
                  className={cn(
                    "rounded-lg border p-3 text-sm transition-colors",
                    job.id === currentJob.id
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/80 bg-background hover:border-primary/35"
                  )}
                >
                  <p className="font-medium">{job.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Job #{job.id}</p>
                </div>
              </Link>
            ))}
            <Link href="/jobs/new">
              <Button variant="outline" className="mt-3 w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl">{currentJob.name}</CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    Upload CVs, define criteria, and generate evidence-backed shortlists.
                  </CardDescription>
                </div>
                <div className="space-y-2 rounded-lg border border-border/80 bg-background p-3 text-xs">
                  <p className="text-muted-foreground">CVs indexed: {indexedCount} / {queue.length || 0}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      latestRunState === "completed" && "text-emerald-600",
                      latestRunState === "running" && "text-primary",
                      latestRunState === "failed" && "text-destructive"
                    )}
                  >
                    Latest shortlist run: {latestRunState}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { key: "upload", label: "Step 1 Upload", done: completedSteps.upload },
                  { key: "criteria", label: "Step 2 Criteria", done: completedSteps.criteria },
                  { key: "shortlist", label: "Step 3 Shortlist", done: false },
                ].map((step) => {
                  const active = tab === step.key;
                  return (
                    <button
                      type="button"
                      key={step.key}
                      className={cn(
                        "flex h-11 items-center justify-between rounded-lg border px-3 text-sm transition-colors",
                        active ? "border-primary bg-primary/10 text-foreground" : "border-border/80 bg-background",
                        step.done && "border-emerald-500/35"
                      )}
                      onClick={() => navigateToTab(step.key as WorkspaceTab)}
                    >
                      <span className="font-medium">{step.label}</span>
                      {step.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={(value) => navigateToTab(parseTab(value))}>
            <TabsList className="grid w-full grid-cols-4 bg-card">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="criteria">Criteria</TabsTrigger>
              <TabsTrigger value="shortlist">Shortlist</TabsTrigger>
              <TabsTrigger value="exports">Exports</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle>Upload CV Batch</CardTitle>
                  <CardDescription>Drag and drop CV files, or select files/folders to ingest.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="rounded-xl border border-dashed border-border bg-background p-8 text-center"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      onFilesSelected(event.dataTransfer.files);
                    }}
                  >
                    <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">Drop CVs here to start ingestion</p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF and DOCX are supported.</p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <Label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.docx"
                          multiple
                          className="hidden"
                          onChange={(event) => onFilesSelected(event.target.files)}
                        />
                        <Button type="button" variant="outline" asChild>
                          <span>Select files</span>
                        </Button>
                      </Label>

                      <Label className="cursor-pointer">
                        <input
                          ref={directoryInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(event) => onFilesSelected(event.target.files)}
                        />
                        <Button type="button" variant="outline" asChild>
                          <span>Select folder</span>
                        </Button>
                      </Label>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Max size: 50MB per file. Files stay in your workspace.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle>Global Progress</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                  <SummaryStat label="Total CVs" value={String(queue.length)} />
                  <SummaryStat label="Indexed" value={String(indexedCount)} tone="good" />
                  <SummaryStat label="Processing" value={String(processingCount)} tone="active" />
                  <SummaryStat label="Failed" value={String(failedCount)} tone="bad" />
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle>Ingestion Queue</CardTitle>
                  <CardDescription>Track each file through extraction and indexing.</CardDescription>
                </CardHeader>
                <CardContent>
                  {queue.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border/80">
                      <table className="w-full min-w-[780px] text-sm">
                        <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Filename</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">Progress</th>
                            <th className="px-3 py-2 font-medium">Warnings</th>
                            <th className="px-3 py-2 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {queue.map((item) => (
                            <tr key={item.id} className="border-t border-border/80">
                              <td className="px-3 py-3">{item.filename}</td>
                              <td className="px-3 py-3">
                                <Badge className={statusBadgeClass(item.status)}>
                                  {statusIcon(item.status)}
                                  <span className="ml-1 capitalize">{item.status}</span>
                                </Badge>
                              </td>
                              <td className="px-3 py-3">
                                <div className="h-2 w-full rounded-full bg-muted">
                                  <div className="h-2 rounded-full bg-primary transition-all duration-200" style={{ width: `${item.progress}%` }} />
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                {item.parseWarnings.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                    <FileWarning className="h-3.5 w-3.5" />
                                    {item.parseWarnings[0]}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">None</span>
                                )}
                              </td>
                              <td className="px-3 py-3">
                                {item.status === "failed" ? (
                                  <Button variant="outline" size="sm" onClick={() => retryItem(item.id)}>
                                    <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                    Retry
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {indexedCount > 0 ? (
                <div className="flex justify-end">
                  <Button onClick={() => navigateToTab("criteria")}>
                    Next step: Define criteria
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="criteria" className="space-y-4">
              <Card className="border-border/80">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Criteria</CardTitle>
                    <CardDescription>Define one active criteria configuration for this job.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={saveCriteria}>Save Criteria</Button>
                    <Button onClick={runShortlist} disabled={indexedCount === 0}>
                      <Play className="mr-2 h-4 w-4" />
                      Run Shortlist
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {indexedCount === 0 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                      Upload CVs first. Run Shortlist is disabled until at least one CV is indexed.
                    </div>
                  ) : null}

                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold">Section A — Job Definition</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Job title</Label>
                        <Input
                          value={criteria.jobTitle}
                          onChange={(event) => setCriteria((previous) => ({ ...previous, jobTitle: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Job description</Label>
                        <Textarea
                          value={criteria.jobDescription}
                          onChange={(event) => setCriteria((previous) => ({ ...previous, jobDescription: event.target.value }))}
                          rows={5}
                        />
                      </div>
                    </div>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold">Section B — Must-have</h3>
                    <ChipsInput
                      label="Must-have skills"
                      items={criteria.mustHaveSkills}
                      onAdd={(value) => addChip("mustHaveSkills", value)}
                      onRemove={(value) => removeChip("mustHaveSkills", value)}
                      placeholder="Add must-have skill"
                    />
                    <ChipsInput
                      label="Must-have keywords"
                      items={criteria.mustHaveKeywords}
                      onAdd={(value) => addChip("mustHaveKeywords", value)}
                      onRemove={(value) => removeChip("mustHaveKeywords", value)}
                      placeholder="Add keyword"
                    />
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={criteria.rejectMissingMustHave}
                        onChange={(event) => setCriteria((previous) => ({ ...previous, rejectMissingMustHave: event.target.checked }))}
                      />
                      Reject candidates missing any must-have skill
                    </label>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold">Section C — Nice-to-have</h3>
                    <ChipsInput
                      label="Nice-to-have skills"
                      items={criteria.niceToHaveSkills}
                      onAdd={(value) => addChip("niceToHaveSkills", value)}
                      onRemove={(value) => removeChip("niceToHaveSkills", value)}
                      placeholder="Add skill"
                    />
                    <ChipsInput
                      label="Nice-to-have keywords"
                      items={criteria.niceToHaveKeywords}
                      onAdd={(value) => addChip("niceToHaveKeywords", value)}
                      onRemove={(value) => removeChip("niceToHaveKeywords", value)}
                      placeholder="Add keyword"
                    />
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold">Section D — Location</h3>
                    <div className="space-y-2">
                      <Label>Location mode</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={criteria.locationMode}
                        onChange={(event) =>
                          setCriteria((previous) => ({
                            ...previous,
                            locationMode: event.target.value as CriteriaFormState["locationMode"],
                          }))
                        }
                      >
                        <option>Any</option>
                        <option>Remote only</option>
                        <option>Onsite only</option>
                        <option>Hybrid</option>
                      </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <ChipsInput
                        label="Cities"
                        items={criteria.cities}
                        onAdd={(value) => addChip("cities", value)}
                        onRemove={(value) => removeChip("cities", value)}
                        placeholder="Add city"
                      />
                      <ChipsInput
                        label="Countries"
                        items={criteria.countries}
                        onAdd={(value) => addChip("countries", value)}
                        onRemove={(value) => removeChip("countries", value)}
                        placeholder="Add country"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={criteria.rejectLocationMismatch}
                        onChange={(event) => setCriteria((previous) => ({ ...previous, rejectLocationMismatch: event.target.checked }))}
                      />
                      Reject if location mismatch
                    </label>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <h3 className="text-sm font-semibold">Section E — Experience</h3>
                    <div className="space-y-2">
                      <Label>Minimum years: {criteria.minYears}</Label>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={criteria.minYears}
                        onChange={(event) =>
                          setCriteria((previous) => ({
                            ...previous,
                            minYears: Number(event.target.value),
                          }))
                        }
                        className="h-2 w-full accent-primary"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={criteria.rejectLowExperience}
                        onChange={(event) => setCriteria((previous) => ({ ...previous, rejectLowExperience: event.target.checked }))}
                      />
                      Reject if experience below minimum
                    </label>
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedWeights((previous) => !previous)}
                      className="flex items-center gap-2 text-sm font-semibold"
                    >
                      Section F — Weights (advanced)
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvancedWeights && "rotate-180")} />
                    </button>

                    {showAdvancedWeights ? (
                      <div className="space-y-4 rounded-lg border border-border/80 bg-background p-4">
                        {(Object.keys(criteria.weights) as (keyof CriteriaWeights)[]).map((key) => (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="capitalize">{key === "embedding" ? "Embedding similarity" : key} weight</span>
                              <span>{criteria.weights[key]}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={criteria.weights[key]}
                              onChange={(event) => updateWeight(key, Number(event.target.value))}
                              className="h-2 w-full accent-primary"
                            />
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                          Weights normalize automatically to keep total at 100.
                        </p>
                      </div>
                    ) : null}
                  </section>

                  <Separator />

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold">Section G — AI Helper</h3>
                    <p className="text-sm text-muted-foreground">Use AI to draft conservative criteria from the job description.</p>
                    <Button
                      variant="outline"
                      onClick={() =>
                        toast.success("Suggested criteria generated", {
                          description: "Draft criteria added. Review before saving.",
                        })
                      }
                    >
                      Suggest criteria from Job Description
                    </Button>
                  </section>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button variant="outline" onClick={saveCriteria}>Save Criteria</Button>
                    <Button onClick={runShortlist} disabled={indexedCount === 0}>
                      <Play className="mr-2 h-4 w-4" />
                      Run Shortlist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shortlist" className="space-y-4">
              <Card className="border-border/80">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Shortlist</CardTitle>
                      <CardDescription>Evidence-backed ranking for this job.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={runShortlist} disabled={indexedCount === 0}>
                        <Play className="mr-2 h-4 w-4" />
                        Run Shortlist
                      </Button>
                      <div className="flex items-center gap-2 rounded-md border border-border/80 px-2 py-1">
                        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        <select
                          ref={runDropdownRef}
                          className="h-8 bg-transparent text-sm outline-none"
                          value={selectedRunId}
                          onChange={(event) => setSelectedRunId(event.target.value)}
                        >
                          {runOptions.map((run) => (
                            <option key={run.id} value={run.id}>
                              {run.label}{run.state === "failed" ? " (failed)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full max-w-sm">
                      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search candidates"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" checked={denseMode} onChange={(event) => setDenseMode(event.target.checked)} />
                      Dense mode
                    </label>
                  </div>

                  {selectedCandidateIds.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <span className="text-sm font-medium">{selectedCandidateIds.length} selected</span>
                      <Button size="sm" variant="outline" onClick={() => runBulkAction("shortlist")}>Shortlist</Button>
                      <Button size="sm" variant="outline" onClick={() => runBulkAction("reject")}>Reject</Button>
                      <Button size="sm" variant="outline" onClick={() => runBulkAction("export")}>Export selected</Button>
                    </div>
                  ) : null}

                  <div className="overflow-auto rounded-lg border border-border/80">
                    <table className="w-full min-w-[980px] border-collapse text-sm">
                      <thead className="sticky top-0 z-20 bg-card">
                        <tr className="border-b border-border/80">
                          <th className="sticky left-0 z-30 w-10 bg-card px-3 py-2 text-left">
                            <input
                              type="checkbox"
                              checked={allPageSelected}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedCandidateIds((previous) => {
                                    const next = new Set(previous);
                                    for (const candidate of paginatedCandidates) next.add(candidate.id);
                                    return Array.from(next);
                                  });
                                } else {
                                  setSelectedCandidateIds((previous) => previous.filter((id) => !paginatedCandidates.some((candidate) => candidate.id === id)));
                                }
                              }}
                            />
                          </th>
                          <SortableHeader label="Name" sticky="left" active={sortBy === "name"} direction={sortDirection} onClick={() => toggleSort("name")} />
                          <SortableHeader label="Location" active={sortBy === "location"} direction={sortDirection} onClick={() => toggleSort("location")} />
                          <SortableHeader label="Experience" active={sortBy === "experience"} direction={sortDirection} onClick={() => toggleSort("experience")} />
                          <SortableHeader label="Must-have %" active={sortBy === "mustHaveCoverage"} direction={sortDirection} onClick={() => toggleSort("mustHaveCoverage")} />
                          <SortableHeader label="Status" active={sortBy === "status"} direction={sortDirection} onClick={() => toggleSort("status")} />
                          <SortableHeader label="Score" sticky="right" active={sortBy === "score"} direction={sortDirection} onClick={() => toggleSort("score")} />
                        </tr>
                        <tr className="border-b border-border/80 bg-muted/40">
                          <th className="sticky left-0 z-30 bg-muted/40 px-3 py-2 text-left">
                            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                          </th>
                          <th className="sticky left-10 z-30 min-w-[220px] bg-muted/40 px-3 py-2">
                            <Input
                              value={columnFilters.name}
                              onChange={(event) => setColumnFilters((previous) => ({ ...previous, name: event.target.value }))}
                              placeholder="Filter name"
                              className="h-8"
                            />
                          </th>
                          <th className="px-3 py-2">
                            <Input
                              value={columnFilters.location}
                              onChange={(event) => setColumnFilters((previous) => ({ ...previous, location: event.target.value }))}
                              placeholder="Filter location"
                              className="h-8"
                            />
                          </th>
                          <th className="px-3 py-2">
                            <Input
                              value={columnFilters.experience}
                              onChange={(event) => setColumnFilters((previous) => ({ ...previous, experience: event.target.value }))}
                              placeholder="Min years"
                              className="h-8"
                            />
                          </th>
                          <th className="px-3 py-2">
                            <Input
                              value={columnFilters.mustHaveCoverage}
                              onChange={(event) => setColumnFilters((previous) => ({ ...previous, mustHaveCoverage: event.target.value }))}
                              placeholder="Min %"
                              className="h-8"
                            />
                          </th>
                          <th className="px-3 py-2">
                            <select
                              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                              value={columnFilters.status}
                              onChange={(event) => setColumnFilters((previous) => ({ ...previous, status: event.target.value }))}
                            >
                              <option value="all">All</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Rejected">Rejected</option>
                              <option value="Undecided">Undecided</option>
                            </select>
                          </th>
                          <th className="sticky right-0 z-30 bg-muted/40 px-3 py-2">
                            <Input
                              value={columnFilters.score}
                              onChange={(event) => setColumnFilters((previous) => ({ ...previous, score: event.target.value }))}
                              placeholder="Min score"
                              className="h-8"
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCandidates.map((candidate) => {
                          const selected = selectedCandidateIds.includes(candidate.id);
                          return (
                            <tr
                              key={candidate.id}
                              className={cn(
                                "cursor-pointer border-b border-border/80 transition-colors hover:bg-accent/50",
                                selected && "bg-primary/10"
                              )}
                            >
                              <td className="sticky left-0 z-10 bg-background px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleCandidateSelection(candidate.id)}
                                  onClick={(event) => event.stopPropagation()}
                                />
                              </td>
                              <td
                                className="sticky left-10 z-10 bg-background px-3 py-2 font-medium"
                                onClick={() => {
                                  setDrawerCandidate(candidate);
                                  setDrawerTab("overview");
                                }}
                              >
                                {candidate.name}
                              </td>
                              <td className="px-3 py-2" onClick={() => setDrawerCandidate(candidate)}>{candidate.location}</td>
                              <td className="px-3 py-2" onClick={() => setDrawerCandidate(candidate)}>{candidate.experience} yrs</td>
                              <td className="px-3 py-2" onClick={() => setDrawerCandidate(candidate)}>{candidate.mustHaveCoverage}%</td>
                              <td className="px-3 py-2" onClick={() => setDrawerCandidate(candidate)}>
                                <Badge variant={candidate.status === "Rejected" ? "destructive" : "outline"}>{candidate.status}</Badge>
                              </td>
                              <td className="sticky right-0 z-10 bg-background px-3 py-2 text-right font-semibold" onClick={() => setDrawerCandidate(candidate)}>
                                {candidate.score}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, candidates.length)} of {candidates.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}>
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">Page {currentPage} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}>
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exports" className="space-y-4">
              <Card className="border-border/80">
                <CardHeader>
                  <CardTitle>Exports</CardTitle>
                  <CardDescription>Generate files for hiring review, compliance, and downstream systems.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => toast.success("CSV export started", { description: "Shortlist CSV will download shortly." })}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export shortlist CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => toast.success("PDF report started", { description: "Evidence report is being generated." })}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF report
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => toast.success("JSON export started", { description: "Structured JSON archive is being prepared." })}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export structured JSON
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Sheet open={Boolean(drawerCandidate)} onOpenChange={(open) => !open && setDrawerCandidate(null)}>
        <SheetContent side="right" className="w-[560px] overflow-y-auto sm:max-w-[560px]">
          {drawerCandidate ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between gap-2">
                  <span>{drawerCandidate.name}</span>
                  <Badge>{drawerCandidate.score}</Badge>
                </SheetTitle>
                <SheetDescription>Review evidence and provide decision feedback.</SheetDescription>
              </SheetHeader>

              <Tabs value={drawerTab} onValueChange={(value) => setDrawerTab(value as typeof drawerTab)} className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="evidence">Evidence</TabsTrigger>
                  <TabsTrigger value="cv">CV</TabsTrigger>
                  <TabsTrigger value="feedback">Feedback</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card className="border-border/80">
                    <CardContent className="space-y-3 p-4">
                      {drawerCandidate.breakdown.map((metric) => (
                        <div key={metric.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{metric.label}</span>
                            <span>{metric.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary transition-all duration-200" style={{ width: `${metric.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-border/80">
                    <CardHeader>
                      <CardTitle className="text-base">Profile summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Skills:</span> {drawerCandidate.profileSummary.skills.join(", ")}</p>
                      <p><span className="text-muted-foreground">Experience:</span> {drawerCandidate.profileSummary.experience}</p>
                      <p><span className="text-muted-foreground">Location:</span> {drawerCandidate.profileSummary.location}</p>
                      <p><span className="text-muted-foreground">Education:</span> {drawerCandidate.profileSummary.education}</p>
                      <div>
                        <p className="text-muted-foreground">Missing must-haves:</p>
                        {drawerCandidate.missingMustHaves.length === 0 ? (
                          <p className="text-emerald-600">None</p>
                        ) : (
                          <p className="text-destructive">{drawerCandidate.missingMustHaves.join(", ")}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="evidence" className="space-y-3">
                  {drawerCandidate.evidence.map((evidence) => (
                    <Card key={evidence.id} className="border-border/80">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{evidence.criterion}</Badge>
                          <Badge variant="outline">Page {evidence.page}</Badge>
                          <Badge variant="outline">{evidence.confidence} confidence</Badge>
                        </div>
                        <p className="text-sm leading-6">{evidence.snippet}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFocusedEvidenceId(evidence.id);
                            setDrawerTab("cv");
                          }}
                        >
                          Jump to highlight
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {drawerCandidate.evidence.length === 0 ? (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                      No evidence found for this candidate. No claim is shown without evidence.
                    </div>
                  ) : null}
                </TabsContent>

                <TabsContent value="cv" className="space-y-4">
                  <Card className="border-border/80">
                    <CardHeader>
                      <CardTitle className="text-base">CV Viewer</CardTitle>
                      <CardDescription>Highlight coordinates are rendered from stored evidence anchors.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {drawerCandidate.evidence.map((evidence) => (
                        <div key={`page-${evidence.id}`} className="space-y-2">
                          <p className="text-xs text-muted-foreground">Page {evidence.page}</p>
                          <div className="relative h-48 rounded-md border border-border/80 bg-muted/20">
                            <div
                              className={cn(
                                "absolute border-2 border-primary/70 bg-primary/15 transition-all duration-200",
                                focusedEvidenceId === evidence.id && "animate-pulse"
                              )}
                              style={{
                                left: `${evidence.coords.x}%`,
                                top: `${evidence.coords.y}%`,
                                width: `${evidence.coords.w}%`,
                                height: `${evidence.coords.h}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="feedback" className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Feedback saved: skill present")}>Skill present</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Feedback saved: skill not present")}>Skill not present</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Feedback saved: location wrong")}>Location wrong</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Feedback saved: experience wrong")}>Experience wrong</Button>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

type SortableHeaderProps = {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  sticky?: "left" | "right";
};

function SortableHeader({ label, active, direction, onClick, sticky }: SortableHeaderProps) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-left text-xs font-medium",
        sticky === "left" && "sticky left-10 z-30 min-w-[220px] bg-card",
        sticky === "right" && "sticky right-0 z-30 bg-card text-right"
      )}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1">
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", active && direction === "asc" && "rotate-180")} />
      </button>
    </th>
  );
}

type SummaryStatProps = {
  label: string;
  value: string;
  tone?: "default" | "good" | "active" | "bad";
};

function SummaryStat({ label, value, tone = "default" }: SummaryStatProps) {
  return (
    <div className="rounded-lg border border-border/80 bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold",
          tone === "good" && "text-emerald-600",
          tone === "active" && "text-primary",
          tone === "bad" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}
