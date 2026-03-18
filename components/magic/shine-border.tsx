"use client";

import type { CSSProperties } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

interface ShineBorderProps {
  className?: string;
  shineColor?: string | string[];
  borderWidth?: number;
  duration?: number;
}

export const ShineBorder = ({
  className,
  shineColor = ["#f87171", "#991b1b", "#fb7185"],
  borderWidth = 1,
  duration = 14,
}: ShineBorderProps) => {
  const colors = Array.isArray(shineColor) ? shineColor : [shineColor];

  const style: CSSProperties = {
    padding: borderWidth,
    backgroundImage: `linear-gradient(115deg, ${colors.join(", ")}, ${colors[0]})`,
    backgroundSize: "220% 220%",
    WebkitMask:
      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
  };

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] opacity-80",
        className,
      )}
      style={style}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
      }}
    />
  );
};
