"use client";

import { useDeferredValue, useState } from "react";
import { ArrowLeft, ArrowRight, PackageOpen } from "lucide-react";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNodePackages } from "@/lib/hooks/use-noderax-data";
import type { InstalledPackage } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const resolveStatusTone = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("install")) {
    return "tone-success";
  }

  if (normalizedStatus.includes("remove") || normalizedStatus.includes("purge")) {
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
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(PAGE_SIZE_OPTIONS[0]);
  const [pageIndex, setPageIndex] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const installedPackages = packagesQuery.data;
  const filteredPackages = (installedPackages ?? []).filter((pkg) =>
    deferredQuery
      ? [pkg.name, pkg.version, pkg.status]
          .join(" ")
          .toLowerCase()
          .includes(deferredQuery)
      : true,
  );

  const pageCount = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const currentPageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = currentPageIndex * pageSize;
  const visiblePackages = filteredPackages.slice(pageStart, pageStart + pageSize);

  const controls = (
    <>
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPageIndex(0);
        }}
        placeholder="Filter installed packages"
        className="w-full min-w-56 sm:max-w-64"
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
      {headerAction}
    </>
  );

  return (
    <SectionPanel
      eyebrow="Packages"
      title="Installed packages"
      description="Browse the packages currently installed on the selected node."
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
            <Skeleton key={index} className="h-14 rounded-[18px]" />
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
          <div className="hidden overflow-hidden rounded-[18px] border border-border/80 md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Package</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePackages.map((pkg) => (
                  <InstalledPackageRow
                    key={`${pkg.name}:${pkg.version}`}
                    pkg={pkg}
                    nodeId={nodeId}
                    nodeLabel={nodeLabel}
                    canManage={canManage}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {visiblePackages.map((pkg) => (
              <div
                key={`${pkg.name}:${pkg.version}`}
                className="surface-subtle rounded-[18px] border px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{pkg.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {pkg.version}
                    </p>
                  </div>
                  <PackageStatusBadge status={pkg.status} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {pkg.status}
                  </p>
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
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {pageStart + 1}-{pageStart + visiblePackages.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {filteredPackages.length}
              </span>{" "}
              packages
            </p>

            <div className="flex items-center gap-2">
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
                  setPageIndex((current) => Math.min(pageCount - 1, current + 1))
                }
                disabled={currentPageIndex >= pageCount - 1}
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
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

const InstalledPackageRow = ({
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
  <TableRow>
    <TableCell>
      <div>
        <p className="font-medium">{pkg.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{pkg.status}</p>
      </div>
    </TableCell>
    <TableCell className="text-muted-foreground">{pkg.version}</TableCell>
    <TableCell>
      <PackageStatusBadge status={pkg.status} />
    </TableCell>
    <TableCell className="text-right">
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
    </TableCell>
  </TableRow>
);

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
