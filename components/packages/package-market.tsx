"use client";

import { useDeferredValue, useState } from "react";
import { PackageSearch, RefreshCcw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PackageActionDialog } from "@/components/packages/package-action-dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionPanel } from "@/components/ui/section-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchPackages } from "@/lib/hooks/use-noderax-data";

export const PackageMarket = ({
  nodeId,
  nodeLabel,
  canManage,
}: {
  nodeId: string;
  nodeLabel?: string;
  canManage: boolean;
}) => {
  const [term, setTerm] = useState("");
  const deferredTerm = useDeferredValue(term.trim());
  const searchQuery = useSearchPackages(deferredTerm, nodeId);
  const hasSearchTerm = deferredTerm.length >= 2;
  const results = searchQuery.data ?? [];

  return (
    <SectionPanel
      eyebrow="Market"
      title="Search packages"
      description="Search package names and descriptions, then queue install tasks."
      action={
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Type at least 2 characters"
          className="w-full min-w-56 sm:max-w-72"
        />
      }
      contentClassName="space-y-4"
    >
      {!canManage ? (
        <div className="surface-subtle rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
          Only administrators can install or remove packages.
        </div>
      ) : null}

      {!hasSearchTerm ? (
        <EmptyState
          title="Search the package market"
          description="Enter at least two characters to search package names and descriptions for this node."
          icon={PackageSearch}
        />
      ) : searchQuery.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-[18px]" />
          ))}
        </div>
      ) : searchQuery.isError ? (
        <EmptyState
          title="Package search is unavailable"
          description="The package search endpoint could not be reached for the selected node."
          icon={PackageSearch}
          actionLabel="Retry"
          onAction={() => searchQuery.refetch()}
        />
      ) : results.length ? (
        <>
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>
              Showing{" "}
              <span className="font-medium text-foreground">
                {results.length}
              </span>{" "}
              search results
            </p>
            <ShimmerButton
              className="action-btn-sm border-border/70 bg-(--control-surface) text-foreground shadow-none"
              background="var(--control-surface)"
              onClick={() => searchQuery.refetch()}
              disabled={searchQuery.isFetching}
            >
              <RefreshCcw
                className={
                  searchQuery.isFetching
                    ? "size-4 animate-spin"
                    : "action-icon-spin size-4"
                }
              />
              Refresh
            </ShimmerButton>
          </div>

          <ScrollArea className="h-[28rem]">
            <div className="space-y-3 pr-3">
              {results.map((pkg) => (
                <div
                  key={`${pkg.name}:${pkg.version}`}
                  className="surface-subtle rounded-[18px] border px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{pkg.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {pkg.version}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {pkg.description}
                      </p>
                    </div>

                    <PackageActionDialog
                      mode="install"
                      nodeId={nodeId}
                      nodeLabel={nodeLabel}
                      packageName={pkg.name}
                      packageVersion={pkg.version}
                      disabled={!canManage}
                      triggerLabel="Install"
                      triggerVariant="default"
                      triggerSize="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      ) : (
        <EmptyState
          title="No packages found"
          description="No packages matched the current search term for the selected node."
          icon={PackageSearch}
        />
      )}
    </SectionPanel>
  );
};
