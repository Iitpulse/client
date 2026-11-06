"use client";
/*
  Admin-SeatsBanners (canvas v196): account banners above the page's top bar, edge to edge. Past due (M9 billing),
  paused (the institute is suspended: look and export only) and AI credits used up / AI switched off. Data: platform
  GET /tenant/state (lib/brand.ts fetchInstituteState); nothing shows for an institute in good standing.
  The seat meter on Users is behind NEXT_PUBLIC_SEAT_METER=1 and shows only once the platform reports seats.
*/
import { useEffect, useState } from "react";
import { CircleAlert, Sparkles, TriangleAlert } from "lucide-react";
import { fetchInstituteState, useBrand, type InstituteState } from "@/lib/brand";

export function useInstituteState(): InstituteState | null {
  const brand = useBrand();
  const [s, setS] = useState<InstituteState | null>(null);
  useEffect(() => {
    let live = true;
    void fetchInstituteState().then((v) => {
      if (live) setS(v);
    });
    return () => {
      live = false;
    };
  }, []);
  if (brand.suspended && !s?.suspended) return { suspended: true, aiPaused: s?.aiPaused ?? null, pastDue: s?.pastDue ?? null, seats: s?.seats ?? null };
  return s;
}

function joinLabels(l: string[]): string {
  if (!l.length) return "AI features";
  return l.length > 1 ? `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]!.toLowerCase()}` : l[0]!;
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export function InstituteBanners() {
  const s = useInstituteState();
  if (!s || (!s.suspended && !s.pastDue && !s.aiPaused)) return null;
  return (
    <div className="col" data-testid="institute-banners">
      {s.pastDue && (
        <div className="inst-bnr warn" role="status">
          <TriangleAlert className="size-[18px]" aria-hidden />
          <span className="grow">
            <b>Payment for invoice {s.pastDue.invoiceNumber} failed.</b> Pay by {fmtDay(s.pastDue.dueDate)} to keep new tests opening. Live tests and results are not affected.
          </span>
          {s.pastDue.payUrl && (
            <a className="btn btn-primary btn-sm" href={s.pastDue.payUrl}>
              Pay now
            </a>
          )}
        </div>
      )}
      {s.suspended && (
        <div className="inst-bnr bad" role="alert">
          <CircleAlert className="size-[18px]" aria-hidden />
          <span className="grow">
            <b>Your institute&apos;s account is paused.</b> You can look at everything and download results, but you can&apos;t add students, publish tests or change settings. Students can&apos;t start new tests. Contact IIT-PULSE support to restore it.
          </span>
          <a className="btn btn-secondary btn-sm" href="mailto:support@iitpulse.in">
            Contact support
          </a>
        </div>
      )}
      {s.aiPaused && (
        <div className="inst-bnr info" role="status">
          <Sparkles className="size-[18px]" aria-hidden />
          <span className="grow">
            {s.aiPaused.reason === "credits" ? (
              <>
                <b>AI credits{s.aiPaused.until ? ` for this month` : ""} are used up.</b> AI review, doubt chat and admin AI tools are paused{s.aiPaused.until ? ` until ${fmtDay(s.aiPaused.until)}` : ""}. Tests, results and everything else work as usual.
              </>
            ) : (
              <>
                <b>{joinLabels(s.aiPaused.labels)} {s.aiPaused.labels.length > 1 ? "are" : "is"} switched off for your institute.</b> Tests, results and everything else work as usual.
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/** Admin-SeatsBanners seat meter ("Active students · November 182 of 200 in your plan"), behind a flag. */
export function SeatMeter() {
  const s = useInstituteState();
  if (process.env.NEXT_PUBLIC_SEAT_METER !== "1" || !s?.seats) return null;
  const { used, plan, extra, extraPricePaise, month } = s.seats;
  const pct = plan > 0 ? Math.min(100, Math.round((used / plan) * 100)) : 100;
  return (
    <div className="seat-meter" role="group" aria-label="Active students this month" data-testid="seat-meter">
      <span className="col gap-0.5">
        <span className="xs muted">Active students · {month}</span>
        <span className="sm num">
          <b>{used.toLocaleString("en-IN")}</b> of {plan.toLocaleString("en-IN")} in your plan
          {extra > 0 && <span className="muted"> · +{extra} billed at ₹{Math.round(extraPricePaise / 100)}</span>}
        </span>
      </span>
      <span className="bar" aria-hidden>
        <span className={used > plan ? "over" : undefined} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
