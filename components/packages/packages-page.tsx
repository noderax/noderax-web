"use client";

import { useDeferredValue, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  PackageOpen,
  RefreshCcw,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PackageActionDialog } from "@/components/packages/package-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionPanel } from "@/components/ui/section-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNodePackages } from "@/lib/hooks/use-noderax-data";
import type { InstalledPackage } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const resolveStatusTone = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("install")) {
    return "tone-success";
  }

  if (
    normalizedStatus.includes("remove") ||
    normalizedStatus.includes("purge")
  ) {
    return "tone-danger";
  }

  return "tone-neutral";
};

export const PackagesPage = ({
  nodeId,
  nodeLabel,
  canManage,
  headerAction,
}: {
  nodeId: string;
  nodeLabel?: string;
  canManage: boolean;
  headerAction?: React.ReactNode;
}) => {
  const packagesQuery = useNodePackages(nodeId);
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    PAGE_SIZE_OPTIONS[0],
  );
  const [pageIndex, setPageIndex] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const installedPackages = packagesQuery.data;
  const filteredPackages = (installedPackages ?? []).filter((pkg) =>
    deferredQuery
      ? [pkg.name, pkg.version, pkg.status, pkg.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(deferredQuery)
      : true,
  );

  const pageCount = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const currentPageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = currentPageIndex * pageSize;
  const visiblePackages = filteredPackages.slice(
    pageStart,
    pageStart + pageSize,
  );

  const controls = (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPageIndex(0);
        }}
        placeholder="Search name, version, or description"
        className="w-full min-w-56 sm:max-w-72"
      />
      <Select
        value={String(pageSize)}
        onValueChange={(value) => {
          setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
          setPageIndex(0);
        }}
      >
        <SelectTrigger className="min-w-32">
          <SelectValue placeholder="Rows" />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option} rows
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void packagesQuery.refetch()}
        disabled={packagesQuery.isFetching}
      >
        <RefreshCcw className="size-4" />
        Refresh
      </Button>
      {headerAction}
    </div>
  );

  return (
    <SectionPanel
      eyebrow="Packages"
      title="Installed packages"
      description="Review installed packages and queue removal tasks when needed."
      action={controls}
      contentClassName="space-y-4"
    >
      {!canManage ? (
        <div className="surface-subtle rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
          Only administrators can install or remove packages.
        </div>
      ) : null}

      {packagesQuery.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-[18px]" />
          ))}
        </div>
      ) : packagesQuery.isError ? (
        <EmptyState
          title="Package list is unavailable"
          description="Installed packages could not be loaded from the selected node."
          icon={PackageOpen}
          actionLabel="Retry"
          onAction={() => packagesQuery.refetch()}
        />
      ) : visiblePackages.length ? (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm">
            <p className="text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {pageStart + 1}–{pageStart + visiblePackages.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {filteredPackages.length}
              </span>{" "}
              packages
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() =>
                  setPageIndex((current) => Math.max(0, current - 1))
                }
                disabled={currentPageIndex === 0}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <span className="min-w-[4rem] text-center text-xs font-medium text-muted-foreground">
                {currentPageIndex + 1} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() =>
                  setPageIndex((current) =>
                    Math.min(pageCount - 1, current + 1),
                  )
                }
                disabled={currentPageIndex >= pageCount - 1}
              >
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Card list */}
          <div className="space-y-2.5">
            {visiblePackages.map((pkg) => (
              <PackageCard
                key={`${pkg.name}:${pkg.version}`}
                pkg={pkg}
                nodeId={nodeId}
                nodeLabel={nodeLabel}
                canManage={canManage}
              />
            ))}
          </div>

          {/* Bottom pagination (only when > 1 page) */}
          {pageCount > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPageIndex((current) => Math.max(0, current - 1))
                }
                disabled={currentPageIndex === 0}
              >
                <ArrowLeft className="size-4" />
                Previous
              </Button>
              <div className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
                Page {currentPageIndex + 1} / {pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPageIndex((current) =>
                    Math.min(pageCount - 1, current + 1),
                  )
                }
                disabled={currentPageIndex >= pageCount - 1}
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          title={
            (installedPackages?.length ?? 0)
              ? "No packages match the current filter"
              : "No installed packages found"
          }
          description={
            (installedPackages?.length ?? 0)
              ? "The installed package list loaded successfully, but the local filter did not match any entries."
              : "The selected node did not return any installed package entries."
          }
          icon={PackageOpen}
        />
      )}
    </SectionPanel>
  );
};

/* ── Package Card ── */

const PackageCard = ({
  pkg,
  nodeId,
  nodeLabel,
  canManage,
}: {
  pkg: InstalledPackage;
  nodeId: string;
  nodeLabel?: string;
  canManage: boolean;
}) => (
  <div className="group surface-subtle flex w-full flex-col gap-3 rounded-2xl border px-5 py-4 transition-colors hover:bg-muted/40">
    {/* Top row: icon + name | badges + action */}
    <div className="flex items-start justify-between gap-4">
      {/* Left: icon + name block */}
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground">
          <Box className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {pkg.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{pkg.version}</span>
            {pkg.architecture ? (
              <>
                <span className="opacity-40">·</span>
                <span className="font-semibold uppercase tracking-wider opacity-60">
                  {pkg.architecture}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right: status + action */}
      <div className="flex shrink-0 items-center gap-2">
        <PackageStatusBadge status={pkg.status} />
        <PackageActionDialog
          mode="remove"
          nodeId={nodeId}
          nodeLabel={nodeLabel}
          packageName={pkg.name}
          packageVersion={pkg.version}
          disabled={!canManage}
          triggerLabel="Remove"
          triggerVariant="outline"
        />
      </div>
    </div>

    {/* Description row */}
    {pkg.description ? (
      <p
        className="line-clamp-2 pl-12 text-[13px] leading-relaxed text-muted-foreground/80"
        title={pkg.description}
      >
        {pkg.description}
      </p>
    ) : null}
  </div>
);

/* ── Status Badge ── */

const PackageStatusBadge = ({ status }: { status: string }) => (
  <Badge
    variant="outline"
    className={cn(
      "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
      resolveStatusTone(status),
    )}
  >
    {status}
  </Badge>
);
