"use client";

import { useCallback } from "react";
import { useGatewayConnectionContext } from "@/lib/gateway/GatewayConnectionContext";
import { useCalendar } from "@/features/calendar/useCalendar";
import { WeeklyGrid } from "@/features/calendar/components/WeeklyGrid";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatShortDate } from "@/lib/datetime/format";
import type { CalendarFilters } from "@/features/calendar/types";

type FilterPillProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-[11px] rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none ${
        active
          ? "bg-zinc-700 border-zinc-600 text-zinc-200"
          : "bg-transparent border-zinc-700 text-zinc-500 hover:text-zinc-400 hover:border-zinc-600"
      }`}
    >
      {label}
    </button>
  );
}

function toggleArrayItem<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

export default function CalendarPage() {
  const { client, status } = useGatewayConnectionContext();
  const {
    weekStart,
    days,
    jobs,
    loading,
    error,
    filters,
    setFilters,
    goToPrevWeek,
    goToNextWeek,
    goToThisWeek,
    runJob,
    deleteJob,
  } = useCalendar(status === "connected" ? client : null);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const toggleScheduleType = useCallback(
    (kind: CalendarFilters["scheduleTypes"][number]) => {
      setFilters((f) => ({
        ...f,
        scheduleTypes: toggleArrayItem(f.scheduleTypes, kind),
      }));
    },
    [setFilters]
  );

  const togglePayloadType = useCallback(
    (kind: CalendarFilters["payloadTypes"][number]) => {
      setFilters((f) => ({
        ...f,
        payloadTypes: toggleArrayItem(f.payloadTypes, kind),
      }));
    },
    [setFilters]
  );

  const toggleShowDisabled = useCallback(() => {
    setFilters((f) => ({ ...f, showDisabled: !f.showDisabled }));
  }, [setFilters]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      <header className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Calendar</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cron job schedule • {jobs.length} job{jobs.length !== 1 ? "s" : ""}
              {status !== "connected" && (
                <span className="ml-2 text-yellow-500">• Disconnected</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevWeek}
              className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded"
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goToThisWeek}
              className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none rounded"
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </button>
            <span className="text-sm text-zinc-300 ml-2">
              {formatShortDate(weekStart.getTime())} – {formatShortDate(weekEnd.getTime())}
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide mr-1">Schedule</span>
            <FilterPill
              label="Recurring"
              active={
                filters.scheduleTypes.includes("cron") &&
                filters.scheduleTypes.includes("every")
              }
              onClick={() => {
                setFilters((f) => {
                  const hasBoth =
                    f.scheduleTypes.includes("cron") &&
                    f.scheduleTypes.includes("every");
                  const without = f.scheduleTypes.filter(
                    (t): t is CalendarFilters["scheduleTypes"][number] =>
                      t !== "cron" && t !== "every"
                  );
                  return {
                    ...f,
                    scheduleTypes: hasBoth
                      ? without
                      : ([...new Set([...f.scheduleTypes, "cron" as const, "every" as const])]),
                  };
                });
              }}
            />
            <FilterPill
              label="One-shot"
              active={filters.scheduleTypes.includes("at")}
              onClick={() => toggleScheduleType("at")}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide mr-1">Payload</span>
            <FilterPill
              label="Reminders"
              active={filters.payloadTypes.includes("systemEvent")}
              onClick={() => togglePayloadType("systemEvent")}
            />
            <FilterPill
              label="Agent Tasks"
              active={filters.payloadTypes.includes("agentTurn")}
              onClick={() => togglePayloadType("agentTurn")}
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide mr-1">Status</span>
            <FilterPill
              label="Disabled"
              active={filters.showDisabled}
              onClick={toggleShowDisabled}
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="px-4 py-2 bg-red-950/50 border-b border-red-900 text-red-400 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center flex-1 text-zinc-500 text-sm">
          Loading cron jobs…
        </div>
      ) : (
        <WeeklyGrid days={days} onRunJob={runJob} onDeleteJob={deleteJob} />
      )}
    </div>
  );
}
