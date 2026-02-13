"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Briefcase, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AppShellProps = {
  title: string;
  subtitle: string;
  primaryAction?: React.ReactNode;
  contextLabel?: string;
  contextValue?: string;
  children: React.ReactNode;
};

const navItems = [
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  title,
  subtitle,
  primaryAction,
  contextLabel,
  contextValue,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="grid min-h-[calc(100vh-4rem)] grid-cols-[240px_1fr] gap-6">
          <div className="rounded-xl border border-border/80 bg-card p-6">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-8 space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-6">
            <div className="h-8 w-60 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-96 animate-pulse rounded bg-muted" />
            <div className="mt-6 h-[520px] animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[240px_1fr]">
        <aside className="flex flex-col border-r border-border/80 bg-card/70 p-6">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">CV Shortlister</p>
            <p className="mt-2 text-lg font-semibold text-foreground">Hiring Workspace</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-200",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 rounded-xl border border-border/80 bg-background p-3">
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span className="ml-1.5">{theme === "dark" ? "Light" : "Dark"}</span>
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-3" onClick={logout}>
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col p-8">
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
              {contextLabel && contextValue ? (
                <div className="mt-3">
                  <Badge variant="outline">{contextLabel}: {contextValue}</Badge>
                </div>
              ) : null}
            </div>
            <div>{primaryAction}</div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
