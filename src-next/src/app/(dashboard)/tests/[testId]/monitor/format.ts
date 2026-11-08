/* Admin-Monitor formatting shared by the page and its drawer/dialog. */
import type { DeviceKind, MonitorReentryRow, MonitorRow, ReentryPolicy } from "@/lib/m6-contract";
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
  wantsBackIn: "Wants back in",
};

/** The grey line under the status ("3rd fullscreen exit", "Opened the link at 9:40 AM"). */
export function reasonText(r: MonitorRow, exitsLimit: number | null): string | null {
  switch (r.reason) {
    case "exitLimit":
      return `${ORD[exitsLimit ?? r.fullscreenExits] ?? `${exitsLimit}th`} fullscreen exit`;
    case "timeUp":
      return "Time ran out";
    case "reentryDenied":
      return "Re-entry denied · submitted";
    case "openedLink":
      return r.reasonAt ? `Opened the link at ${istTime(r.reasonAt)}` : "Opened the link";
    case "neverOpened":
      return "Never opened the link";
    case "waitingOnInstructions":
      return "Waiting on instructions";
  }
  if (r.status === "wantsBackIn" && r.reentry) return reentryWhyText(r.reentry);
  if (r.reentry?.status === "allowed") return `Allowed · going back in${r.reentry.decidedBy?.name ? ` · by ${r.reentry.decidedBy.name}` : ""}`;
  if (r.status === "submitted" && r.reasonAt) return istTime(r.reasonAt);
  if ((r.status === "writing" || r.status === "offline") && r.extraMinutes > 0) return `${r.extraMinutes} min extra time`;
  return null;
}


/* ───────── re-entry (Admin-MonitorResume) ───────── */

const DEVICE: Record<DeviceKind, string> = { desktop: "laptop", phone: "phone", tablet: "tablet" };
const dev = (k: DeviceKind | null | undefined) => (k ? DEVICE[k] : "device");
export const ALLOW_REASON_LABEL: Record<string, string> = { powerCut: "Power cut", deviceCrashed: "Device crashed", internetDropped: "Internet dropped", other: "Other" };
export const DENY_REASON_LABEL: Record<string, string> = { leftWithoutAsking: "Left without asking", suspectedCopying: "Suspected copying", other: "Other" };

/** "Browser closed 10:48 without Sign out · came back 18 min after the last save · same laptop" */
export function reentryWhyText(q: MonitorReentryRow): string {
  const f = q.facts ?? {};
  const left = f.leftAt ? istTime(f.leftAt) : null;
  const mins = f.minutesSinceSave;
  const after = mins != null ? `came back ${mins} min after the last save` : "came back";
  switch (q.why) {
    case "signedOut":
      return `Pressed Sign out${left ? ` ${left}` : ""} · signed in again ${istTime(q.since)}`;
    case "tooLate":
      return `Left${left ? ` ${left}` : ""} without Sign out · ${after} · same ${dev(f.deviceKind ?? q.deviceKind)}`;
    case "newDevice":
      return `New device: a ${dev(q.deviceKind)}${f.previousDeviceKind ? ` (was a ${dev(f.previousDeviceKind)})` : ""}${f.lastSaveAt ? ` · last save ${istTime(f.lastSaveAt)}` : ""}`;
    case "otherDevice":
      return `Opened on a ${dev(q.deviceKind)} while the ${dev(f.previousDeviceKind)} is still open`;
    case "onceOnly":
      return `Once-only test · ${after}`;
  }
  return "Wants to come back in";
}

/** "Waiting 5 min" */
export const waitingLabel = (since: string, now: number) => {
  const m = Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
  return m < 1 ? "Waiting now" : `Waiting ${m} min`;
};

/** The banner's second sentence for the test's policy. */
export function policyLine(p: { policy: ReentryPolicy; minutes: number } | undefined): string {
  if (!p || p.policy === "crash") return `This test lets students back by themselves only after a crash within ${p?.minutes ?? 5} min of their last save; these didn't meet that.`;
  if (p.policy === "once") return "This test is once only: every return waits for staff.";
  return "This test lets students back any time; these are waiting from before the setting changed.";
}

const byName = (by: unknown) => (typeof by === "string" ? by : by && typeof by === "object" && typeof (by as { name?: unknown }).name === "string" ? (by as { name: string }).name : null);

/** Timeline sentences for the re-entry kinds (and a safe fallback for any kind this app doesn't know). */
export function timelineText(kind: string, d: Record<string, unknown>): { text: string; cls: "" | "w" | "s" | "x" } {
  switch (kind) {
    case "cameBack": {
      const kindWord = dev(d.deviceKind as DeviceKind | null);
      if (d.how === "takeover") return { text: `Moved to another device (${kindWord}); the first one closed`, cls: "w" };
      if (d.how === "approved") return { text: `Came back in after ${byName(d.by) ?? "staff"} let them`, cls: "x" };
      const m = typeof d.minutesSinceSave === "number" ? ` · ${d.minutesSinceSave} min after the last save` : "";
      return { text: `Came back by themselves${m}${d.newDevice ? ` · new device (${kindWord})` : ""}`, cls: d.newDevice ? "w" : "" };
    }
    case "signedOut":
      return { text: "Pressed Sign out during the test", cls: "w" };
    case "reentryRequested":
      return { text: `Asked to come back in${d.code ? ` · code ${d.code}` : ""}`, cls: "w" };
    case "reentryAllowed": {
      const r = ALLOW_REASON_LABEL[String(d.reason)] ?? "";
      const x = typeof d.extraMinutes === "number" && d.extraMinutes > 0 ? ` · ${d.extraMinutes} min extra` : "";
      return { text: `Let back in${byName(d.by) ? ` by ${byName(d.by)}` : ""}${r ? ` · ${r}` : ""}${x}`, cls: "x" };
    }
    case "reentryDenied": {
      const r = DENY_REASON_LABEL[String(d.reason)] ?? "";
      return { text: `Not let back in${byName(d.by) ? ` by ${byName(d.by)}` : ""}${r ? ` · ${r}` : ""}${d.note ? `: ${d.note}` : ""}`, cls: "w" };
    }
    case "extraTime":
      return { text: `${d.minutes} more minutes${byName(d.by) ? ` from ${byName(d.by)}` : ""}${d.reason ? ` · ${d.reason}` : ""}`, cls: "x" };
  }
  return { text: kind.replace(/([A-Z])/g, " $1").toLowerCase(), cls: "" };
}
