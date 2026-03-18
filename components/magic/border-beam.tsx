"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  duration?: number;
}

export const BorderBeam = ({
  className,
  duration = 8,
}: BorderBeamProps) => (
  <div
    className={cn(
      "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] p-px",
      className,
    )}
  >
    <div className="absolute inset-0 rounded-[inherit] border border-white/10" />
    <motion.div
      className="absolute inset-[-140%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(56,189,248,0.72)_90deg,transparent_180deg,transparent_360deg)] opacity-90"
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
    />
    <div className="absolute inset-[1px] rounded-[inherit] bg-card/90" />
  </div>
);
