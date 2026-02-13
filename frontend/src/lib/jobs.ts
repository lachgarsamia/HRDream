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
