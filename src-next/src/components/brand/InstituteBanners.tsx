"use client";
/*
  Admin-SeatsBanners (canvas v196): account banners above the page's top bar, edge to edge. Past due (M9 billing),
  paused (the institute is suspended: look and export only) and AI paused (credits used up or the monthly cap reached,
  M9; or AI switched off, M7b). Data: platform GET /tenant/state (lib/brand.ts fetchInstituteState); nothing shows for
  an institute in good standing. "Pay now" and "Buy credits" are the Owner's (only the Owner sees Billing); other staff
  are told who can pay. A suspended institute's Owner can still pay (the gateway lets billing payments through).
  The seat meter on Users ("Active students · November 182 of 200 in your plan", "+N billed at ₹39") shows once the
  platform reports seats (never for IIT-PULSE's own institute).
*/
import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleAlert, Sparkles, TriangleAlert } from "lucide-react";
import { fetchInstituteState, useBrand, type InstituteState } from "@/lib/brand";
import { useBillingVisible } from "@/components/m7b/invites";
import { auth } from "@/lib/session";

export function useInstituteState(): InstituteState | null {
  const brand = useBrand();
  const [s, setS] = useState<InstituteState | null>(null);
  useEffect(() => {
    let live = true;
    const load = (fresh: boolean) =>
      void fetchInstituteState(fresh).then((v) => {
        if (live) setS(v);
      });
    load(false);
    // after a payment or top-up (refreshInstituteState): ask again, past the 60 s cache
    const again = () => load(true);
    window.addEventListener("iitp:institute-state", again);
    return () => {
      live = false;
      window.removeEventListener("iitp:institute-state", again);
    };
  }, []);
  if (brand.suspended && !s?.suspended) return { suspended: true, aiPaused: s?.aiPaused ?? null, pastDue: s?.pastDue ?? null, seats: s?.seats ?? null };
  return s;
}

function joinLabels(l: string[]): string {
  if (!l.length) return "AI features";
  return l.length > 1 ? `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]!.toLowerCase()}` : l[0]!;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtDay = (iso: string, weekday = true) =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString("en-IN", { ...(weekday ? { weekday: "short" } : {}), day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
/** "2026-12-01" (the day AI comes back) → "November" (the month whose credits ran out) */
function monthBefore(until: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(until);
  if (!m) return "this month";
  return MONTHS[(Number(m[2]) + 10) % 12]!;
}
const monthOf = (ym: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(ym);
  return m ? MONTHS[Number(m[2]) - 1]! : ym;
};

export function InstituteBanners() {
  const s = useInstituteState();
  const canPay = useBillingVisible() && !auth.isSupportVisit();
  if (!s || (!s.suspended && !s.pastDue && !s.aiPaused)) return null;
  const pd = s.pastDue;
  const payHref = pd ? (pd.payUrl ?? (pd.invoiceId ? `/billing?pay=${pd.invoiceId}` : "/billing")) : "/billing";
  const ai = s.aiPaused;
  const aiBilling = ai && (ai.reason === "credits" || ai.reason === "cap");
  return (
    <div className="col" data-testid="institute-banners">
      {pd && !s.suspended && (
        <div className="inst-bnr warn" role="status" data-testid="banner-past-due">
          <TriangleAlert className="size-[18px]" aria-hidden />
          <span className="grow">
            <b>{pd.failed === false ? `Invoice ${pd.invoiceNumber} is past due.` : `Payment for invoice ${pd.invoiceNumber} failed.`}</b> Pay by {fmtDay(pd.suspendOn ?? pd.dueDate)} to keep new tests opening. Live tests and results are not affected.
            {!canPay && " Your institute's Owner can pay it in Billing & usage."}
          </span>
          {canPay && (
            <Link className="btn btn-secondary btn-sm" href={payHref}>
              Pay now
            </Link>
          )}
        </div>
      )}
      {s.suspended && (
        <div className="inst-bnr bad" role="alert" data-testid="banner-suspended">
          <CircleAlert className="size-[18px]" aria-hidden />
          <span className="grow">
            <b>Your institute&apos;s account is paused.</b> You can look at everything and download results, but you can&apos;t add students, publish tests or change settings. Students can&apos;t start new tests.{" "}
            {pd ? (canPay ? `Paying invoice ${pd.invoiceNumber} restores it.` : `Paying invoice ${pd.invoiceNumber} restores it; your institute's Owner can pay it in Billing & usage.`) : "Contact IIT-PULSE support to restore it."}
          </span>
          {pd && canPay ? (
            <Link className="btn btn-secondary btn-sm" href={payHref}>
              Pay now
            </Link>
          ) : (
            <a className="btn btn-secondary btn-sm" href="mailto:support@iitpulse.in">
              Contact support
            </a>
          )}
        </div>
      )}
      {ai && (
        <div className="inst-bnr info" role="status" data-testid="banner-ai-paused">
          <Sparkles className="size-[18px]" aria-hidden />
          <span className="grow">
            {aiBilling ? (
              <>
                <b>{ai.reason === "cap" ? `This month's AI spending limit is reached.` : `AI credits for ${ai.until ? monthBefore(ai.until) : "this month"} are used up.`}</b> AI review, doubt chat and admin AI tools are paused
                {ai.until ? ` until ${fmtDay(ai.until, false)}` : ""}. Tests, results and everything else work as usual.
                {!canPay && " Your institute's Owner can buy more credits."}
              </>
            ) : (
              <>
                <b>
                  {joinLabels(ai.labels)} {ai.labels.length > 1 ? "are" : "is"} switched off for your institute.
                </b>{" "}
                Tests, results and everything else work as usual.
              </>
            )}
          </span>
          {aiBilling && canPay && (
            <Link className="btn btn-secondary btn-sm" href="/billing#buy-credits">
              Buy credits
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** Admin-SeatsBanners seat meter ("Active students · November 182 of 200 in your plan", "+12 billed at ₹39"). */
export function SeatMeter() {
  const s = useInstituteState();
  if (!s?.seats) return null;
  const { used, plan, extra, extraPricePaise, month } = s.seats;
  const pct = plan > 0 ? Math.min(100, Math.round((used / plan) * 100)) : 100;
  const over = plan > 0 && used > plan;
  return (
    <div className="seat-meter" role="group" aria-label="Active students this month" data-testid="seat-meter">
      <span className="col gap-0.5">
        <span className="xs muted">Active students · {monthOf(month)}</span>
        <span className="sm num">
          <b>{used.toLocaleString("en-IN")}</b> {plan > 0 ? <>of {plan.toLocaleString("en-IN")} in your plan</> : "this month"}
        </span>
      </span>
      {plan > 0 && (
        <span className="bar" aria-hidden>
          <span className={over ? "over" : undefined} style={{ width: `${pct}%` }} />
        </span>
      )}
      {extra > 0 && (
        <span className="badge b-amber" title="Students above your plan are billed at the plan price, never blocked">
          +{extra.toLocaleString("en-IN")} billed{extraPricePaise != null ? ` at ₹${Math.round(extraPricePaise / 100).toLocaleString("en-IN")}` : ""}
        </span>
      )}
    </div>
  );
}
