"use client";

import { useState, useCallback, useEffect } from "react";
import type { Task, ColumnId, Priority } from "./types";

const STORAGE_KEY = "openclaw-tasks";

function loadTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function useTaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  const persist = useCallback((next: Task[]) => {
    setTasks(next);
    saveTasks(next);
  }, []);

  const addTask = useCallback(
    (fields: { title: string; description: string; agent: string; priority: Priority }) => {
      const task: Task = {
        id: crypto.randomUUID(),
        ...fields,
        columnId: "backlog",
        createdAt: Date.now(),
        runStatus: "idle",
      };
      persist([...tasks, task]);
    },
    [tasks, persist],
  );

  const deleteTask = useCallback(
    (id: string) => {
      persist(tasks.filter((t) => t.id !== id));
    },
    [tasks, persist],
  );

  const moveTask = useCallback(
    (taskId: string, toColumn: ColumnId) => {
      persist(tasks.map((t) => (t.id === taskId ? { ...t, columnId: toColumn } : t)));
    },
    [tasks, persist],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      persist(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    },
    [tasks, persist],
  );

  const tasksForColumn = useCallback(
    (columnId: ColumnId) => tasks.filter((t) => t.columnId === columnId),
    [tasks],
  );

  const runningTasks = useCallback(
    () => tasks.filter((t) => t.runStatus === "running"),
    [tasks],
  );

  return {
    tasks,
    dragTaskId,
    setDragTaskId,
    addTask,
    deleteTask,
    moveTask,
    updateTask,
    tasksForColumn,
    runningTasks,
  };
}
