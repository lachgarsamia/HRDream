"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useSettingsStore } from "@/lib/settings";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  const router = useRouter();
  const registerLogoTap = useSettingsStore((state) => state.registerLogoTap);
  const [rippleKey, setRippleKey] = useState(0);

  return (
    <Link href="/dashboard" className={cn("group inline-flex items-center gap-2", className)}>
      <motion.span
        whileHover={{ rotate: -6, scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"
        onClick={(event) => {
          event.preventDefault();
          const unlocked = registerLogoTap();
          setRippleKey((value) => value + 1);
          if (unlocked) {
            toast.success("Party Mode Unlocked", { description: "Open Settings > Delight Lab to try it." });
          }
          router.push("/dashboard");
        }}
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden>
          <path d="M7 16c0-5 4-9 9-9 4.4 0 8 3.1 8.8 7.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M25 16c0 5-4 9-9 9-4.4 0-8-3.1-8.8-7.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2.3" fill="currentColor" />
        </svg>
        <motion.span
          key={rippleKey}
          initial={{ opacity: 0.35, scale: 0.2 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 rounded-lg border border-primary/40"
        />
      </motion.span>
      {!compact ? <span className="text-sm font-semibold tracking-tight">CV Shortlister</span> : null}
    </Link>
  );
}
