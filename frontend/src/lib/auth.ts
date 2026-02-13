/**
 * Auth Types and API Functions
 */

import { apiClient } from "./api-client";

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
const TOKEN_KEY = "cv_shortlister_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  apiClient.setToken(token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  apiClient.setToken(null);
}

// Initialize token from storage
export function initializeAuth(): void {
  const token = getStoredToken();
  if (token) {
    apiClient.setToken(token);
  }
}

// API Functions
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login", credentials);
  setStoredToken(response.access_token);
  return response;
}

export async function register(data: RegisterData): Promise<User> {
  return apiClient.post<User>("/auth/register", data);
}

export async function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/me");
}

export async function logout(): Promise<void> {
  removeStoredToken();
}
