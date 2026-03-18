"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  duration?: number;
  beamColor?: string;
}

export const BorderBeam = ({
  className,
  duration = 8,
  beamColor = "color-mix(in oklch, var(--primary) 76%, transparent)",
}: BorderBeamProps) => (
  <div
    className={cn(
      "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] p-px",
      className,
    )}
    >
      <div className="absolute inset-0 rounded-[inherit] border border-white/10" />
    <motion.div
      className="absolute inset-[-140%] opacity-90"
      style={{
        background: `conic-gradient(from 0deg, transparent 0deg, ${beamColor} 90deg, transparent 180deg, transparent 360deg)`,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
    />
    <div className="absolute inset-[1px] rounded-[inherit] bg-card/90" />
  </div>
);
