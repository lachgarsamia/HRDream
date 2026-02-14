"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, FolderUp, Play, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getJobCandidates, getJobs, getJobRuns } from "@/lib/jobs";

type CommandEntry = {
  id: string;
  label: string;
  subtitle?: string;
  onSelect: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<CommandEntry[]>([]);
  const [candidates, setCandidates] = useState<CommandEntry[]>([]);
  const [runs, setRuns] = useState<CommandEntry[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("shell");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const jobList = await getJobs(1, 20).catch(() => ({ items: [] }));
      setJobs(
        (jobList.items ?? []).map((job) => ({
          id: `job-${job.id}`,
          label: job.name,
          subtitle: `#${job.id}`,
          onSelect: () => router.push(`/jobs/${job.id}?tab=upload`),
        }))
      );

      const match = pathname.match(/^\/jobs\/(\d+)/);
      const activeJobId = match ? Number(match[1]) : null;
      if (!activeJobId) {
        setCandidates([]);
        setRuns([]);
        return;
      }

      const [candidateList, runList] = await Promise.all([
        getJobCandidates(activeJobId, 1, 20).catch(() => ({ items: [] })),
        getJobRuns(activeJobId, 1, 10).catch(() => ({ items: [] })),
      ]);

      setCandidates(
        (candidateList.items ?? []).map((candidate) => ({
          id: `candidate-${candidate.id}`,
          label: candidate.full_name,
          subtitle: candidate.email || candidate.phone || "candidate",
          onSelect: () => router.push(`/jobs/${activeJobId}?tab=shortlist`),
        }))
      );

      setRuns(
        (runList.items ?? []).map((run) => ({
          id: `run-${run.id}`,
          label: `Run #${run.id}`,
          subtitle: run.status,
          onSelect: () => router.push(`/jobs/${activeJobId}?tab=shortlist`),
        }))
      );
    })();
  }, [open, pathname, router]);

  const quickActions: CommandEntry[] = useMemo(
    () => [
      {
        id: "action-upload",
        label: "Upload CVs",
        subtitle: "Open upload tab",
        onSelect: () => {
          const match = pathname.match(/^\/jobs\/(\d+)/);
          if (match) router.push(`/jobs/${match[1]}?tab=upload`);
        },
      },
      {
        id: "action-run",
        label: "Run shortlist",
        subtitle: "Open shortlist tab",
        onSelect: () => {
          const match = pathname.match(/^\/jobs\/(\d+)/);
          if (match) router.push(`/jobs/${match[1]}?tab=shortlist`);
        },
      },
      {
        id: "action-export",
        label: "Export report",
        subtitle: "Open exports tab",
        onSelect: () => {
          const match = pathname.match(/^\/jobs\/(\d+)/);
          if (match) router.push(`/jobs/${match[1]}?tab=exports`);
        },
      },
    ],
    [pathname, router]
  );

  const select = (entry: CommandEntry) => {
    setOpen(false);
    entry.onSelect();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 text-xs text-muted-foreground hover:bg-accent"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("openCommand")}</span>
        <span className="rounded border border-border/70 px-1.5 py-0.5 text-[10px]">⌘K</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("commandPlaceholder")} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick actions">
            {quickActions.map((entry) => (
              <CommandItem key={entry.id} onSelect={() => select(entry)}>
                {entry.id.includes("upload") ? <FolderUp className="h-4 w-4" /> : entry.id.includes("run") ? <Play className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                <div className="flex flex-col">
                  <span>{entry.label}</span>
                  <span className="text-xs text-muted-foreground">{entry.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Jobs">
            {jobs.map((entry) => (
              <CommandItem key={entry.id} onSelect={() => select(entry)}>
                <div className="flex flex-col">
                  <span>{entry.label}</span>
                  <span className="text-xs text-muted-foreground">{entry.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          {candidates.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Candidates">
                {candidates.map((entry) => (
                  <CommandItem key={entry.id} onSelect={() => select(entry)}>
                    <div className="flex flex-col">
                      <span>{entry.label}</span>
                      <span className="text-xs text-muted-foreground">{entry.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
          {runs.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Runs">
                {runs.map((entry) => (
                  <CommandItem key={entry.id} onSelect={() => select(entry)}>
                    <div className="flex flex-col">
                      <span>{entry.label}</span>
                      <span className="text-xs text-muted-foreground">{entry.subtitle}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
