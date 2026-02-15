"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, GripVertical, Play, Loader2 } from "lucide-react";
import { useTaskBoard } from "@/features/tasks/useTaskBoard";
import {
  COLUMNS,
  PRIORITIES,
  PRIORITY_COLORS,
  type ColumnId,
  type Priority,
  type Task,
} from "@/features/tasks/types";
import { useGatewayConnectionContext } from "@/lib/gateway/GatewayConnectionContext";

type GatewayAgent = { name: string; agentId: string };

/* ── Hook: fetch real agents from gateway ──────────────────── */

function useGatewayAgents() {
  const { client, status } = useGatewayConnectionContext();
  const [agents, setAgents] = useState<GatewayAgent[]>([]);

  useEffect(() => {
    if (status !== "connected") {
      setAgents([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const config = (await client.call("config.get", {})) as Record<string, unknown>;
        const agentsObj = (config?.agents ?? {}) as Record<
          string,
          { name?: string }
        >;
        const list: GatewayAgent[] = Object.entries(agentsObj).map(
          ([id, cfg]) => ({
            agentId: id,
            name: cfg?.name ?? id,
          }),
        );
        if (!cancelled) setAgents(list);
      } catch {
        if (!cancelled) setAgents([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [client, status]);

  return agents;
}

/* ── Task Card ─────────────────────────────────────────────── */

function TaskCard({
  task,
  onDelete,
  onRun,
  onDragStart,
  onDragEnd,
  canRun,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  canRun: boolean;
}) {
  const isRunning = task.runStatus === "running";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragEnd={onDragEnd}
      className={`bg-zinc-900 border rounded-md px-3 py-2 text-xs cursor-grab active:cursor-grabbing group ${
        isRunning ? "border-blue-500/40" : "border-zinc-800"
      }`}
      data-testid="task-card"
    >
      <div className="flex items-start gap-2">
        <GripVertical size={12} className="text-zinc-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-zinc-200 font-medium truncate">{task.title}</span>
            <div className="flex items-center gap-1 shrink-0">
              {isRunning && (
                <Loader2 size={12} className="text-blue-400 animate-spin" />
              )}
              {canRun && !isRunning && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRun(task.id);
                  }}
                  className="text-zinc-600 hover:text-green-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:outline-none"
                  aria-label={`Run ${task.title}`}
                  title="Send to agent"
                >
                  <Play size={12} />
                </button>
              )}
              <button
                onClick={() => onDelete(task.id)}
                className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity rounded focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                aria-label={`Delete ${task.title}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          {task.description && (
            <p className="text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}
            >
              {task.priority}
            </span>
            {task.agent !== "unassigned" && (
              <span className="text-zinc-500 truncate">{task.agent}</span>
            )}
            {isRunning && (
              <span className="text-blue-400 text-[10px]">running…</span>
            )}
            {task.runStatus === "error" && (
              <span className="text-red-400 text-[10px]">error</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Column ────────────────────────────────────────────────── */

function KanbanColumn({
  columnId,
  label,
  tasks,
  dragTaskId,
  onDrop,
  onDelete,
  onRun,
  onDragStart,
  onDragEnd,
  canRunInColumn,
}: {
  columnId: ColumnId;
  label: string;
  tasks: Task[];
  dragTaskId: string | null;
  onDrop: (taskId: string, toColumn: ColumnId) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  canRunInColumn: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col min-w-[220px] flex-1 rounded-lg border transition-colors ${
        dragOver ? "border-blue-500/50 bg-blue-950/10" : "border-zinc-800 bg-zinc-950"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => {
        setDragOver(false);
        if (dragTaskId) onDrop(dragTaskId, columnId);
      }}
      data-testid={`column-${columnId}`}
    >
      <div className="px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            {label}
          </span>
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onDelete}
            onRun={onRun}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            canRun={canRunInColumn && task.agent !== "unassigned"}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-xs text-zinc-600 text-center py-6">No tasks</div>
        )}
      </div>
    </div>
  );
}

/* ── Create Form ───────────────────────────────────────────── */

function TaskCreateForm({
  onAdd,
  agents,
}: {
  onAdd: (fields: {
    title: string;
    description: string;
    agent: string;
    priority: Priority;
  }) => void;
  agents: GatewayAgent[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [agent, setAgent] = useState("unassigned");
  const [priority, setPriority] = useState<Priority>("medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim(),
      agent,
      priority,
    });
    setTitle("");
    setDescription("");
    setAgent("unassigned");
    setPriority("medium");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <Plus size={14} />
        New Task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
      <input
        autoFocus /* justified: form just opened, user expects to type immediately */
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title\u2026"
        aria-label="Task title"
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:border-zinc-500 w-48"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)\u2026"
        aria-label="Task description"
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:border-zinc-500 w-52"
      />
      <select
        value={agent}
        onChange={(e) => setAgent(e.target.value)}
        aria-label="Assign agent"
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:border-zinc-500"
      >
        <option value="unassigned">unassigned</option>
        {agents.map((a) => (
          <option key={a.agentId} value={a.agentId}>
            {a.name}
          </option>
        ))}
      </select>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority)}
        aria-label="Task priority"
        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:border-zinc-500"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded transition-colors"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Cancel
      </button>
    </form>
  );
}

/* ── Page ──────────────────────────────────────────────────── */

export default function TasksPage() {
  const { client, status } = useGatewayConnectionContext();
  const gatewayAgents = useGatewayAgents();
  const {
    dragTaskId,
    setDragTaskId,
    addTask,
    deleteTask,
    moveTask,
    updateTask,
    tasksForColumn,
    runningTasks,
  } = useTaskBoard();

  const connected = status === "connected";
  const runningTasksRef = useRef(runningTasks);
  runningTasksRef.current = runningTasks;

  /* ── Run a task: send to agent ──────────────────────────── */
  const handleRunTask = useCallback(
    async (taskId: string) => {
      if (!connected) return;
      const allTasks = [
        ...tasksForColumn("backlog"),
        ...tasksForColumn("in-progress"),
        ...tasksForColumn("review"),
        ...tasksForColumn("done"),
      ];
      const task = allTasks.find((t) => t.id === taskId);
      if (!task || task.agent === "unassigned") return;

      const sessionKey = `agent:${task.agent}:main`;
      const message = task.description
        ? `${task.title}\n\n${task.description}`
        : task.title;

      // Optimistically move to in-progress
      updateTask(taskId, {
        columnId: "in-progress",
        runStatus: "running",
        sessionKey,
        runStartedAt: Date.now(),
      });

      try {
        await client.call("chat.send", {
          sessionKey,
          message,
          deliver: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send";
        console.error("Task run failed:", msg);
        updateTask(taskId, {
          runStatus: "error",
        });
      }
    },
    [client, connected, tasksForColumn, updateTask],
  );

  /* ── Poll running tasks ─────────────────────────────────── */
  useEffect(() => {
    if (!connected) return;

    const poll = async () => {
      const running = runningTasksRef.current();
      if (running.length === 0) return;

      for (const task of running) {
        if (!task.agent || task.agent === "unassigned") continue;
        try {
          type SessionEntry = {
            key?: string;
            updatedAt?: number | null;
          };
          type SessionsResult = { sessions?: SessionEntry[] };
          const result = (await client.call("sessions.list", {
            agentId: task.agent,
            limit: 1,
          })) as SessionsResult;

          const sessions = result?.sessions ?? [];
          const mainSession = sessions[0];
          if (!mainSession) continue;

          // If the session was updated after we started the run and enough time has passed (>10s),
          // check if the agent is done by looking at whether it's still generating
          const updatedAt = mainSession.updatedAt ?? 0;
          const startedAt = task.runStartedAt ?? 0;
          if (updatedAt > startedAt && Date.now() - startedAt > 10000) {
            // Agent likely finished — move to review
            updateTask(task.id, {
              columnId: "review",
              runStatus: "done",
            });
          }
        } catch {
          // Ignore polling errors
        }
      }
    };

    const timer = setInterval(() => void poll(), 5000);
    return () => clearInterval(timer);
  }, [client, connected, updateTask]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      <header className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Tasks</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Kanban board for agent task tracking
              {connected ? (
                <span className="text-green-500 ml-2">● Connected</span>
              ) : (
                <span className="text-zinc-600 ml-2">● Disconnected</span>
              )}
            </p>
          </div>
          <TaskCreateForm onAdd={addTask} agents={gatewayAgents} />
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-x-auto p-4">
        <div className="flex gap-3 h-full">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              columnId={col.id}
              label={col.label}
              tasks={tasksForColumn(col.id)}
              dragTaskId={dragTaskId}
              onDrop={moveTask}
              onDelete={deleteTask}
              onRun={handleRunTask}
              onDragStart={setDragTaskId}
              onDragEnd={() => setDragTaskId(null)}
              canRunInColumn={
                connected && (col.id === "backlog" || col.id === "review")
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
