/**
 * DASH-012: Project cron schedules into calendar time slots for a given week.
 */

import type { CronJobSummary, CronSchedule } from "@/lib/cron/types";
import type { CalendarSlot, CalendarFilters } from "./types";

/**
 * Expand a single cron field into matching values.
 * Supports: literal, wildcard, step (star-slash-N).
 */
const expandCronField = (field: string, min: number, max: number): number[] => {
  // */N step
  const stepMatch = field.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    const step = parseInt(stepMatch[1], 10);
    if (step <= 0) return [];
    const vals: number[] = [];
    for (let v = min; v <= max; v += step) vals.push(v);
    return vals;
  }
  // Wildcard
  if (field === "*") {
    const vals: number[] = [];
    for (let v = min; v <= max; v++) vals.push(v);
    return vals;
  }
  // Literal number
  const num = parseInt(field, 10);
  if (!isNaN(num) && num >= min && num <= max) return [num];
  return [];
};

/**
 * Simple cron expression parser for common patterns.
 * Supports: "m h * * *" (daily at h:m), "m h * * d" (weekly on day d).
 * Returns occurrences within [startMs, endMs).
 */
const projectCronExpr = (
  expr: string,
  tz: string | undefined,
  startMs: number,
  endMs: number
): number[] => {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return [];

  const dayOfWeek = parts[4];

  // Parse minute field (supports: "0", "*", "*/15")
  const minutes = expandCronField(parts[0], 0, 59);
  // Parse hour field (supports: "12", "*", "*/6")
  const hours = expandCronField(parts[1], 0, 23);

  if (minutes.length === 0 || hours.length === 0) return [];

  const results: number[] = [];

  // Walk day by day
  const start = new Date(startMs);
  start.setHours(0, 0, 0, 0);

  for (let d = 0; d < 7; d++) {
    const day = new Date(start);
    day.setDate(day.getDate() + d);

    if (dayOfWeek !== "*") {
      const dow = parseInt(dayOfWeek, 10);
      if (isNaN(dow) || day.getDay() !== dow) continue;
    }

    for (const hour of hours) {
      for (const minute of minutes) {
        const slot = new Date(day);
        slot.setHours(hour, minute, 0, 0);
        const ts = slot.getTime();
        if (ts >= startMs && ts < endMs) {
          results.push(ts);
        }
      }
    }
  }

  return results;
};

const projectEveryMs = (
  everyMs: number,
  anchorMs: number | undefined,
  startMs: number,
  endMs: number
): number[] => {
  if (everyMs <= 0) return [];

  const anchor = anchorMs ?? startMs;
  const results: number[] = [];

  // Find first occurrence >= startMs
  let t = anchor;
  if (t < startMs) {
    const skip = Math.ceil((startMs - t) / everyMs);
    t += skip * everyMs;
  }

  // Limit to avoid huge loops for very small intervals
  const maxSlots = 200;
  let count = 0;
  while (t < endMs && count < maxSlots) {
    results.push(t);
    t += everyMs;
    count++;
  }

  return results;
};

export const projectJobToSlots = (
  job: CronJobSummary,
  startMs: number,
  endMs: number
): CalendarSlot[] => {
  const schedule = job.schedule;
  let timestamps: number[] = [];

  if (schedule.kind === "cron") {
    timestamps = projectCronExpr(schedule.expr, schedule.tz, startMs, endMs);
  } else if (schedule.kind === "every") {
    timestamps = projectEveryMs(schedule.everyMs, schedule.anchorMs, startMs, endMs);
  } else if (schedule.kind === "at") {
    const atMs = new Date(schedule.at).getTime();
    if (!isNaN(atMs) && atMs >= startMs && atMs < endMs) {
      timestamps = [atMs];
    }
  }

  return timestamps.map((ts) => ({
    job,
    startMs: ts,
    label: job.name,
  }));
};

export const projectAllJobsToSlots = (
  jobs: CronJobSummary[],
  startMs: number,
  endMs: number,
  filters?: CalendarFilters
): CalendarSlot[] => {
  return jobs
    .filter((j) => {
      if (!filters) return j.enabled;
      if (!filters.showDisabled && !j.enabled) return false;
      if (!filters.scheduleTypes.includes(j.schedule.kind)) return false;
      if (!filters.payloadTypes.includes(j.payload.kind)) return false;
      return true;
    })
    .flatMap((j) => projectJobToSlots(j, startMs, endMs))
    .sort((a, b) => a.startMs - b.startMs);
};
