"use client";

import React from "react";
import { useMemo } from "react";
import { Mail, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobCandidateDetail, RunResultItem } from "@/lib/jobs";

type CandidateDetailDrawerProps = {
  open: boolean;
  result: RunResultItem | null;
  candidate: JobCandidateDetail | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: (value: string | null | undefined) => void;
  onViewCv: () => void;
  onDownloadCv: () => void;
  onStatusChange: (status: "shortlisted" | "undecided" | "rejected") => void;
};

function confidenceBadge(confidence: number | null | undefined) {
  if (confidence === null || confidence === undefined) {
    return <Badge variant="outline">unknown</Badge>;
  }
  if (confidence >= 0.85) {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">high</Badge>;
  }
  if (confidence >= 0.6) {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500">medium</Badge>;
  }
  return <Badge variant="destructive">low</Badge>;
}

export function CandidateDetailDrawer({
  open,
  result,
  candidate,
  loading,
  onOpenChange,
  onCopy,
  onViewCv,
  onDownloadCv,
  onStatusChange,
}: CandidateDetailDrawerProps) {
  const warnings = useMemo(
    () => candidate?.parsing_warnings_json?.items ?? candidate?.warnings_json?.items ?? [],
    [candidate]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[460px] overflow-y-auto sm:w-[620px]">
        <SheetHeader>
          <SheetTitle>{result?.full_name || "Candidate details"}</SheetTitle>
          <SheetDescription>Parsed profile, evidence and CV access for this job-scoped candidate.</SheetDescription>
        </SheetHeader>

        {!result ? null : (
          <div className="mt-4 space-y-4 pb-20 text-sm">
            <div className="rounded-lg border border-border/80 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
                  <p className="text-2xl font-semibold">{result.total_score.toFixed(1)}</p>
                </div>
                <Badge variant={result.decision === "shortlisted" ? "default" : result.decision === "rejected" ? "destructive" : "outline"}>
                  {result.decision}
                </Badge>
              </div>
              <Progress className="mt-2" value={Math.max(0, Math.min(100, result.total_score))} />
            </div>

            <Tabs defaultValue="overview" className="space-y-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="evidence">Evidence / Warnings</TabsTrigger>
                <TabsTrigger value="cv">CV</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="rounded-lg border border-border/80 p-3">
                  <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Contacts</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{result.email || "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {confidenceBadge(candidate?.extracted_contacts_json?.email?.confidence)}
                        {result.email ? (
                          <Button size="icon" variant="outline" asChild>
                            <a href={`mailto:${result.email}`} aria-label="Send email">
                              <Mail className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => onCopy(result.email)}>
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{result.phone || "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {confidenceBadge(candidate?.extracted_contacts_json?.phone?.confidence)}
                        {result.phone ? (
                          <Button size="icon" variant="outline" asChild>
                            <a href={`tel:${result.phone}`} aria-label="Call phone">
                              <PhoneCall className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => onCopy(result.phone)}>
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/80 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Profile summary</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium">{result.location || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Experience years</p>
                      <p className="font-medium">{result.years_experience_est ?? "-"}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">Top skills</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(result.skills_top_json?.items ?? []).slice(0, 8).map((skill) => (
                        <Badge key={`${result.candidate_id}-${skill}`} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {(result.skills_top_json?.items ?? []).length === 0 ? "-" : null}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="evidence" className="space-y-3">
                <div className="rounded-lg border border-border/80 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Warnings</p>
                  {warnings.length ? (
                    <div className="flex flex-wrap gap-1">
                      {warnings.map((warning) => (
                        <Badge key={`${result.candidate_id}-${warning}`} variant="outline" className="text-xs">
                          {warning}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No parsing warnings.</p>
                  )}
                </div>

                <div className="rounded-lg border border-border/80 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Evidence summary</p>
                  {result.breakdown_json?.reason ? (
                    <p className="text-muted-foreground">{result.breakdown_json.reason}</p>
                  ) : (
                    <p className="text-muted-foreground">No explicit reason string for this decision. Review CV and breakdown.</p>
                  )}
                  {(result.breakdown_json?.missing_must_have ?? []).length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {result.breakdown_json.missing_must_have?.map((missing) => (
                        <Badge key={missing} variant="destructive">
                          Missing: {missing}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="cv" className="space-y-3">
                <div className="rounded-lg border border-border/80 p-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Original file</p>
                  <p className="text-sm font-medium">{candidate?.file_name || "Unknown file"}</p>
                  <p className="text-xs text-muted-foreground">{candidate?.file_mime_type || "unknown mime type"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={onViewCv} disabled={loading || !candidate?.cv_available}>
                      View CV
                    </Button>
                    <Button variant="outline" onClick={onDownloadCv} disabled={loading || !candidate?.cv_available}>
                      Download
                    </Button>
                  </div>
                  {!candidate?.cv_available ? (
                    <p className="mt-2 text-xs text-destructive">CV file is missing from storage for this candidate.</p>
                  ) : null}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {result ? (
          <div className="fixed bottom-0 right-0 w-full border-t border-border/80 bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:w-[620px]">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => onStatusChange("undecided")}>Mark Undecided</Button>
              <Button variant="destructive" onClick={() => onStatusChange("rejected")}>Reject</Button>
              <Button onClick={() => onStatusChange("shortlisted")}>Shortlist</Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
