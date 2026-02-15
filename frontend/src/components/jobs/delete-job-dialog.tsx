"use client";

import React from "react";
import { useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ApiError } from "@/lib/api";

type DeleteJobDialogProps = {
  jobId: number;
  jobName: string;
  candidateCount: number;
  onConfirm: () => Promise<void>;
  trigger?: React.ReactNode;
};

export function DeleteJobDialog({ jobId, jobName, candidateCount, onConfirm, trigger }: DeleteJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = useMemo(() => confirmText.trim() === jobName.trim(), [confirmText, jobName]);

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await onConfirm();
      toast.success("Job deleted");
      setOpen(false);
      setConfirmText("");
    } catch (caught) {
      const error = caught as ApiError;
      if (error?.status === 401) {
        toast.error("Session expired", { description: "Please log in again." });
      } else if (error?.status === 422) {
        toast.error("Unable to delete job", { description: error.detail || "Request was invalid." });
      } else {
        toast.error("Delete failed", { description: error?.detail || "Please try again." });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete job
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete job</DialogTitle>
          <DialogDescription>
            This deletes criteria, runs, and job candidate links for <span className="font-medium text-foreground">{jobName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-foreground">Job ID: #{jobId}</p>
          <p className="text-sm text-foreground">Candidates linked: {candidateCount}</p>
          <label htmlFor="confirm-job-name" className="block text-xs text-muted-foreground">
            Type <span className="font-medium text-foreground">{jobName}</span> to confirm
          </label>
          <Input
            id="confirm-job-name"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={jobName}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={!canDelete || isDeleting} onClick={handleDelete}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete job
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
