"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getJobs, type Job } from "@/lib/jobs";

export default function JobsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    void (async () => {
      try {
        setIsLoadingJobs(true);
        const response = await getJobs(1, 100);
        setJobs(response.items);
      } catch {
        toast.error("Unable to load jobs", {
          description: "Please refresh and try again.",
        });
      } finally {
        setIsLoadingJobs(false);
      }
    })();
  }, [authLoading, isAuthenticated, router]);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [jobs]
  );

  return (
    <AppShell
      title="Jobs"
      subtitle="Create and manage hiring jobs. Open a job to upload CVs, define criteria, and review shortlists."
      primaryAction={
        <Link href="/jobs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </Link>
      }
    >
      <section className="space-y-4">
        {isLoadingJobs ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-border/80">
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))
        ) : sortedJobs.length === 0 ? (
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>No jobs yet</CardTitle>
              <CardDescription>Create your first job to start uploading CVs and running shortlists.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/jobs/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          sortedJobs.map((job) => (
            <Card key={job.id} className="border-border/80 transition-colors hover:border-primary/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">{job.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {job.description?.trim() || "No description added yet."}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Job #{job.id}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Created {new Date(job.created_at).toLocaleDateString()}
                </p>
                <Link href={`/jobs/${job.id}?tab=upload`}>
                  <Button variant="outline">
                    Open Workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </AppShell>
  );
}
