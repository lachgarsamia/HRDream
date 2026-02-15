"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  Globe,
  Home,
  LogOut,
  Monitor,
  Moon,
  Search,
  Settings,
  Sparkles,
  Sun,
  Download,
  Upload,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { CommandPalette } from "@/components/command-palette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { type ThemePreference, useSettingsStore } from "@/lib/settings";
import { getJobFiles, getJobs, getJobRuns, type Job } from "@/lib/jobs";

type AppShellProps = {
  title: string;
  subtitle: string;
  primaryAction?: React.ReactNode;
  contextLabel?: string;
  contextValue?: string;
  children: React.ReactNode;
};

type SidebarJob = {
  id: number;
  name: string;
  indexed: number;
  total: number;
  lastRunStatus: string;
  lastActivity: string;
};

const navItems = [
  { href: "/dashboard", key: "home", icon: Home },
  { href: "/jobs", key: "jobs", icon: Briefcase },
] as const;

export function AppShell({ title, subtitle, primaryAction, contextLabel, contextValue, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { theme, setTheme, mounted } = useTheme();
  const locale = useSettingsStore((state) => state.locale);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const density = useSettingsStore((state) => state.density);
  const focusMode = useSettingsStore((state) => state.focusMode);
  const setFocusMode = useSettingsStore((state) => state.setFocusMode);
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const smoothTransitions = useSettingsStore((state) => state.smoothTransitions);
  const tNav = useTranslations("nav");
  const tShell = useTranslations("shell");
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion || reducedMotionSetting || !smoothTransitions;

  const [collapsed, setCollapsed] = useState(false);
  const [jobFilter, setJobFilter] = useState("");
  const [recentJobs, setRecentJobs] = useState<SidebarJob[]>([]);
  const [jobContext, setJobContext] = useState<{ jobId: number | null; indexed: number; runs: number }>({ jobId: null, indexed: 0, runs: 0 });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      const jobsResponse = await getJobs(1, 8).catch(() => ({ items: [] as Job[] }));
      const items = await Promise.all(
        (jobsResponse.items ?? []).map(async (job) => {
          const [files, runs] = await Promise.all([
            getJobFiles(job.id, 1, 200).catch(() => ({ items: [] })),
            getJobRuns(job.id, 1, 5).catch(() => ({ items: [] })),
          ]);
          const indexed = (files.items ?? []).filter((file) => file.status === "indexed").length;
          const total = (files.items ?? []).length;
          return {
            id: job.id,
            name: job.name,
            indexed,
            total,
            lastRunStatus: runs.items?.[0]?.status ?? (total === 0 ? "needs upload" : "ready"),
            lastActivity: runs.items?.[0]?.created_at ?? job.created_at,
          } satisfies SidebarJob;
        })
      );
      setRecentJobs(items);
    })();
  }, [isAuthenticated, pathname]);

  useEffect(() => {
    const match = pathname.match(/^\/jobs\/(\d+)/);
    const activeJobId = match ? Number(match[1]) : null;
    if (!activeJobId) {
      setJobContext({ jobId: null, indexed: 0, runs: 0 });
      return;
    }
    void (async () => {
      const [files, runs] = await Promise.all([
        getJobFiles(activeJobId, 1, 200).catch(() => ({ items: [] })),
        getJobRuns(activeJobId, 1, 10).catch(() => ({ items: [] })),
      ]);
      setJobContext({
        jobId: activeJobId,
        indexed: (files.items ?? []).filter((item) => item.status === "indexed").length,
        runs: (runs.items ?? []).length,
      });
    })();
  }, [pathname]);

  const filteredJobs = useMemo(
    () => recentJobs.filter((job) => job.name.toLowerCase().includes(jobFilter.toLowerCase())),
    [jobFilter, recentJobs]
  );

  const quickActions = [
    {
      key: "upload",
      label: "Upload CVs",
      href: jobContext.jobId ? `/jobs/${jobContext.jobId}?tab=upload` : "/jobs",
      enabled: Boolean(jobContext.jobId),
      reason: "Open a job first",
      icon: Upload,
    },
    {
      key: "criteria",
      label: "Define Criteria",
      href: jobContext.jobId ? `/jobs/${jobContext.jobId}?tab=criteria` : "/jobs",
      enabled: Boolean(jobContext.jobId),
      reason: "Open a job first",
      icon: Sparkles,
    },
    {
      key: "run",
      label: "Run Shortlist",
      href: jobContext.jobId ? `/jobs/${jobContext.jobId}?tab=shortlist` : "/jobs",
      enabled: Boolean(jobContext.jobId) && jobContext.indexed > 0,
      reason: jobContext.jobId ? "Upload and index candidates first" : "Open a job first",
      icon: Briefcase,
    },
    {
      key: "export",
      label: "Export",
      href: jobContext.jobId ? `/jobs/${jobContext.jobId}?tab=exports` : "/jobs",
      enabled: Boolean(jobContext.jobId) && jobContext.runs > 0,
      reason: jobContext.jobId ? "Run shortlist before exporting" : "Open a job first",
      icon: Download,
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-8">
        <div className="grid min-h-[calc(100vh-3rem)] grid-cols-[260px_1fr] gap-6">
          <div className="rounded-xl border border-border/70 bg-card/70 p-5">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-7 space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/70 p-6">
            <div className="h-9 w-72 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-96 animate-pulse rounded bg-muted" />
            <div className="mt-6 h-[520px] animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={cn("grid min-h-screen", focusMode ? "grid-cols-1" : collapsed ? "grid-cols-[74px_1fr]" : "grid-cols-[285px_1fr]")}>
        <aside className={cn("flex flex-col border-r border-border/70 bg-card/55 p-3", focusMode ? "hidden" : "")}> 
          <div className="mb-3 flex items-center justify-between">
            <BrandLogo compact={collapsed} />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed((value) => !value)} title={collapsed ? "Expand" : "Collapse"}>
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? tNav(item.key) : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-all duration-200",
                    active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  {active ? <span className="absolute left-0 h-6 w-[2px] rounded bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" /> : null}
                  <Icon className="h-4 w-4" />
                  {!collapsed ? <span className="font-medium">{tNav(item.key)}</span> : null}
                </Link>
              );
            })}
          </nav>

          {!collapsed ? (
            <div className="mt-3 rounded-xl border border-border/70 bg-background/70 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Jump to job</p>
              <div className="mb-2 flex items-center gap-2 rounded-md border border-border/70 px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={jobFilter}
                  onChange={(event) => setJobFilter(event.target.value)}
                  placeholder="Jump to job..."
                  className="h-8 w-full bg-transparent text-xs outline-none"
                />
              </div>
              <div className="space-y-2">
                {filteredJobs.slice(0, 5).map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}?tab=upload`} className="block rounded-md border border-border/70 px-2 py-2 transition hover:border-primary/40 hover:bg-accent/30">
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-xs font-medium">{job.name}</p>
                      <Badge variant="outline" className="text-[10px]">{job.lastRunStatus}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={job.total ? (job.indexed / job.total) * 100 : 0} className="h-1" />
                      <span className="text-[10px] text-muted-foreground">{job.indexed}/{job.total}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(job.lastActivity).toLocaleDateString()}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="mt-3 h-9 w-9 self-center" title="Job switcher">
                  <Briefcase className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel>Recent jobs</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {filteredJobs.slice(0, 6).map((job) => (
                  <DropdownMenuItem key={job.id} onSelect={() => router.push(`/jobs/${job.id}?tab=upload`)}>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{job.name}</p>
                      <p className="text-[10px] text-muted-foreground">{job.indexed}/{job.total} indexed · {job.lastRunStatus}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className={cn("mt-auto rounded-xl border border-border/70 bg-background/75 p-2", collapsed ? "space-y-2" : "space-y-1")}> 
            <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "")}> 
              <Button variant="ghost" size="sm" className={cn("h-8", collapsed ? "w-8 p-0" : "w-full justify-start")} onClick={() => router.push("/settings")} title="Settings">
                <Settings className="h-4 w-4" />
                {!collapsed ? <span className="ml-2 text-xs">{tNav("settings")}</span> : null}
              </Button>
            </div>
            {!collapsed ? (
              <>
                <p className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">Quick actions</p>
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.key} href={action.enabled ? action.href : "#"} title={!action.enabled ? action.reason : action.label}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!action.enabled}
                        className="h-8 w-full justify-start text-xs"
                        onClick={(event) => {
                          if (!action.enabled) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <Icon className="mr-2 h-3.5 w-3.5" />
                        {action.label}
                      </Button>
                    </Link>
                  );
                })}
              </>
            ) : null}
            <div className={cn("pt-1", collapsed ? "text-center" : "")}> 
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Command className="h-3 w-3" />
                ⌘K
              </Badge>
            </div>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 px-4 py-3 backdrop-blur lg:px-8">
            <div className={cn("mx-auto flex w-full items-center justify-between gap-3", focusMode ? "max-w-[1440px]" : "max-w-[1240px]")}>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">{pathname}</p>
                <h1 className="truncate text-xl font-semibold tracking-tight lg:text-2xl">{title}</h1>
                <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <CommandPalette />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      {!mounted ? <Monitor className="h-4 w-4" /> : theme === "dark" ? <Moon className="h-4 w-4" /> : theme === "light" ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>{tShell("theme")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}>
                      <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <Globe className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuLabel>{tShell("language")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setLocale("en")}>English {locale === "en" ? <Check className="ml-auto h-4 w-4" /> : null}</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocale("fr")}>Français {locale === "fr" ? <Check className="ml-auto h-4 w-4" /> : null}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push("/account")}>Account</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push("/settings")}>Preferences</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push("/settings#shortcuts")}>Keyboard shortcuts</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={logout}>{tNav("logout")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className={cn("mx-auto w-full flex-1 p-4 lg:p-8", focusMode ? "max-w-[1440px]" : "max-w-[1240px]", density === "dense" ? "space-y-3" : "space-y-5")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {contextLabel && contextValue ? <Badge variant="outline">{contextLabel}: {contextValue}</Badge> : <span className="text-xs text-muted-foreground">{tShell("workspace")}</span>}
              <div>{primaryAction}</div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.section
                key={pathname}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
              >
                {children}
              </motion.section>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
