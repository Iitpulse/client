/* Admin-Monitor formatting shared by the page and its drawer/dialog. */
import type { MonitorRow } from "@/lib/m6-contract";
import { istTime } from "@/lib/m6/shared";

/** "1 h 06 min" · "58 min" · "40 s" */
export function clock(seconds: number | null): string {
  if (seconds == null) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

/** "now" · "4 min ago" · "10:58 AM" */
export function seenLabel(iso: string | null, now: number, relative: boolean): string {
  if (!iso) return "—";
  const ago = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (!relative) return istTime(iso);
  if (ago < 60) return "now";
  if (ago < 3600) return `${Math.floor(ago / 60)} min ago`;
  return istTime(iso);
}

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

export const STATUS_LABEL: Record<MonitorRow["status"], string> = {
  writing: "Writing",
  offline: "Offline",
  submitted: "Submitted",
  autoSubmitted: "Auto-submitted",
  notStarted: "Not started",
};

/** The grey line under the status ("3rd fullscreen exit", "Opened the link at 9:40 AM"). */
export function reasonText(r: MonitorRow, exitsLimit: number | null): string | null {
  switch (r.reason) {
    case "exitLimit":
      return `${ORD[exitsLimit ?? r.fullscreenExits] ?? `${exitsLimit}th`} fullscreen exit`;
    case "timeUp":
      return "Time ran out";
    case "openedLink":
      return r.reasonAt ? `Opened the link at ${istTime(r.reasonAt)}` : "Opened the link";
    case "neverOpened":
      return "Never opened the link";
    case "waitingOnInstructions":
      return "Waiting on instructions";
  }
  if (r.status === "submitted" && r.reasonAt) return istTime(r.reasonAt);
  if ((r.status === "writing" || r.status === "offline") && r.extraMinutes > 0) return `${r.extraMinutes} min extra time`;
  return null;
}

