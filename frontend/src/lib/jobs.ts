import { apiClient } from "./api-client";

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

export async function getJobs(page: number = 1, pageSize: number = 50): Promise<JobListResponse> {
  return apiClient.get<JobListResponse>(`/projects?page=${page}&page_size=${pageSize}`);
}

export async function getJob(id: number): Promise<Job> {
  return apiClient.get<Job>(`/projects/${id}`);
}

export async function createJob(data: JobCreate): Promise<Job> {
  return apiClient.post<Job>("/projects", data);
}

export async function updateJob(id: number, data: JobUpdate): Promise<Job> {
  return apiClient.patch<Job>(`/projects/${id}`, data);
}

export async function deleteJob(id: number): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export async function saveRoleIntake(projectId: number, payload: RoleIntakePayload): Promise<RoleIntakeResponse> {
  return apiClient.post<RoleIntakeResponse>(`/projects/${projectId}/roles`, payload);
}

export async function suggestRoleIntake(input: {
  role_title: string;
  job_description: string;
}): Promise<RoleSuggestionResponse> {
  return apiClient.post<RoleSuggestionResponse>("/roles/suggest", input);
}
