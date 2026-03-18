"use client";

import { motion } from "motion/react";

import { BorderBeam } from "@/components/magic/border-beam";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedCard = ({
  children,
  className,
  delay = 0,
}: AnimatedCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -2 }}
    className={cn("group relative overflow-hidden rounded-3xl", className)}
  >
    <BorderBeam />
    <div className="relative">{children}</div>
  </motion.div>
);
