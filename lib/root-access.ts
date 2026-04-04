import type { RootAccessProfile, RootAccessSyncStatus } from "@/lib/types";

export type RootAccessSurface = "operational" | "task" | "terminal";

export type RootAccessSurfaceSelection = Record<RootAccessSurface, boolean>;

export const ROOT_ACCESS_PROFILE_OPTIONS: RootAccessProfile[] = [
  "off",
  "operational",
  "task",
  "terminal",
  "operational_task",
  "operational_terminal",
  "task_terminal",
  "all",
];

export const ROOT_ACCESS_PROFILE_LABELS: Record<RootAccessProfile, string> = {
  off: "Off",
  operational: "Operational root",
  task: "Task root",
  terminal: "Terminal root",
  operational_task: "Operational + Task root",
  operational_terminal: "Operational + Terminal root",
  task_terminal: "Task + Terminal root",
  all: "All root",
};

export const ROOT_ACCESS_SYNC_STATUS_LABELS: Record<
  RootAccessSyncStatus,
  string
> = {
  pending: "Pending sync",
  applied: "Applied",
  failed: "Sync failed",
};

export const ROOT_ACCESS_PROFILE_CAPABILITIES: Record<
  RootAccessProfile,
  string[]
> = {
  off: ["No privileged panel actions are allowed."],
  operational: [
    "Package install, remove, and purge operations.",
    "Node actions: apt-get update, restart agent, and reboot.",
  ],
  task: [
    "Run shell.exec tasks as root.",
    "Run shell-based scheduled tasks as root.",
  ],
  terminal: ["Start interactive terminal sessions as root."],
  operational_task: [
    "Package management and node operational actions.",
    "Run shell.exec and scheduled shell tasks as root.",
  ],
  operational_terminal: [
    "Package management and node operational actions.",
    "Start interactive terminal sessions as root.",
  ],
  task_terminal: [
    "Run shell.exec and scheduled shell tasks as root.",
    "Start interactive terminal sessions as root.",
  ],
  all: [
    "Package management and node operational actions.",
    "Run shell.exec and scheduled shell tasks as root.",
    "Start interactive terminal sessions as root.",
  ],
};

export const ROOT_ACCESS_PROFILE_SURFACE_SELECTION: Record<
  RootAccessProfile,
  RootAccessSurfaceSelection
> = {
  off: {
    operational: false,
    task: false,
    terminal: false,
  },
  operational: {
    operational: true,
    task: false,
    terminal: false,
  },
  task: {
    operational: false,
    task: true,
    terminal: false,
  },
  terminal: {
    operational: false,
    task: false,
    terminal: true,
  },
  operational_task: {
    operational: true,
    task: true,
    terminal: false,
  },
  operational_terminal: {
    operational: true,
    task: false,
    terminal: true,
  },
  task_terminal: {
    operational: false,
    task: true,
    terminal: true,
  },
  all: {
    operational: true,
    task: true,
    terminal: true,
  },
};

export const profileAllowsSurface = (
  profile: RootAccessProfile,
  surface: RootAccessSurface,
) => {
  const selection = ROOT_ACCESS_PROFILE_SURFACE_SELECTION[profile];
  return selection?.[surface] ?? false;
};

export const profileToSurfaceSelection = (
  profile: RootAccessProfile,
): RootAccessSurfaceSelection => {
  const selection = ROOT_ACCESS_PROFILE_SURFACE_SELECTION[profile];
  if (!selection) {
    return { operational: false, task: false, terminal: false };
  }

  return {
    operational: selection.operational,
    task: selection.task,
    terminal: selection.terminal,
  };
};

export const surfaceSelectionToProfile = (
  selection: RootAccessSurfaceSelection,
): RootAccessProfile => {
  const operational = Boolean(selection.operational);
  const task = Boolean(selection.task);
  const terminal = Boolean(selection.terminal);

  if (operational && task && terminal) {
    return "all";
  }

  if (operational && task) {
    return "operational_task";
  }

  if (operational && terminal) {
    return "operational_terminal";
  }

  if (task && terminal) {
    return "task_terminal";
  }

  if (operational) {
    return "operational";
  }

  if (task) {
    return "task";
  }

  if (terminal) {
    return "terminal";
  }

  return "off";
};

export const formatRootAccessProfile = (profile: RootAccessProfile) =>
  ROOT_ACCESS_PROFILE_LABELS[profile] ?? profile;

export const formatRootAccessSyncStatus = (status: RootAccessSyncStatus) =>
  ROOT_ACCESS_SYNC_STATUS_LABELS[status] ?? status;
