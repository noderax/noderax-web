import Image from "next/image";

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
  <div className={cn("relative size-10 overflow-hidden", className)}>
    <Image
      src="/logo.webp"
      alt={alt}
      fill
      sizes="40px"
      priority={priority}
      unoptimized
      className="object-cover object-center scale-[2.8]"
    />
  </div>
);
