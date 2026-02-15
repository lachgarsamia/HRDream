import { apiDownload, apiFetch, apiFetchBlob, apiUpload } from "./api";

export interface Job {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  user_id: number;
}

export interface JobCreate {
  name: string;
  description?: string | null;
}

export interface JobUpdate {
  name?: string;
  description?: string | null;
}

export interface JobListResponse {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
}

export interface JobFile {
  id: number;
  job_id: number;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  status: string;
  warnings_json: { items?: string[] } | null;
  batch_id: string;
  created_at: string;
}

export interface JobFileListResponse {
  items: JobFile[];
  total: number;
  page: number;
  page_size: number;
}

export interface JobCandidate {
  id: number;
  job_id: number;
  file_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  years_experience_est: number | null;
  skills_top_json: { items?: string[] } | null;
  extracted_contacts_json: {
    email?: { value: string; confidence: number; evidence?: { page_num: number; snippet: string } } | null;
    phone?: { value: string; confidence: number; evidence?: { page_num: number; snippet: string } } | null;
    links?: Array<{ value: string; type: string; confidence: number; evidence?: { page_num: number; snippet: string } }>;
  } | null;
  extracted_meta_json: {
    location_guess?: { value: string; confidence: number; evidence?: { page_num: number; snippet: string } } | null;
    years_experience_est?: { value: number; confidence: number; evidence?: { page_num: number; snippet: string } } | null;
  } | null;
  parsing_warnings_json: { items?: string[] } | null;
  status: string;
  batch_id: string;
  file_status: string;
  warnings_json: { items?: string[] } | null;
  created_at: string;
}

export interface JobCandidateListResponse {
  items: JobCandidate[];
  total: number;
  page: number;
  page_size: number;
}

export interface JobCandidateDetail extends JobCandidate {
  structured_json: Record<string, unknown> | null;
  file_name: string;
  file_mime_type: string;
  cv_available: boolean;
}

export interface UploadResponse {
  batch_id: string;
  files_created: number;
  candidate_ids: number[];
}

export interface RunCreateResponse {
  id: number;
  job_id: number;
  status: string;
  created_at: string;
  included_candidate_count: number;
}

export interface RunListItem {
  id: number;
  job_id: number;
  status: string;
  created_at: string;
  scoring_config_version: string;
}

export interface RunListResponse {
  items: RunListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface RunResultItem {
  score_id: number;
  candidate_id: number;
  job_id: number;
  run_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  years_experience_est: number | null;
  skills_top_json: { items?: string[] } | null;
  total_score: number;
  breakdown_json: { breakdown?: Record<string, number>; reason?: string | null; missing_must_have?: string[] };
  decision: string;
}

export interface RunResultsResponse {
  provenance: {
    job_id: number;
    run_id: number;
    included_candidate_count: number;
    included_batches: string[];
    criteria_version: string;
    scoring_config_version: string;
    created_at: string;
  };
  items: RunResultItem[];
}

export interface RunExportStatus {
  csv_ready: boolean;
  pdf_ready: boolean;
  reason?: string;
}

export type Seniority = "intern" | "junior" | "mid" | "senior" | "lead" | "principal";
export type RoleCategory =
  | "engineering"
  | "data"
  | "product"
  | "design"
  | "operations"
  | "marketing"
  | "sales"
  | "finance"
  | "other";
export type EmploymentType = "full_time" | "part_time" | "contract" | "temporary" | "internship";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type LocationStrictness = "hard_filter" | "soft_preference";
export type LanguageLevel = "basic" | "conversational" | "professional" | "native";
export type ScoringPreset = "strict" | "balanced" | "exploratory" | "skills_first" | "exp_first";

export interface LanguageRequirement {
  language: string;
  level: LanguageLevel;
}

export interface HardFilterToggles {
  reject_if_missing_must_have: boolean;
  reject_if_location_mismatch: boolean;
  reject_if_min_exp_not_met: boolean;
  reject_if_missing_language: boolean;
}

export interface RoleIntakePayload {
  role_title: string;
  seniority: Seniority;
  role_category: RoleCategory;
  employment_type: EmploymentType;
  work_mode: WorkMode;
  allowed_cities: string[];
  allowed_countries: string[];
  relocation_accepted: boolean;
  location_strictness: LocationStrictness;

  must_have_technical_skills: string[];
  must_have_frameworks: string[];
  must_have_tools: string[];
  nice_to_have_skills: string[];
  nice_to_have_frameworks: string[];
  nice_to_have_tools: string[];

  soft_skills_required: string[];
  soft_skills_preferred: string[];
  min_years_experience: number;
  domain_experience: string[];
  career_stability_rule: boolean;

  required_languages: LanguageRequirement[];
  education_requirement: string | null;
  keywords_boost: string[];
  keywords_penalize: string[];

  scoring_preset: ScoringPreset;
  hard_filter_toggles: HardFilterToggles;
}

export interface RoleIntakeResponse {
  id: number;
  project_id: number;
  role_title: string;
  criteria_json: RoleIntakePayload;
  created_at: string;
  updated_at: string;
}

export interface RoleSuggestionResponse {
  source: "stub";
  suggestion: RoleIntakePayload;
}

export async function getJobs(page: number = 1, pageSize: number = 100): Promise<JobListResponse> {
  return apiFetch<JobListResponse>(`/jobs?page=${page}&page_size=${pageSize}`);
}

export async function getJob(id: number): Promise<Job> {
  return apiFetch<Job>(`/jobs/${id}`);
}

export async function createJob(data: JobCreate): Promise<Job> {
  return apiFetch<Job>("/jobs", { method: "POST", data });
}

export async function updateJob(id: number, data: JobUpdate): Promise<Job> {
  return apiFetch<Job>(`/jobs/${id}`, { method: "PATCH", data });
}

export async function deleteJob(id: number): Promise<void> {
  await apiFetch<void>(`/jobs/${id}`, { method: "DELETE" });
}

export async function uploadJobFiles(jobId: number, files: globalThis.File[]): Promise<UploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  return apiUpload<UploadResponse>(`/jobs/${jobId}/upload`, formData);
}

export async function getJobFiles(jobId: number, page: number = 1, pageSize: number = 100): Promise<JobFileListResponse> {
  return apiFetch<JobFileListResponse>(`/jobs/${jobId}/files?page=${page}&page_size=${pageSize}`);
}

export async function getJobCandidates(jobId: number, page: number = 1, pageSize: number = 100): Promise<JobCandidateListResponse> {
  return apiFetch<JobCandidateListResponse>(`/jobs/${jobId}/candidates?page=${page}&page_size=${pageSize}`);
}

export async function getJobCandidateDetails(jobId: number, candidateId: number): Promise<JobCandidateDetail> {
  return apiFetch<JobCandidateDetail>(`/jobs/${jobId}/candidates/${candidateId}`);
}

export async function saveJobCriteria(jobId: number, criteria_json: Record<string, unknown>): Promise<{
  role_id: number;
  project_id: number;
  role_title: string;
  criteria_json: Record<string, unknown>;
  updated_at: string;
}> {
  return apiFetch(`/jobs/${jobId}/criteria`, {
    method: "POST",
    data: { criteria_json },
  });
}

export async function createJobRun(jobId: number): Promise<RunCreateResponse> {
  return apiFetch<RunCreateResponse>(`/jobs/${jobId}/runs`, {
    method: "POST",
    data: {},
  });
}

export async function getJobRuns(jobId: number, page: number = 1, pageSize: number = 20): Promise<RunListResponse> {
  return apiFetch<RunListResponse>(`/jobs/${jobId}/runs?page=${page}&page_size=${pageSize}`);
}

export async function getRunResults(runId: number): Promise<RunResultsResponse> {
  return apiFetch<RunResultsResponse>(`/runs/${runId}/results`);
}

export async function getRunExportStatus(runId: number): Promise<RunExportStatus> {
  return apiFetch<RunExportStatus>(`/runs/${runId}/export/status`);
}

async function downloadRunBinary(runId: number, endpoint: "export.csv" | "report.pdf", filename: string): Promise<void> {
  await apiDownload(`/runs/${runId}/${endpoint}`, filename);
}

export async function downloadRunCsv(runId: number): Promise<void> {
  await downloadRunBinary(runId, "export.csv", `shortlist_run_${runId}.csv`);
}

export async function downloadRunPdf(runId: number): Promise<void> {
  await downloadRunBinary(runId, "report.pdf", `shortlist_report_run_${runId}.pdf`);
}

export async function fetchCandidateCvBlob(jobId: number, candidateId: number): Promise<Blob> {
  return apiFetchBlob(`/jobs/${jobId}/candidates/${candidateId}/cv`);
}

export async function saveRoleIntake(projectId: number, payload: RoleIntakePayload): Promise<RoleIntakeResponse> {
  return apiFetch<RoleIntakeResponse>(`/projects/${projectId}/roles`, {
    method: "POST",
    data: payload,
  });
}

export async function suggestRoleIntake(input: {
  role_title: string;
  job_description: string;
}): Promise<RoleSuggestionResponse> {
  return apiFetch<RoleSuggestionResponse>("/roles/suggest", {
    method: "POST",
    data: input,
  });
}
