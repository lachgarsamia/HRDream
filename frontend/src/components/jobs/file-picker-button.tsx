"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";

type FilePickerButtonProps = {
  label: string;
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  directory?: boolean;
  disabled?: boolean;
};

export function FilePickerButton({
  label,
  onFilesSelected,
  accept,
  directory = false,
  disabled = false,
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          inputRef.current?.click();
        }}
        disabled={disabled}
      >
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept={accept}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          onFilesSelected(files);
          event.currentTarget.value = "";
        }}
        {...(directory ? ({ webkitdirectory: "" } as Record<string, string>) : {})}
      />
    </>
  );
}
