import type {
  RootAccessProfile,
  RootAccessSyncStatus,
} from "@/lib/types";

export type RootAccessSurface = "operational" | "task" | "terminal";

export const ROOT_ACCESS_PROFILE_OPTIONS: RootAccessProfile[] = [
  "off",
  "operational",
  "task",
  "terminal",
  "all",
];

export const ROOT_ACCESS_PROFILE_LABELS: Record<RootAccessProfile, string> = {
  off: "Off",
  operational: "Operational root",
  task: "Task root",
  terminal: "Terminal root",
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
  all: [
    "Package management and node operational actions.",
    "Run shell.exec and scheduled shell tasks as root.",
    "Start interactive terminal sessions as root.",
  ],
};

export const profileAllowsSurface = (
  profile: RootAccessProfile,
  surface: RootAccessSurface,
) => {
  switch (surface) {
    case "operational":
      return profile === "operational" || profile === "all";
    case "task":
      return profile === "task" || profile === "all";
    case "terminal":
      return profile === "terminal" || profile === "all";
    default:
      return false;
  }
};

export const formatRootAccessProfile = (profile: RootAccessProfile) =>
  ROOT_ACCESS_PROFILE_LABELS[profile] ?? profile;

export const formatRootAccessSyncStatus = (status: RootAccessSyncStatus) =>
  ROOT_ACCESS_SYNC_STATUS_LABELS[status] ?? status;
