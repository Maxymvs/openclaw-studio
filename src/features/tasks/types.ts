export type Priority = "low" | "medium" | "high" | "critical";

export type ColumnId = "backlog" | "in-progress" | "review" | "done";

export type RunStatus = "idle" | "running" | "done" | "error";

export interface Task {
  id: string;
  title: string;
  description: string;
  agent: string;
  priority: Priority;
  columnId: ColumnId;
  createdAt: number;
  runId?: string;
  sessionKey?: string;
  runStatus?: RunStatus;
  runStartedAt?: number;
}

export interface Column {
  id: ColumnId;
  label: string;
}

export const COLUMNS: Column[] = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "text-zinc-400 bg-zinc-800",
  medium: "text-blue-400 bg-blue-950/50",
  high: "text-orange-400 bg-orange-950/50",
  critical: "text-red-400 bg-red-950/50",
};
