"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

interface GlowOrbProps {
  className?: string;
  color?: string;
}

export const GlowOrb = ({
  className,
  color = "rgba(148, 16, 30, 0.34)",
}: GlowOrbProps) => (
  <motion.div
    className={cn("pointer-events-none absolute rounded-full blur-3xl", className)}
    style={{
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    }}
    animate={{
      scale: [1, 1.08, 1],
      opacity: [0.45, 0.8, 0.45],
    }}
    transition={{
      duration: 9,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    }}
    aria-hidden="true"
  />
);
