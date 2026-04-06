"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw, Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionPanel } from "@/components/ui/section-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeDisplay } from "@/components/ui/time-display";
import {
  useNodeLogPresets,
  usePreviewNodeLogs,
} from "@/lib/hooks/use-noderax-data";

const clampBackfillLines = (value: string) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 200;
  }

  return Math.min(Math.max(parsed, 1), 500);
};

export const NodeLogsPanel = ({ nodeId }: { nodeId: string }) => {
  const presetsQuery = useNodeLogPresets(nodeId);
  const previewLogs = usePreviewNodeLogs(nodeId);

  const presets = presetsQuery.data ?? [];
  const [selectedPresetId, setSelectedPresetId] = useState("auth.log");
  const [backfillLines, setBackfillLines] = useState("200");
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    if (!presets.length) {
      return;
    }

    const hasSelectedPreset = presets.some((preset) => preset.id === selectedPresetId);
    if (hasSelectedPreset) {
      return;
    }

    const nextPreset = presets[0];
    setSelectedPresetId(nextPreset.id);
    setBackfillLines(String(nextPreset.defaultBackfillLines ?? 200));
  }, [presets, selectedPresetId]);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) ?? null,
    [presets, selectedPresetId],
  );
  const preview = previewLogs.data;
  const previewEntries = preview?.entries ?? [];
  const filteredEntries = useMemo(() => {
    const query = filterText.trim().toLowerCase();

    if (!query) {
      return previewEntries;
    }

    return previewEntries.filter((entry) =>
      [entry.timestamp, entry.message, entry.unit, entry.identifier]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [filterText, previewEntries]);

  const handlePreview = () => {
    if (!selectedPreset) {
      return;
    }

    previewLogs.mutate({
      sourcePresetId: selectedPreset.id,
      backfillLines: clampBackfillLines(backfillLines),
    });
  };

  return (
    <SectionPanel
      eyebrow="Logs"
      title="Logs Explorer"
      description="Preview recent lines from the built-in Linux log presets, then filter them locally while troubleshooting."
      action={
        <div className="flex flex-wrap gap-2">
          <Select
            value={selectedPresetId}
            onValueChange={(value) => {
              if (!value) {
                return;
              }
              setSelectedPresetId(value);
              const preset = presets.find((candidate) => candidate.id === value);
              if (preset) {
                setBackfillLines(String(preset.defaultBackfillLines ?? 200));
              }
            }}
            disabled={!presets.length || presetsQuery.isPending}
          >
            <SelectTrigger className="min-w-48">
              <SelectValue placeholder="Select log preset" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-32"
            inputMode="numeric"
            value={backfillLines}
            onChange={(event) => setBackfillLines(event.target.value)}
            placeholder="Lines"
          />
          <Button
            className="action-btn"
            onClick={handlePreview}
            disabled={!selectedPreset || previewLogs.isPending}
          >
            <RefreshCcw
              className={previewLogs.isPending ? "size-4 animate-spin" : "size-4"}
            />
            Refresh
          </Button>
        </div>
      }
    >
      {presetsQuery.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : presetsQuery.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load log presets"
          description={
            presetsQuery.error instanceof Error
              ? presetsQuery.error.message
              : "The log source catalog could not be loaded."
          }
        />
      ) : !selectedPreset ? (
        <EmptyState
          icon={AlertTriangle}
          title="No log presets available"
          description="This workspace does not currently expose any built-in log presets for the selected node."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{selectedPreset.label}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedPreset.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {selectedPreset.kind === "journal" ? "Journal" : "File"}
                </Badge>
                <Badge variant="secondary">{selectedPreset.identifier}</Badge>
                {selectedPreset.requiresRoot ? (
                  <Badge variant="outline">Operational root</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[18rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
                placeholder="Filter loaded lines"
              />
            </div>
            {preview ? (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{preview.taskStatus}</Badge>
                {preview.truncated ? <Badge variant="secondary">Truncated</Badge> : null}
                <Badge variant="secondary">{preview.entries.length} lines</Badge>
              </div>
            ) : null}
          </div>

          {preview?.error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {preview.error}
            </div>
          ) : null}

          {preview?.warnings?.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              {preview.warnings.join(" ")}
            </div>
          ) : null}

          {previewLogs.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : !preview ? (
            <EmptyState
              icon={Search}
              title="Load a preview"
              description="Select a preset and refresh to fetch the latest log lines from the node."
            />
          ) : filteredEntries.length ? (
            <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {filteredEntries.map((entry, index) => (
                <div
                  key={`${entry.timestamp ?? "no-ts"}-${index}-${entry.message}`}
                  className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {entry.timestamp ? (
                      <TimeDisplay value={entry.timestamp} />
                    ) : (
                      <span>No timestamp</span>
                    )}
                    {entry.unit ? <Badge variant="outline">{entry.unit}</Badge> : null}
                    {entry.identifier ? (
                      <Badge variant="secondary">{entry.identifier}</Badge>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="No lines match the current filter"
              description="Clear the filter or refresh the preview with a different preset."
            />
          )}
        </div>
      )}
    </SectionPanel>
  );
};
