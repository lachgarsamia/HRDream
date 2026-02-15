"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Briefcase, Check, Command, Globe, LogOut, Monitor, Moon, Settings, Sun, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
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
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { type ThemePreference, useSettingsStore } from "@/lib/settings";

type AppShellProps = {
  title: string;
  subtitle: string;
  primaryAction?: React.ReactNode;
  contextLabel?: string;
  contextValue?: string;
  children: React.ReactNode;
};

const navItems = [
  { href: "/jobs", key: "jobs", icon: Briefcase },
  { href: "/settings", key: "settings", icon: Settings },
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
  const reducedMotionSetting = useSettingsStore((state) => state.reducedMotion);
  const tNav = useTranslations("nav");
  const tShell = useTranslations("shell");
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = prefersReducedMotion || reducedMotionSetting;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-8">
        <div className="grid min-h-[calc(100vh-3rem)] grid-cols-[240px_1fr] gap-6">
          <div className="rounded-xl border border-border/70 bg-card/70 p-5">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-7 space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
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
      <div className={cn("grid min-h-screen", focusMode ? "grid-cols-1" : "grid-cols-[232px_1fr]")}>
        <aside className={cn("flex flex-col border-r border-border/70 bg-card/50 p-4 lg:p-5", focusMode ? "hidden" : "")}>
          <div className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">CV Shortlister</p>
            <p className="mt-1 text-base font-semibold text-foreground">{tShell("workspace")}</p>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-200",
                    active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tNav(item.key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-border/70 bg-background/70 p-3">
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              {tNav("logout")}
            </Button>
          </div>
        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-5 py-3 backdrop-blur lg:px-8">
            <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
                <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <CommandPalette />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      {!mounted ? (
                        <Monitor className="h-4 w-4" />
                      ) : theme === "dark" ? (
                        <Moon className="h-4 w-4" />
                      ) : theme === "light" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Monitor className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel>{tShell("theme")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={theme}
                      onValueChange={(value) => setTheme(value as ThemePreference)}
                    >
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
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => router.push("/settings#profile")}>{tShell("profile")}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push("/settings")}>{tShell("settings")}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={logout}>{tNav("logout")}</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className={cn("mx-auto w-full flex-1 p-5 lg:p-8", focusMode ? "max-w-[1440px]" : "max-w-[1240px]", density === "dense" ? "space-y-4" : "space-y-6")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {contextLabel && contextValue ? (
                <Badge variant="outline">
                  {contextLabel}: {contextValue}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">{pathname}</span>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Command className="h-3 w-3" />
                  ⌘K
                </Badge>
                {primaryAction}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.section
                key={pathname}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
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
