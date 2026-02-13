"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createJob } from "@/lib/jobs";

export default function NewJobPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("Job title is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const job = await createJob({
        name: title.trim(),
        description: description.trim() || null,
      });
      toast.success("Job created", {
        description: "You can now upload CVs and define criteria.",
      });
      router.push(`/jobs/${job.id}?tab=upload`);
    } catch {
      toast.error("Unable to create job", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell title="Create Job" subtitle="Set up a hiring job and start your workspace flow immediately.">
      <Card className="max-w-2xl border-border/80">
        <CardHeader>
          <CardTitle>Job Setup</CardTitle>
          <CardDescription>Enter the hiring job details. You can update these later in Criteria.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="job-title">Job title</Label>
              <Input
                id="job-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Senior Frontend Engineer"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description">Job description (optional)</Label>
              <Textarea
                id="job-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe key responsibilities, required skills, and hiring context."
                rows={6}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Job"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/jobs")} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
