"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  RefreshCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { SeverityBadge } from "@/components/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionPanel } from "@/components/ui/section-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TimeDisplay } from "@/components/ui/time-display";
import {
  useAcknowledgeIncident,
  useAnalyzeIncident,
  useCreateNodeLogMonitorRule,
  useDeleteNodeLogMonitorRule,
  useNodeLogMonitorRules,
  useNodeLogPresets,
  usePreviewNodeLogs,
  useResolveIncident,
  useUpdateNodeLogMonitorRule,
  useWorkspaceIncidents,
} from "@/lib/hooks/use-noderax-data";
import type {
  CreateLogMonitorRulePayload,
  EventSeverity,
  IncidentStatus,
  LogMonitorRuleDto,
} from "@/lib/types";

const EXAMPLE_RULES: Array<{
  key: string;
  label: string;
  sourcePresetId: string;
  dsl: Record<string, unknown>;
}> = [
  {
    key: "ssh-auth-failure",
    label: "SSH auth failure",
    sourcePresetId: "auth.log",
    dsl: {
      conditions: {
        any: [
          { field: "message", op: "contains", value: "Failed password" },
          { field: "message", op: "contains", value: "authentication failure" },
        ],
      },
      threshold: { matchCountGte: 3 },
      incident: {
        severity: "warning",
        titleTemplate: "Repeated SSH authentication failures",
        fingerprintTemplate: "auth-failure:{{sourcePresetId}}",
        captureLines: 20,
      },
    },
  },
  {
    key: "kernel-oom",
    label: "Kernel OOM",
    sourcePresetId: "kern.log",
    dsl: {
      conditions: {
        any: [
          { field: "message", op: "contains", value: "Out of memory" },
          { field: "message", op: "contains", value: "Killed process" },
        ],
      },
      threshold: { matchCountGte: 1 },
      incident: {
        severity: "critical",
        titleTemplate: "Kernel OOM or process kill detected",
        fingerprintTemplate: "kernel-oom:{{sourcePresetId}}",
        captureLines: 25,
      },
    },
  },
  {
    key: "agent-errors",
    label: "Agent errors",
    sourcePresetId: "noderax-agent",
    dsl: {
      conditions: {
        any: [
          { field: "message", op: "contains", value: "error" },
          { field: "message", op: "contains", value: "panic" },
        ],
      },
      threshold: { matchCountGte: 1 },
      incident: {
        severity: "warning",
        titleTemplate: "Noderax agent errors detected",
        fingerprintTemplate: "agent-errors:{{sourcePresetId}}",
        captureLines: 20,
      },
    },
  },
];

const stringifyDsl = (dsl: Record<string, unknown>) =>
  JSON.stringify(dsl, null, 2);

const buildSeedDsl = (
  filterText: string,
  severity: EventSeverity = "warning",
) => ({
  conditions: {
    all: [{ field: "message", op: "contains", value: filterText }],
  },
  threshold: { matchCountGte: 1 },
  incident: {
    severity,
    titleTemplate: `Matched "${filterText}" in {{sourcePresetId}}`,
    fingerprintTemplate: `match:${filterText}:{{sourcePresetId}}`,
    captureLines: 20,
  },
});

const formatIncidentStatus = (status: IncidentStatus) => {
  switch (status) {
    case "acknowledged":
      return "Acknowledged";
    case "resolved":
      return "Resolved";
    default:
      return "Open";
  }
};

const statusVariant = (status: IncidentStatus) =>
  status === "resolved" ? "secondary" : "outline";

type RuleFormState = {
  ruleId: string | null;
  name: string;
  sourcePresetId: string;
  intervalMinutes: number;
  enabled: boolean;
  dslText: string;
};

const buildRuleForm = (
  input?: Partial<RuleFormState> & {
    name?: string;
    sourcePresetId?: string;
    enabled?: boolean;
    dslText?: string;
    intervalMinutes?: number;
  },
): RuleFormState => ({
  ruleId: input?.ruleId ?? null,
  name: input?.name ?? "",
  sourcePresetId: input?.sourcePresetId ?? "auth.log",
  intervalMinutes: input?.intervalMinutes ?? 1,
  enabled: input?.enabled ?? true,
  dslText:
    input?.dslText ?? stringifyDsl(EXAMPLE_RULES[0].dsl as Record<string, unknown>),
});

export const NodeLogsPanel = ({ nodeId }: { nodeId: string }) => {
  const presetsQuery = useNodeLogPresets(nodeId);
  const rulesQuery = useNodeLogMonitorRules(nodeId);
  const previewLogs = usePreviewNodeLogs(nodeId);
  const createRule = useCreateNodeLogMonitorRule(nodeId);
  const updateRule = useUpdateNodeLogMonitorRule(nodeId);
  const deleteRule = useDeleteNodeLogMonitorRule(nodeId);
  const acknowledgeIncident = useAcknowledgeIncident();
  const resolveIncident = useResolveIncident();
  const analyzeIncident = useAnalyzeIncident();

  const [activeTab, setActiveTab] = useState<"explorer" | "rules" | "incidents">(
    "explorer",
  );
  const [selectedPresetId, setSelectedPresetId] = useState("auth.log");
  const [backfillLines, setBackfillLines] = useState("200");
  const [previewFilter, setPreviewFilter] = useState("");
  const [ruleForm, setRuleForm] = useState<RuleFormState>(() => buildRuleForm());
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus | "all">(
    "all",
  );
  const [incidentSeverity, setIncidentSeverity] = useState<EventSeverity | "all">(
    "all",
  );
  const [incidentPresetFilter, setIncidentPresetFilter] = useState("all");
  const [incidentRuleFilter, setIncidentRuleFilter] = useState("all");

  const incidentsQuery = useWorkspaceIncidents({
    nodeId,
    status: incidentStatus,
    severity: incidentSeverity,
    sourcePresetId:
      incidentPresetFilter === "all" ? undefined : incidentPresetFilter,
    ruleId: incidentRuleFilter === "all" ? undefined : incidentRuleFilter,
    limit: 50,
  });

  const presets = presetsQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const incidents = incidentsQuery.data ?? [];
  const preview = previewLogs.data;
  const filteredPreviewEntries = useMemo(() => {
    const entries = preview?.entries ?? [];
    const needle = previewFilter.trim().toLowerCase();
    if (!needle) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.message, entry.unit ?? "", entry.identifier ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [preview?.entries, previewFilter]);

  const applyRuleDraft = (next: Partial<RuleFormState>) =>
    setRuleForm((current) => ({
      ...current,
      ...next,
    }));

  const resetRuleForm = () => setRuleForm(buildRuleForm());

  const loadRuleIntoForm = (rule: LogMonitorRuleDto) => {
    setRuleForm(
      buildRuleForm({
        ruleId: rule.id,
        name: rule.name,
        sourcePresetId: rule.sourcePresetId,
        intervalMinutes: rule.intervalMinutes,
        enabled: rule.enabled,
        dslText: stringifyDsl(rule.dsl),
      }),
    );
    setActiveTab("rules");
  };

  const applyExampleRule = (key: string) => {
    const example = EXAMPLE_RULES.find((candidate) => candidate.key === key);
    if (!example) {
      return;
    }

    setRuleForm(
      buildRuleForm({
        ruleId: null,
        name: example.label,
        sourcePresetId: example.sourcePresetId,
        intervalMinutes: 1,
        enabled: true,
        dslText: stringifyDsl(example.dsl as Record<string, unknown>),
      }),
    );
    setActiveTab("rules");
  };

  const seedRuleFromPreview = () => {
    const filterText =
      previewFilter.trim() ||
      filteredPreviewEntries[0]?.message?.slice(0, 80)?.trim() ||
      "";

    if (!filterText) {
      toast.error("Create rule from preview requires a filtered match");
      return;
    }

    setRuleForm(
      buildRuleForm({
        ruleId: null,
        name: `Match ${filterText.slice(0, 32)}`,
        sourcePresetId: selectedPresetId,
        intervalMinutes: 1,
        enabled: true,
        dslText: stringifyDsl(buildSeedDsl(filterText)),
      }),
    );
    setActiveTab("rules");
  };

  const handleSubmitRule = async () => {
    let parsedDsl: Record<string, unknown>;
    try {
      parsedDsl = JSON.parse(ruleForm.dslText) as Record<string, unknown>;
    } catch (error) {
      toast.error("DSL JSON is invalid", {
        description: error instanceof Error ? error.message : "Invalid JSON",
      });
      return;
    }

    const payload: CreateLogMonitorRulePayload = {
      name: ruleForm.name.trim(),
      sourcePresetId: ruleForm.sourcePresetId,
      cadence: ruleForm.intervalMinutes > 1 ? "custom" : "minutely",
      intervalMinutes: Number(ruleForm.intervalMinutes) || 1,
      enabled: ruleForm.enabled,
      dsl: parsedDsl,
    };

    if (!payload.name) {
      toast.error("Rule name is required");
      return;
    }

    if (ruleForm.ruleId) {
      await updateRule.mutateAsync({
        ruleId: ruleForm.ruleId,
        payload,
      });
      return;
    }

    await createRule.mutateAsync(payload);
    resetRuleForm();
  };

  return (
    <SectionPanel
      eyebrow="Logs"
      title="Log explorer and incident queue"
      description="Preview Linux log presets, persist rules, and inspect the resulting incident queue."
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "explorer" | "rules" | "incidents")
        }
        className="space-y-4"
      >
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
            <Select
              value={selectedPresetId}
              onValueChange={(value) => setSelectedPresetId(value ?? "auth.log")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Preset" />
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
              type="number"
              min={1}
              max={500}
              value={backfillLines}
              onChange={(event) => setBackfillLines(event.target.value)}
              className="lg:w-28"
            />
            <Input
              value={previewFilter}
              onChange={(event) => setPreviewFilter(event.target.value)}
              placeholder="Client-side filter"
            />
            <ShimmerButton
              className="action-btn"
              onClick={() =>
                previewLogs.mutate({
                  sourcePresetId: selectedPresetId,
                  backfillLines: Number(backfillLines) || 200,
                })
              }
              disabled={previewLogs.isPending}
            >
              <RefreshCcw
                className={previewLogs.isPending ? "size-4 animate-spin" : "size-4"}
              />
              Preview
            </ShimmerButton>
          </div>

          {previewLogs.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {filteredPreviewEntries.length} / {preview.entries.length} lines
                </Badge>
                <Badge variant="outline">Task {preview.taskStatus}</Badge>
                {preview.truncated ? (
                  <Badge variant="secondary">Truncated</Badge>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={seedRuleFromPreview}
                  disabled={filteredPreviewEntries.length === 0}
                >
                  <Sparkles className="mr-2 size-4" />
                  Create rule from preview
                </Button>
              </div>

              {preview.error ? (
                <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm">
                  {preview.error}
                </div>
              ) : null}

              {preview.warnings.length > 0 ? (
                <div className="rounded-xl border border-[#f2a71b]/25 bg-[#f2a71b]/10 px-4 py-3 text-sm">
                  {preview.warnings.join(" ")}
                </div>
              ) : null}

              {filteredPreviewEntries.length ? (
                <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-2xl border p-3">
                  {filteredPreviewEntries.map((entry, index) => (
                    <div key={`${entry.timestamp ?? "na"}-${index}`} className="rounded-xl border p-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Search className="size-3.5" />
                        {entry.timestamp ? (
                          <TimeDisplay value={entry.timestamp} mode="datetime" />
                        ) : (
                          <span>No timestamp</span>
                        )}
                        {entry.unit ? <span>{entry.unit}</span> : null}
                        {entry.identifier ? <span>{entry.identifier}</span> : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                        {entry.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No preview matches"
                  description="Adjust the preset or client-side filter and try again."
                  icon={Search}
                />
              )}
            </div>
          ) : (
            <EmptyState
              title="Preview a log preset"
              description="Start with syslog, auth.log, kern.log, or the noderax-agent journal."
              icon={Search}
            />
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_RULES.map((example) => (
              <Button
                key={example.key}
                type="button"
                variant="outline"
                onClick={() => applyExampleRule(example.key)}
              >
                {example.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-3">
              {rulesQuery.isPending ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-xl" />
                ))
              ) : rules.length ? (
                rules.map((rule) => (
                  <div key={rule.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {rule.sourcePresetId} · every {rule.intervalMinutes} min
                        </p>
                      </div>
                      <Badge variant={rule.enabled ? "outline" : "secondary"}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadRuleIntoForm(rule)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRule.mutate(rule.id)}
                        disabled={deleteRule.isPending}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </Button>
                    </div>
                    {rule.lastError ? (
                      <p className="mt-3 text-xs text-destructive">{rule.lastError}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No log monitor rules"
                  description="Create the first rule from an example or from preview output."
                  icon={ShieldAlert}
                />
              )}
            </div>

            <div className="space-y-4 rounded-2xl border p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={ruleForm.name}
                  onChange={(event) => applyRuleDraft({ name: event.target.value })}
                  placeholder="Rule name"
                />
                <Select
                  value={ruleForm.sourcePresetId}
                  onValueChange={(value) =>
                    applyRuleDraft({
                      sourcePresetId: value ?? ruleForm.sourcePresetId,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Preset" />
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
                  type="number"
                  min={1}
                  max={60}
                  value={String(ruleForm.intervalMinutes)}
                  onChange={(event) =>
                    applyRuleDraft({
                      intervalMinutes: Number(event.target.value) || 1,
                    })
                  }
                />
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-sm">Enabled</span>
                  <Switch
                    checked={ruleForm.enabled}
                    onCheckedChange={(checked) =>
                      applyRuleDraft({ enabled: checked })
                    }
                  />
                </div>
              </div>

              <Textarea
                value={ruleForm.dslText}
                onChange={(event) => applyRuleDraft({ dslText: event.target.value })}
                className="min-h-[22rem] font-mono text-xs"
              />

              <div className="flex flex-wrap gap-2">
                <ShimmerButton
                  className="action-btn"
                  onClick={() => void handleSubmitRule()}
                  disabled={createRule.isPending || updateRule.isPending}
                >
                  {ruleForm.ruleId ? "Update rule" : "Create rule"}
                </ShimmerButton>
                <Button type="button" variant="outline" onClick={resetRuleForm}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Select
              value={incidentStatus}
              onValueChange={(value) =>
                setIncidentStatus(value as IncidentStatus | "all")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={incidentSeverity}
              onValueChange={(value) =>
                setIncidentSeverity(value as EventSeverity | "all")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={incidentPresetFilter}
              onValueChange={(value) => setIncidentPresetFilter(value ?? "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All presets</SelectItem>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={incidentRuleFilter}
              onValueChange={(value) => setIncidentRuleFilter(value ?? "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rules</SelectItem>
                {rules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {incidentsQuery.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : incidents.length ? (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={incident.severity} />
                        <Badge variant={statusVariant(incident.status)}>
                          {formatIncidentStatus(incident.status)}
                        </Badge>
                        <Badge variant="outline">{incident.sourcePresetId}</Badge>
                      </div>
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {incident.hitCount} matches · last seen{" "}
                          <TimeDisplay value={incident.lastSeenAt} mode="relative" />
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {incident.status !== "acknowledged" &&
                      incident.status !== "resolved" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeIncident.mutate(incident.id)}
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                      {incident.status !== "resolved" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => resolveIncident.mutate(incident.id)}
                        >
                          Resolve
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          analyzeIncident.mutate({
                            incidentId: incident.id,
                            payload: { model: "gpt-5.4-mini" },
                          })
                        }
                      >
                        Analyze
                      </Button>
                    </div>
                  </div>

                  {incident.latestSample?.entries?.length ? (
                    <div className="mt-3 rounded-xl border bg-muted/35 p-3">
                      {incident.latestSample.entries.slice(0, 3).map((entry, index) => (
                        <p
                          key={`${incident.id}-sample-${index}`}
                          className="whitespace-pre-wrap text-sm leading-6"
                        >
                          {entry.message}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {incident.latestAnalysis ? (
                    <div className="mt-3 rounded-xl border border-[#2b8cff]/20 bg-[#2b8cff]/8 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Sparkles className="size-4" />
                        {incident.latestAnalysis.model}
                        {incident.latestAnalysis.estimatedCostUsd ? (
                          <span className="text-muted-foreground">
                            (${incident.latestAnalysis.estimatedCostUsd})
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6">
                        {incident.latestAnalysis.summary}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No incidents for this node"
              description="Incidents appear here when a persisted log monitor rule matches new log lines."
              icon={AlertTriangle}
            />
          )}
        </TabsContent>
      </Tabs>
    </SectionPanel>
  );
};
