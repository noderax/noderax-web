import { GlowOrb } from "@/components/magic/glow-orb";
import { GridPattern } from "@/components/magic/grid-pattern";
import { Reveal } from "@/components/magic/reveal";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  eyebrow,
  actions,
  meta,
  className,
}: PageHeaderProps) => (
  <Reveal
    className={cn(
      "surface-feature relative overflow-hidden rounded-[36px] border p-6 shadow-dashboard sm:p-8",
      className,
    )}
  >
    <GlowOrb
      className="right-[-4rem] top-[-5rem] h-44 w-44"
      color="rgba(138, 17, 30, 0.22)"
    />
    <GlowOrb
      className="bottom-[-3rem] left-[-2rem] h-32 w-32"
      color="rgba(124, 72, 24, 0.12)"
    />
    <GridPattern className="opacity-18" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(156,28,41,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_26%)]" />
    <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] xl:items-end">
      <div className="space-y-5">
        {eyebrow ? (
          <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <div className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            {description}
          </div>
        </div>
        {meta ? <div className="flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="surface-subtle relative overflow-hidden rounded-[28px] border p-4">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)]" />
          <div className="relative z-10 flex flex-wrap items-center gap-3">
            {actions}
          </div>
        </div>
      ) : null}
    </div>
  </Reveal>
);
