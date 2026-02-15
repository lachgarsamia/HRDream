"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  User,
  LoginCredentials,
  RegisterData,
  login as apiLogin,
  register as apiRegister,
  getCurrentUser,
  logout as apiLogout,
  initializeAuth,
  getStoredToken,
} from "@/lib/auth";
import type { ApiError } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth on mount
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      router.push("/login");
    };

    const init = async () => {
      initializeAuth();
      const token = getStoredToken();
      
      if (token) {
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          // Token invalid, clear it
          await apiLogout();
          const apiError = error as ApiError;
          if (apiError?.status === 401) {
            setUser(null);
          }
        }
      }
      
      setIsLoading(false);
    };

    window.addEventListener("auth:unauthorized", onUnauthorized as EventListener);
    init();
    return () => {
      window.removeEventListener("auth:unauthorized", onUnauthorized as EventListener);
    };
  }, [router]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    await apiLogin(credentials);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    router.push("/dashboard");
  }, [router]);

  const register = useCallback(async (data: RegisterData) => {
    await apiRegister(data);
    // After registration, log them in
    await login({ email: data.email, password: data.password });
  }, [login]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
