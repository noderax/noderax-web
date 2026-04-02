import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { cn } from "@/lib/utils";

export interface AnimatedGradientTextButtonProps
  extends ComponentPropsWithoutRef<"button"> {
  label: string;
  prefixContent?: ReactNode;
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
  showChevron?: boolean;
}

export function AnimatedGradientTextButton({
  label,
  prefixContent = "🚀",
  speed = 1,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  showChevron = true,
  className,
  type = "button",
  ...props
}: AnimatedGradientTextButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "group relative inline-flex items-center justify-center rounded-full px-4 py-1.5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        className="animate-gradient absolute inset-0 block h-full w-full rounded-[inherit] bg-linear-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-size-[300%_100%] p-px"
        style={
          {
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "destination-out",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "subtract",
            WebkitClipPath: "padding-box",
          } as CSSProperties
        }
      />
      <span className="inline-flex items-center">
        {prefixContent}
        <hr className="mx-2 h-4 w-px shrink-0 bg-neutral-500" />
        <AnimatedGradientText
          speed={speed}
          colorFrom={colorFrom}
          colorTo={colorTo}
          className="text-sm font-medium"
        >
          {label}
        </AnimatedGradientText>
        {showChevron ? (
          <ChevronRight className="ml-1 size-4 stroke-neutral-500 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
        ) : null}
      </span>
    </button>
  );
}