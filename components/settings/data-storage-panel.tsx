"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Database, HardDrive, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/ui/section-panel";
import { Switch } from "@/components/ui/switch";
import {
  useDataUsage,
  useMetricsRetention,
  useRunMetricsRetentionCleanup,
  useUpdateMetricsRetention,
} from "@/lib/hooks/use-noderax-data";

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const scaled = value / Math.pow(1024, index);
  return `${scaled.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatCount = (value: number) => value.toLocaleString();

const chartConfig = {
  totalBytes: {
    label: "Boyut",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

const MIN_RETENTION_DAYS = 1;
const MAX_RETENTION_DAYS = 3650;

export const DataStoragePanel = ({ enabled = true }: { enabled?: boolean }) => {
  const dataUsageQuery = useDataUsage(enabled);
  const retentionQuery = useMetricsRetention(enabled);
  const updateRetention = useUpdateMetricsRetention();
  const runCleanup = useRunMetricsRetentionCleanup();

  const [retentionEnabled, setRetentionEnabled] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [syncedFrom, setSyncedFrom] =
    useState<typeof retentionQuery.data>(undefined);

  // Sync the editable draft from the server value during render (not in an
  // effect) whenever a new snapshot arrives.
  if (retentionQuery.data && retentionQuery.data !== syncedFrom) {
    setSyncedFrom(retentionQuery.data);
    setRetentionEnabled(retentionQuery.data.enabled);
    setRetentionDays(retentionQuery.data.retentionDays);
  }

  const editable = retentionQuery.data?.editable ?? false;
  const busy = updateRetention.isPending || runCleanup.isPending;

  const usage = dataUsageQuery.data;
  const metricsTable = usage?.tables.find((table) => table.table === "metrics");

  const topTables = useMemo(
    () => (usage ? usage.tables.slice(0, 12) : []),
    [usage],
  );

  const isDirty =
    retentionQuery.data != null &&
    (retentionEnabled !== retentionQuery.data.enabled ||
      retentionDays !== retentionQuery.data.retentionDays);

  const summaryCards = [
    {
      title: "Toplam veritabanı boyutu",
      value: usage ? formatBytes(usage.totalDatabaseBytes) : "—",
      icon: Database,
    },
    {
      title: "Metrics boyutu",
      value: metricsTable ? formatBytes(metricsTable.totalBytes) : "—",
      icon: HardDrive,
    },
    {
      title: "Metrics satır (tahmini)",
      value: metricsTable ? formatCount(metricsTable.estimatedRows) : "—",
      icon: HardDrive,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title} className="surface-panel border">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {card.title}
                </p>
                <p className="truncate text-2xl font-semibold tracking-tight">
                  {card.value}
                </p>
              </div>
              <div className="rounded-xl border p-3 tone-brand">
                <card.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionPanel
        eyebrow="Depolama"
        title="Tablo boyutları"
        description="Her tablonun diskte kapladığı alan (tablo + indeks) ve tahmini satır sayısı. Satır sayıları PostgreSQL planlayıcı istatistiklerinden gelen tahminlerdir."
        contentClassName="space-y-5"
      >
        {dataUsageQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        ) : dataUsageQuery.isError ? (
          <p className="text-sm text-destructive">
            Depolama bilgisi alınamadı.
          </p>
        ) : topTables.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tablo bulunamadı.</p>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="h-80 w-full"
            >
              <BarChart
                accessibilityLayer
                data={topTables}
                layout="vertical"
                margin={{ left: 12, right: 24 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="table"
                  type="category"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatBytes(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatBytes(Number(value))}
                    />
                  }
                />
                <Bar
                  dataKey="totalBytes"
                  fill="var(--color-totalBytes)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Tablo</th>
                    <th className="py-2 pr-4 text-right font-medium">
                      Tahmini satır
                    </th>
                    <th className="py-2 text-right font-medium">Boyut</th>
                  </tr>
                </thead>
                <tbody>
                  {usage?.tables.map((table) => (
                    <tr key={table.table} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {table.table}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatCount(table.estimatedRows)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatBytes(table.totalBytes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionPanel>

      <SectionPanel
        eyebrow="Retention"
        title="Metrik saklama"
        description="Belirtilen günden eski metrik kayıtlarını otomatik olarak siler. Değişiklikler yeniden başlatma gerektirmeden anında uygulanır."
        contentClassName="space-y-5"
      >
        {!editable ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
            Bu kurulum installer tarafından yönetilmediği için retention ayarı
            salt-okunur. Değerler <code>METRICS_RETENTION_ENABLED</code> ve{" "}
            <code>METRICS_RETENTION_DAYS</code> ortam değişkenlerinden okunur.
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="metrics-retention-enabled">
              Otomatik temizlik
            </Label>
            <p className="text-sm text-muted-foreground">
              Zamanlanmış iş eski kayıtları arka planda siler.
            </p>
          </div>
          <Switch
            id="metrics-retention-enabled"
            checked={retentionEnabled}
            disabled={!editable || busy}
            onCheckedChange={setRetentionEnabled}
          />
        </div>

        <div className="max-w-xs space-y-2">
          <Label htmlFor="metrics-retention-days">Saklama süresi (gün)</Label>
          <Input
            id="metrics-retention-days"
            type="number"
            min={MIN_RETENTION_DAYS}
            max={MAX_RETENTION_DAYS}
            value={String(retentionDays)}
            disabled={!editable || busy}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(parsed)) {
                setRetentionDays(
                  Math.min(
                    Math.max(parsed, MIN_RETENTION_DAYS),
                    MAX_RETENTION_DAYS,
                  ),
                );
              }
            }}
          />
        </div>

        {retentionQuery.data?.lastRunAt ? (
          <p className="text-sm text-muted-foreground">
            Son çalışma:{" "}
            {new Date(retentionQuery.data.lastRunAt).toLocaleString()} —{" "}
            {formatCount(retentionQuery.data.lastDeletedCount ?? 0)} kayıt
            silindi.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Henüz temizlik çalıştırılmadı.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={!editable || busy || !isDirty}
            onClick={() =>
              updateRetention.mutate({
                enabled: retentionEnabled,
                retentionDays,
              })
            }
          >
            Kaydet
          </Button>
          <Button
            variant="outline"
            disabled={!editable || busy}
            onClick={() => runCleanup.mutate()}
          >
            <Trash2 className="mr-2 size-4" />
            Şimdi temizle
          </Button>
          {runCleanup.isPending ? (
            <Badge variant="secondary">Temizleniyor…</Badge>
          ) : null}
        </div>
      </SectionPanel>
    </div>
  );
};
