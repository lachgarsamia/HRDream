/**
 * Auth Types and API Functions
 */

import { apiFetch, TOKEN_KEY } from "./api";

// Types
export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Token management
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// Initialize token from storage
export function initializeAuth(): void {
  // no-op: token is read per-request in apiFetch/apiUpload
}

// API Functions
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    data: credentials,
    auth: false,
  });
  setStoredToken(response.access_token);
  return response;
}

export async function register(data: RegisterData): Promise<User> {
  return apiFetch<User>("/auth/register", {
    method: "POST",
    data,
    auth: false,
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>("/me");
}

export async function logout(): Promise<void> {
  removeStoredToken();
}
