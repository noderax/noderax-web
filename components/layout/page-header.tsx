import { GlowOrb } from "@/components/magic/glow-orb";
import { GridPattern } from "@/components/magic/grid-pattern";
import { Reveal } from "@/components/magic/reveal";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) => (
  <Reveal
    className={cn(
      "relative mb-6 overflow-hidden rounded-[28px] border border-border/70 bg-card/70 p-6 shadow-dashboard sm:p-7",
      className,
    )}
  >
    <GlowOrb className="right-[-4rem] top-[-5rem] h-40 w-40" color="rgba(59,130,246,0.18)" />
    <GridPattern className="opacity-20" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
            {eyebrow}
          </p>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  </Reveal>
);
