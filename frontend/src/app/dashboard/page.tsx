"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, FileCheck2, FlaskConical, ListChecks, Plus, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getJobs, getJobFiles, getJobRuns, type Job } from "@/lib/jobs";

type JobSnapshot = {
  job: Job;
  filesTotal: number;
  indexed: number;
  runs: number;
  lastRunStatus: string;
};

export default function DashboardPage() {
  const [snapshots, setSnapshots] = useState<JobSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const jobsData = await getJobs(1, 8).catch(() => ({ items: [] }));
      const topJobs = jobsData.items ?? [];
      const data = await Promise.all(
        topJobs.map(async (job) => {
          const [files, runs] = await Promise.all([
            getJobFiles(job.id, 1, 200).catch(() => ({ items: [] })),
            getJobRuns(job.id, 1, 10).catch(() => ({ items: [] })),
          ]);
          const items = files.items ?? [];
          const indexed = items.filter((file) => file.status === "indexed").length;
          return {
            job,
            filesTotal: items.length,
            indexed,
            runs: (runs.items ?? []).length,
            lastRunStatus: runs.items?.[0]?.status ?? "none",
          } satisfies JobSnapshot;
        })
      );
      setSnapshots(data);
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => {
    const files = snapshots.reduce((acc, item) => acc + item.filesTotal, 0);
    const indexed = snapshots.reduce((acc, item) => acc + item.indexed, 0);
    const runs = snapshots.reduce((acc, item) => acc + item.runs, 0);
    return { jobs: snapshots.length, files, indexed, runs };
  }, [snapshots]);

  const quality = totals.files === 0 ? 0 : Math.round((totals.indexed / totals.files) * 100);

  return (
    <AppShell
      title="Dashboard"
      subtitle="Resume pipeline health, activity, and quick actions."
      primaryAction={
        <Link href="/jobs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Job
          </Button>
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard title="Jobs" value={totals.jobs} icon={ListChecks} />
        <MetricCard title="CVs indexed" value={`${totals.indexed}/${totals.files}`} icon={FileCheck2} />
        <MetricCard title="Shortlist runs" value={totals.runs} icon={Activity} />
        <MetricCard title="Parsing quality" value={`${quality}%`} icon={FlaskConical} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent jobs</CardTitle>
            <CardDescription>Monitor ingestion progress and jump into workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
              ))
            ) : snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet. Create your first job to start.</p>
            ) : (
              snapshots.map((item) => (
                <Link key={item.job.id} href={`/jobs/${item.job.id}?tab=upload`} className="block rounded-lg border border-border/70 p-3 transition hover:border-primary/40 hover:shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.job.name}</p>
                    <span className="text-xs text-muted-foreground">{item.lastRunStatus}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Progress value={item.filesTotal ? (item.indexed / item.filesTotal) * 100 : 0} className="h-1.5" />
                    <span className="text-xs text-muted-foreground">{item.indexed}/{item.filesTotal}</span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump directly into your most common workflow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/jobs"><Button variant="outline" className="w-full justify-start">Open jobs</Button></Link>
            <Link href="/jobs/new"><Button variant="outline" className="w-full justify-start">Create job</Button></Link>
            <Link href="/settings"><Button variant="outline" className="w-full justify-start">Open settings</Button></Link>
            <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh health
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function MetricCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: typeof Activity }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardDescription>
        <CardTitle className="text-3xl tracking-tight">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
