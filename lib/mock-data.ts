import type {
  AuthSession,
  DashboardOverview,
  EventRecord,
  MetricPoint,
  NodeDetail,
  NodeSummary,
  TaskDetail,
  TaskLogLine,
  TaskSummary,
} from "@/lib/types";

const now = Date.now();

const hoursAgo = (hours: number) =>
  new Date(now - hours * 60 * 60 * 1000).toISOString();

const minutesAgo = (minutes: number) =>
  new Date(now - minutes * 60 * 1000).toISOString();

const metricSeries = (seed: number): MetricPoint[] =>
  Array.from({ length: 24 }, (_, index) => {
    const slice = 23 - index;
    const wave = Math.sin((slice + seed) / 2.7);
    const drift = Math.cos((slice + seed) / 4.5);

    return {
      timestamp: hoursAgo(slice),
      cpu: Math.round(Math.max(8, Math.min(94, 38 + wave * 19 + seed * 2))),
      memory: Math.round(
        Math.max(24, Math.min(88, 52 + drift * 11 + seed * 1.5)),
      ),
      disk: Math.round(Math.max(34, Math.min(91, 61 + wave * 6 + seed))),
    };
  });

const nodes: NodeSummary[] = [
  {
    id: "node_ams_01",
    name: "edge-ams-01",
    status: "online",
    lastHeartbeat: minutesAgo(1),
    os: "Ubuntu 24.04",
    arch: "x64",
    region: "Amsterdam",
    version: "1.18.4",
    uptimeHours: 792,
    agentCount: 24,
    avgCpuLoad: 44,
  },
  {
    id: "node_iad_02",
    name: "core-iad-02",
    status: "online",
    lastHeartbeat: minutesAgo(2),
    os: "Debian 12",
    arch: "arm64",
    region: "Virginia",
    version: "1.18.4",
    uptimeHours: 1164,
    agentCount: 17,
    avgCpuLoad: 51,
  },
  {
    id: "node_ist_01",
    name: "compute-ist-01",
    status: "online",
    lastHeartbeat: minutesAgo(1),
    os: "Ubuntu 24.04",
    arch: "x64",
    region: "Istanbul",
    version: "1.18.3",
    uptimeHours: 552,
    agentCount: 31,
    avgCpuLoad: 62,
  },
  {
    id: "node_sfo_03",
    name: "batch-sfo-03",
    status: "offline",
    lastHeartbeat: minutesAgo(26),
    os: "Debian 12",
    arch: "x64",
    region: "San Francisco",
    version: "1.17.9",
    uptimeHours: 228,
    agentCount: 12,
    avgCpuLoad: 12,
  },
  {
    id: "node_fra_04",
    name: "edge-fra-04",
    status: "online",
    lastHeartbeat: minutesAgo(3),
    os: "Ubuntu 24.04",
    arch: "arm64",
    region: "Frankfurt",
    version: "1.18.4",
    uptimeHours: 980,
    agentCount: 19,
    avgCpuLoad: 47,
  },
  {
    id: "node_syd_01",
    name: "queue-syd-01",
    status: "offline",
    lastHeartbeat: minutesAgo(42),
    os: "Ubuntu 22.04",
    arch: "x64",
    region: "Sydney",
    version: "1.17.8",
    uptimeHours: 401,
    agentCount: 9,
    avgCpuLoad: 7,
  },
];

const tasks: TaskSummary[] = [
  {
    id: "task_rollout_412",
    name: "Deploy queue workers",
    status: "running",
    nodeId: "node_ist_01",
    nodeName: "compute-ist-01",
    command: "noderax deploy workers --region eu-central",
    createdAt: minutesAgo(15),
    startedAt: minutesAgo(12),
    progress: 72,
  },
  {
    id: "task_index_188",
    name: "Rebuild vector index",
    status: "pending",
    nodeId: "node_fra_04",
    nodeName: "edge-fra-04",
    command: "noderax task enqueue rebuild-index",
    createdAt: minutesAgo(9),
    progress: 0,
  },
  {
    id: "task_backup_054",
    name: "Snapshot encrypted volumes",
    status: "success",
    nodeId: "node_iad_02",
    nodeName: "core-iad-02",
    command: "noderax backup create --scope persistent",
    createdAt: hoursAgo(4),
    startedAt: hoursAgo(4),
    completedAt: hoursAgo(3.5),
    durationSeconds: 1811,
    exitCode: 0,
    progress: 100,
  },
  {
    id: "task_patch_771",
    name: "Patch node runtime",
    status: "failed",
    nodeId: "node_sfo_03",
    nodeName: "batch-sfo-03",
    command: "noderax agent upgrade --channel stable",
    createdAt: hoursAgo(2),
    startedAt: hoursAgo(1.9),
    completedAt: hoursAgo(1.8),
    durationSeconds: 362,
    exitCode: 1,
    progress: 100,
  },
  {
    id: "task_warmup_209",
    name: "Prewarm inference cache",
    status: "running",
    nodeId: "node_ams_01",
    nodeName: "edge-ams-01",
    command: "noderax warmup --profile low-latency",
    createdAt: minutesAgo(31),
    startedAt: minutesAgo(29),
    progress: 48,
  },
  {
    id: "task_audit_900",
    name: "Generate compliance audit",
    status: "success",
    nodeId: "node_iad_02",
    nodeName: "core-iad-02",
    command: "noderax audit export --format pdf",
    createdAt: hoursAgo(8),
    startedAt: hoursAgo(8),
    completedAt: hoursAgo(7.7),
    durationSeconds: 877,
    exitCode: 0,
    progress: 100,
  },
];

const events: EventRecord[] = [
  {
    id: "evt_9001",
    type: "event.created",
    severity: "critical",
    title: "Runtime patch failed",
    message:
      "Agent upgrade on batch-sfo-03 exited with code 1 after a dependency resolution fault.",
    createdAt: minutesAgo(18),
    source: "scheduler",
    entityType: "task",
    entityId: "task_patch_771",
  },
  {
    id: "evt_9002",
    type: "node.offline",
    severity: "warning",
    title: "Node heartbeat missed",
    message:
      "queue-syd-01 has not reported a heartbeat for more than 40 minutes.",
    createdAt: minutesAgo(41),
    source: "health-monitor",
    entityType: "node",
    entityId: "node_syd_01",
  },
  {
    id: "evt_9003",
    type: "task.updated",
    severity: "info",
    title: "Deployment rollout progressing",
    message: "Deploy queue workers reached 72% and all health probes are green.",
    createdAt: minutesAgo(7),
    source: "orchestrator",
    entityType: "task",
    entityId: "task_rollout_412",
  },
  {
    id: "evt_9004",
    type: "node.online",
    severity: "info",
    title: "Node recovered",
    message: "edge-fra-04 reported back online after a brief network flap.",
    createdAt: hoursAgo(1),
    source: "health-monitor",
    entityType: "node",
    entityId: "node_fra_04",
  },
  {
    id: "evt_9005",
    type: "task.updated",
    severity: "warning",
    title: "Queue depth rising",
    message:
      "Pending task count increased by 14% in the eu-central task queue.",
    createdAt: minutesAgo(23),
    source: "scheduler",
    entityType: "system",
  },
  {
    id: "evt_9006",
    type: "event.created",
    severity: "info",
    title: "Volumes snapshotted",
    message: "Persistent storage snapshot backup completed successfully.",
    createdAt: hoursAgo(3.5),
    source: "backup-service",
    entityType: "task",
    entityId: "task_backup_054",
  },
  {
    id: "evt_9007",
    type: "event.created",
    severity: "warning",
    title: "CPU pressure detected",
    message: "compute-ist-01 crossed 80% CPU utilization for 6 consecutive minutes.",
    createdAt: minutesAgo(34),
    source: "metrics-engine",
    entityType: "node",
    entityId: "node_ist_01",
  },
  {
    id: "evt_9008",
    type: "event.created",
    severity: "info",
    title: "Compliance export delivered",
    message: "Audit archive was uploaded to the designated compliance bucket.",
    createdAt: hoursAgo(7.6),
    source: "audit-worker",
    entityType: "task",
    entityId: "task_audit_900",
  },
];

const logLine = (
  id: string,
  offsetMinutes: number,
  stream: TaskLogLine["stream"],
  message: string,
): TaskLogLine => ({
  id,
  timestamp: minutesAgo(offsetMinutes),
  stream,
  message,
});

const taskDetails: Record<string, TaskDetail> = {
  task_rollout_412: {
    ...tasks[0],
    operator: "Sena Kaya",
    image: "registry.noderax.io/workers:2026.03.18",
    retries: 0,
    workingDirectory: "/srv/noderax/releases/current",
    events: events.filter((event) => event.entityId === "task_rollout_412"),
    logs: [
      logLine("rollout_1", 12, "system", "Connecting to deployment coordinator."),
      logLine("rollout_2", 12, "stdout", "Fetched release manifest version 2026.03.18."),
      logLine("rollout_3", 11, "stdout", "Draining worker pool for compute-ist-01."),
      logLine("rollout_4", 10, "stdout", "Provisioning 8 replacement agents."),
      logLine("rollout_5", 8, "stdout", "Health checks: 8/8 passing."),
      logLine("rollout_6", 7, "system", "Waiting for traffic rebalance window."),
    ],
  },
  task_index_188: {
    ...tasks[1],
    operator: "Emir Yilmaz",
    image: "registry.noderax.io/indexer:3.9.1",
    retries: 0,
    workingDirectory: "/srv/jobs",
    events: [],
    logs: [logLine("index_1", 9, "system", "Task queued and waiting for capacity.")],
  },
  task_backup_054: {
    ...tasks[2],
    operator: "Aylin Demir",
    image: "registry.noderax.io/backup:2.4.0",
    retries: 1,
    workingDirectory: "/srv/backups",
    events: events.filter((event) => event.entityId === "task_backup_054"),
    logs: [
      logLine("backup_1", 240, "stdout", "Enumerated 42 persistent volumes."),
      logLine("backup_2", 239, "stdout", "Creating incremental snapshots."),
      logLine("backup_3", 237, "stdout", "Snapshot upload complete."),
      logLine("backup_4", 236, "system", "Verification checksum passed."),
    ],
  },
  task_patch_771: {
    ...tasks[3],
    operator: "Mert Cakir",
    image: "registry.noderax.io/runtime-upgrader:1.17.9",
    retries: 2,
    workingDirectory: "/var/lib/noderax",
    events: events.filter((event) => event.entityId === "task_patch_771"),
    logs: [
      logLine("patch_1", 112, "stdout", "Resolving runtime dependencies."),
      logLine("patch_2", 111, "stdout", "Applying patch set 1.18.0."),
      logLine("patch_3", 110, "stderr", "Failed to verify libc compatibility on host."),
      logLine("patch_4", 109, "system", "Rolling back runtime to last known good state."),
    ],
  },
  task_warmup_209: {
    ...tasks[4],
    operator: "Bora Deniz",
    image: "registry.noderax.io/warmup:7.2.1",
    retries: 0,
    workingDirectory: "/srv/cache",
    events: [],
    logs: [
      logLine("warmup_1", 28, "stdout", "Hydrating shard cache from snapshot."),
      logLine("warmup_2", 26, "stdout", "Priming top 1,500 embeddings."),
      logLine("warmup_3", 24, "stdout", "Cache hit ratio climbed to 82%."),
    ],
  },
  task_audit_900: {
    ...tasks[5],
    operator: "Lina Ozkan",
    image: "registry.noderax.io/audit:5.1.0",
    retries: 0,
    workingDirectory: "/srv/compliance",
    events: events.filter((event) => event.entityId === "task_audit_900"),
    logs: [
      logLine("audit_1", 460, "stdout", "Loading policy definitions."),
      logLine("audit_2", 459, "stdout", "Computing regional exposure report."),
      logLine("audit_3", 457, "stdout", "Generated signed PDF bundle."),
    ],
  },
};

const nodeDetails: Record<string, NodeDetail> = {
  node_ams_01: {
    ...nodes[0],
    hostname: "edge-ams-01.noderax.internal",
    kernel: "Linux 6.8.0",
    ipAddress: "10.18.4.15",
    tags: ["edge", "latency", "eu-west"],
    metrics: metricSeries(2),
    runningTasks: tasks.filter((task) => task.nodeId === "node_ams_01"),
    events: events.filter((event) => event.entityId === "node_ams_01"),
  },
  node_iad_02: {
    ...nodes[1],
    hostname: "core-iad-02.noderax.internal",
    kernel: "Linux 6.8.0",
    ipAddress: "10.32.8.41",
    tags: ["control-plane", "arm64", "backup"],
    metrics: metricSeries(4),
    runningTasks: tasks.filter((task) => task.nodeId === "node_iad_02"),
    events: events.filter((event) => event.entityId === "node_iad_02"),
  },
  node_ist_01: {
    ...nodes[2],
    hostname: "compute-ist-01.noderax.internal",
    kernel: "Linux 6.8.0",
    ipAddress: "10.44.1.28",
    tags: ["gpu", "burst", "eu-central"],
    metrics: metricSeries(7),
    runningTasks: tasks.filter((task) => task.nodeId === "node_ist_01"),
    events: events.filter((event) => event.entityId === "node_ist_01"),
  },
  node_sfo_03: {
    ...nodes[3],
    hostname: "batch-sfo-03.noderax.internal",
    kernel: "Linux 6.6.12",
    ipAddress: "10.56.0.19",
    tags: ["batch", "west-coast"],
    metrics: metricSeries(1),
    runningTasks: tasks.filter((task) => task.nodeId === "node_sfo_03"),
    events: events.filter((event) => event.entityId === "node_sfo_03"),
  },
  node_fra_04: {
    ...nodes[4],
    hostname: "edge-fra-04.noderax.internal",
    kernel: "Linux 6.8.0",
    ipAddress: "10.62.5.22",
    tags: ["edge", "arm64", "eu-central"],
    metrics: metricSeries(5),
    runningTasks: tasks.filter((task) => task.nodeId === "node_fra_04"),
    events: events.filter((event) => event.entityId === "node_fra_04"),
  },
  node_syd_01: {
    ...nodes[5],
    hostname: "queue-syd-01.noderax.internal",
    kernel: "Linux 6.6.12",
    ipAddress: "10.71.9.88",
    tags: ["queue", "apac"],
    metrics: metricSeries(3),
    runningTasks: tasks.filter((task) => task.nodeId === "node_syd_01"),
    events: events.filter((event) => event.entityId === "node_syd_01"),
  },
};

const dashboardMetricSeries: MetricPoint[] = Array.from(
  { length: 24 },
  (_, index) => {
    const detailSeries = Object.values(nodeDetails).map(
      (node) => node.metrics[index] as MetricPoint,
    );

    return {
      timestamp: detailSeries[0]?.timestamp ?? hoursAgo(23 - index),
      cpu: Math.round(
        detailSeries.reduce((total, point) => total + point.cpu, 0) /
          detailSeries.length,
      ),
      memory: Math.round(
        detailSeries.reduce((total, point) => total + point.memory, 0) /
          detailSeries.length,
      ),
      disk: Math.round(
        detailSeries.reduce((total, point) => total + point.disk, 0) /
          detailSeries.length,
      ),
    };
  },
);

const mockSession: AuthSession = {
  user: {
    id: "usr_demo_01",
    name: "Aylin Demir",
    email: "aylin@noderax.io",
    role: "Platform Lead",
  },
  scopes: ["nodes:read", "tasks:read", "tasks:write", "events:read"],
  expiresAt: new Date(now + 8 * 60 * 60 * 1000).toISOString(),
  tokenPreview: "eyJhbGciOi...noderax",
};

const delay = async <T>(value: T, ms = 280): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

export const mockApi = {
  async getSession() {
    return delay(mockSession);
  },
  async getNodes() {
    return delay(nodes);
  },
  async getNode(id: string) {
    const node = nodeDetails[id];

    if (!node) {
      throw new Error(`Node ${id} not found.`);
    }

    return delay(node);
  },
  async getTasks() {
    return delay(tasks);
  },
  async getTask(id: string) {
    const task = taskDetails[id];

    if (!task) {
      throw new Error(`Task ${id} not found.`);
    }

    return delay(task);
  },
  async getEvents() {
    return delay(events);
  },
  async getDashboardOverview(): Promise<DashboardOverview> {
    return delay({
      totals: {
        totalNodes: nodes.length,
        onlineNodes: nodes.filter((node) => node.status === "online").length,
        runningTasks: tasks.filter((task) => task.status === "running").length,
        failedTasks: tasks.filter((task) => task.status === "failed").length,
      },
      metricSeries: dashboardMetricSeries,
      recentEvents: events.slice(0, 5),
      nodes,
      tasks,
    });
  },
};
