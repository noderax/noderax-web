import Image from "next/image";
import logoSrc from "@/public/logo.webp";

import { cn } from "@/lib/utils";

export const BrandMark = ({
  className,
  alt = "Noderax",
  priority = false,
}: {
  className?: string;
  alt?: string;
  priority?: boolean;
}) => (
  <Image
    src={logoSrc}
    alt={alt}
    priority={priority}
    className={cn("size-10 object-contain scale-[1.3]", className)}
  />
);

export const BrandBadge = ({
  className,
  markClassName,
  alt = "Noderax",
  priority = false,
  size = "md",
}: {
  className?: string;
  markClassName?: string;
  alt?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
}) => {
  const sizes = {
    sm: {
      frame: "size-14 rounded-xl p-1",
      mark: "size-full",
    },
    md: {
      frame: "size-12 rounded-[1rem] p-1",
      mark: "size-full",
    },
    lg: {
      frame: "size-14 rounded-[1.15rem] p-1.5",
      mark: "size-full",
    },
  } as const;

  return (
    <div
      className={cn(
        "brand-badge relative flex items-center justify-center overflow-hidden border",
        sizes[size].frame,
        className,
      )}
    >
      <BrandMark
        alt={alt}
        priority={priority}
        className={cn(sizes[size].mark, markClassName)}
      />
    </div>
  );
};
