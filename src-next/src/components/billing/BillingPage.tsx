"use client";
/*
  Admin-Billing + Admin-BillingStates (canvas v196, approved 6 Nov): the Owner's Billing & usage page. Plan card (price per
  active student before GST, next invoice estimate incl. GST), active students, AI credits (used / included, pace, resets),
  where credits go, Buy AI credits packs (checkout: components/billing/Checkout.tsx), automatic top-up, the invoices table
  with PDF download and Pay now, Billing details & GSTIN, "This month so far · estimate". IIT-PULSE's own institute is
  never invoiced: it gets the monthly usage report instead. API: lib/billing-api.ts (platform /admin/billing, Owner only).

  Owner decisions (batch 6): prices before GST with GST beside; seats over the plan are billed, never blocked; only the
  Owner sees Billing (a support visit looks, never pays). Backend defaults that differ from the board: top-up packs are
  priced before GST (+ GST beside), not the board's round incl.-GST prices; FY in numbers reads 2026-27.
  `?pay=<invoiceId>` (the past-due banner's Pay now) opens the checkout for that invoice; `#buy-credits` scrolls to the packs.
*/
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { Combobox, ConfirmDialog, DataTable, Field, NoAccess, PageError, PageSkeleton, Segmented, Switch, TextInput, apiError, notify, type Column } from "@/components/kit";
import { useOwner } from "@/components/m7b/invites";
import { useLocations } from "@/lib/m6/people";
import { auth } from "@/lib/session";
import { refreshInstituteState } from "@/lib/brand";
import { useInstituteState } from "@/components/brand/InstituteBanners";
import {
  GST_STATE_CODES,
  billingApi,
  dayMonth,
  featureGroup,
  gstLabel,
  kfmt,
  monthLabel,
  monthName,
  nf,
  perCredit,
  rupees,
  type BillingOverview,
  type InvoiceSummary,
  type Pack,
} from "@/lib/billing-api";
import { CheckoutDialog, type CheckoutTarget } from "./Checkout";
import "./billing.css";

type Panel = null | "details" | "auto" | "estimate";

export function BillingPage() {
  const { owner, loading } = useOwner();
  const visit = auth.isSupportVisit();
  const q = useQuery({ queryKey: ["billing"], queryFn: billingApi.overview, retry: false, enabled: owner || visit });
  const [panel, setPanel] = useState<Panel>(null);
  const [checkout, setCheckout] = useState<CheckoutTarget | null>(null);
  const router = useRouter();
  const sp = useSearchParams();
  const payParam = sp.get("pay");
  const handled = useRef<string | null>(null);
  const inst = useInstituteState();
  const d = q.data;

  // the past-due banner's "Pay now": /billing?pay=<invoiceId> opens that invoice's checkout once
  useEffect(() => {
    if (!d || !payParam || handled.current === payParam || visit) return;
    handled.current = payParam;
    const inv = d.invoices.find((i) => i.id === payParam) ?? (d.notices.pastDue?.invoiceId === payParam ? null : undefined);
    if (inv && inv.amountDuePaise > 0) setCheckout({ kind: "invoice", invoice: inv });
    else if (inv === null && d.notices.pastDue) {
      const pd = d.notices.pastDue;
      setCheckout({ kind: "invoice", invoice: { id: pd.invoiceId, number: pd.invoiceNumber, amountDuePaise: pd.amountDuePaise, periodLabel: null, kind: "subscription" } });
    }
    router.replace("/billing");
  }, [d, payParam, router, visit]);

  // "Buy credits" in the AI-paused banner lands on #buy-credits
  useEffect(() => {
    if (!d || typeof window === "undefined" || window.location.hash !== "#buy-credits") return;
    document.getElementById("buy-credits")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [d]);

  const topbar = (
    <Topbar
      title="Billing & usage"
      actions={
        d && !d.internal ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPanel(panel === "details" ? null : "details")} aria-expanded={panel === "details"}>
            Billing details &amp; GSTIN
          </button>
        ) : (
          <span className="xs muted">Only the Owner sees this page</span>
        )
      }
    />
  );

  if (loading) return <>{topbar}<main className="bl-page"><PageSkeleton rows={6} /></main></>;
  if (!owner && !visit)
    return (
      <>
        {topbar}
        <main className="bl-page">
          <NoAccess what="Billing & usage" role="only the institute's Owner" who="Your institute's Owner" />
        </main>
      </>
    );
  if (q.isError) {
    const a = apiError(q.error);
    return (
      <>
        {topbar}
        <main className="bl-page">
          {a.code === "OWNER_ONLY" ? <NoAccess what="Billing & usage" role="only the institute's Owner" who="Your institute's Owner" /> : <PageError what="billing" code={a.code ?? undefined} onRetry={() => q.refetch()} />}
        </main>
      </>
    );
  }
  if (!d)
    return (
      <>
        {topbar}
        <main className="bl-page">
          <PageSkeleton rows={6} />
        </main>
      </>
    );

  if (d.internal) return <>{topbar}<UsageOnly d={d} /></>;

  const readOnly = visit;
  // a suspended institute's Owner can still pay what is owed (invoices, automatic payments); top-ups and changes wait
  const suspended = !!inst?.suspended;
  const payOk = d.payments.mode !== null && !readOnly;
  const buy = (pack: Pack) => setCheckout({ kind: "topup", pack });

  return (
    <>
      {topbar}
      <main className="bl-page" data-testid="billing-page">
        {readOnly && (
          <div className="msg info">
            <span>
              <b>Support visit · read only.</b> IIT-PULSE support can look at billing; paying and changes stay with the Owner.
            </span>
          </div>
        )}
        {suspended && !readOnly && (
          <div className="msg warn" data-testid="billing-suspended">
            <span>
              <b>Your institute&apos;s account is paused.</b> You can still pay invoices and set up automatic payments here{d.notices.pastDue ? `; paying invoice ${d.notices.pastDue.invoiceNumber} restores the account` : ""}. Buying credits and changing billing details come back once it&apos;s restored.
            </span>
          </div>
        )}
        {panel === "details" && <DetailsPanel d={d} onClose={() => setPanel(null)} readOnly={readOnly || suspended} />}
        {panel === "auto" && <AutoTopupPanel d={d} onClose={() => setPanel(null)} readOnly={readOnly} locked={suspended} onMandate={() => setCheckout({ kind: "mandate" })} />}
        {panel === "estimate" && <EstimatePanel d={d} onClose={() => setPanel(null)} />}
        <Hero d={d} onEstimate={() => setPanel(panel === "estimate" ? null : "estimate")} />
        <Meters d={d} />
        <BuyCredits d={d} payOk={payOk && !suspended} onBuy={buy} onAuto={() => setPanel(panel === "auto" ? null : "auto")} />
        <Invoices d={d} payOk={payOk} onPay={(inv) => setCheckout({ kind: "invoice", invoice: inv })} />
      </main>
      <CheckoutDialog
        target={checkout}
        overview={d}
        onClose={() => {
          setCheckout(null);
          refreshInstituteState();
        }}
      />
    </>
  );
}

/* ───────────── plan card (board: navy hero) ───────────── */

function Hero({ d, onEstimate }: { d: BillingOverview; onEstimate: () => void }) {
  const p = d.plan!;
  const price = p.pricePaise == null ? "Price per contract" : `${rupees(p.pricePaise)} per active student per month`;
  const extras = [
    p.discountPercent ? `${p.discountPercent}% discount` : null,
    p.minBilledStudents ? `at least ${nf(p.minBilledStudents)} students billed` : null,
    p.trial?.active ? `free trial until ${dayMonth(p.trial.endsAt)}` : null,
  ].filter(Boolean);
  const est = d.estimate;
  return (
    <section className="hero cl-board row wrap rise" style={{ padding: 24, gap: 28, borderRadius: 16 }} data-testid="plan-card">
      <span className="cl-smudge" aria-hidden="true" style={{ right: -40, top: 6 }} />
      <div className="col" style={{ gap: 6, flex: "1 1 260px", position: "relative" }}>
        <span className="eyebrow bl-hero-xs">Your plan</span>
        <span style={{ fontSize: 28, fontWeight: 650, letterSpacing: "-.02em" }}>{p.name}</span>
        <span className="sm bl-hero-sub">
          {price} · before GST{extras.length ? ` · ${extras.join(" · ")}` : ""}
        </span>
        {p.next && (
          <span className="xs bl-hero-xs">
            From {monthLabel(p.next.effectiveMonth)}: {p.next.pricePaise == null ? "the new contract price" : `${rupees(p.next.pricePaise)} per student`}, {nf(p.next.aiCreditsPerStudent)} AI credits per student
            {p.next.noticeSentAt ? ` (emailed ${dayMonth(p.next.noticeSentAt)})` : ""}.
          </span>
        )}
      </div>
      <div className="col" style={{ gap: 6, flex: "1 1 200px", position: "relative" }}>
        <span className="xs bl-hero-xs">Next invoice · {est ? dayMonth(est.invoiceDate) : "—"}</span>
        <span className="num" style={{ fontSize: 26, fontWeight: 650 }} data-testid="next-invoice">
          {est?.totalPaise != null ? `≈ ${rupees(est.totalPaise)}` : "—"}
        </span>
        <span className="xs bl-hero-xs">
          incl. {(est?.tax?.rateBp ?? 1800) / 100}% GST · {p.billingMode === "mandate" ? `auto-debit${d.mandate?.last4 ? ` ••${d.mandate.last4}` : ""}` : "by invoice"} ·{" "}
          <button type="button" className="bl-hero-link" onClick={onEstimate}>
            See the estimate
          </button>
        </span>
      </div>
      <div className="row" style={{ gap: 8, position: "relative" }}>
        <a className="btn" style={{ background: "#fff", color: "var(--navy, #00007E)" }} href="mailto:support@iitpulse.in?subject=Our%20IIT-PULSE%20plan">
          Talk to us about your plan
        </a>
      </div>
    </section>
  );
}

/* ───────────── active students · AI credits · where credits go ───────────── */

function Meters({ d }: { d: BillingOverview }) {
  const s = d.seats;
  const c = d.credits;
  const committed = s.committed ?? 0;
  const seatPct = committed > 0 && s.active != null ? Math.min(100, (s.active / committed) * 100) : s.active ? 100 : 0;
  const pct = c?.included ? Math.min(100, (c.used / c.included) * 100) : 0;
  const groups = useMemo(() => {
    const g = new Map<string, number>();
    for (const [k, v] of Object.entries(c?.byFeature ?? {})) g.set(featureGroup(k), (g.get(featureGroup(k)) ?? 0) + v);
    return ["AI review", "Doubt chat", "Study plans", "Admin tools"].map((k) => [k, g.get(k) ?? 0] as const);
  }, [c]);
  const extra = s.extra ?? 0;
  const topupLeft = (c?.lots ?? []).filter((l) => l.kind !== "plan").reduce((a, l) => a + l.remaining, 0);
  const pause = c?.overage.mode !== "bill";
  return (
    <section className="bl-grid3">
      <article className="card pad-lg col rise" style={{ gap: 10, ["--i" as string]: 1 }} data-testid="seats-card">
        <div className="row between">
          <span className="h3">Active students</span>
          <span className="xs muted">{monthName(s.month)} so far</span>
        </div>
        <span className="num" style={{ fontSize: 30, fontWeight: 650 }}>
          {nf(s.active)}
          {committed > 0 && <span className="sm muted"> / {nf(committed)} in your plan</span>}
        </span>
        <div className="bar">
          <i style={{ width: `${seatPct}%`, background: extra > 0 ? "#B4530A" : undefined }} />
        </div>
        {extra > 0 && (
          <span className="badge b-amber" style={{ alignSelf: "flex-start" }}>
            +{nf(extra)} billed at {rupees(s.extraPricePaise)} each
          </span>
        )}
        <span className="xs muted">
          Only students who signed in or took a test this month count (India time). Students above your plan are billed, never blocked.
        </span>
      </article>
      <article className="card pad-lg col rise" style={{ gap: 10, ["--i" as string]: 2 }} data-testid="credits-card">
        <div className="row between">
          <span className="h3">AI credits</span>
          <span className="xs muted">resets {c ? dayMonth(c.resetsOn) : "—"}</span>
        </div>
        <span className="num" style={{ fontSize: 30, fontWeight: 650 }}>
          {kfmt(c?.used)}
          <span className="sm muted"> / {kfmt(c?.included)}</span>
        </span>
        <div className="bar">
          <i style={{ width: `${pct}%`, background: pct >= 100 ? "#C40000" : pct >= 80 ? "#9A5800" : undefined }} />
        </div>
        <span className="xs muted">
          {c ? `At this pace you'll use about ${kfmt(c.projectedUse)}. ` : ""}
          {pause
            ? "AI pauses at 100% unless you have top-up credits left."
            : `Use beyond your credits is billed as overage${c?.overage.hardCapPaise != null ? `, up to ${rupees(c.overage.hardCapPaise)} a month` : ""}.`}
          {topupLeft > 0 ? ` ${nf(topupLeft)} top-up credits left.` : ""}
        </span>
      </article>
      <article className="card pad-lg col rise" style={{ gap: 10, ["--i" as string]: 3 }}>
        <span className="h3">Where credits go</span>
        <div className="col sm" style={{ gap: 6 }}>
          {groups.map(([k, v]) => (
            <div key={k} className="row between">
              <span>{k}</span>
              <span className="num">{kfmt(v)}</span>
            </div>
          ))}
        </div>
        {c && c.overage.credits > 0 && <span className="xs muted">Overage this month: {nf(c.overage.credits)} credits · {rupees(c.overage.usedPaise)} before GST</span>}
      </article>
    </section>
  );
}

/* ───────────── Buy AI credits ───────────── */

function BuyCredits({ d, payOk, onBuy, onAuto }: { d: BillingOverview; payOk: boolean; onBuy: (p: Pack) => void; onAuto: () => void }) {
  const t = d.topups;
  const a = d.autoTopup;
  return (
    <section className="card pad-lg col rise" style={{ gap: 12, ["--i" as string]: 4, scrollMarginTop: 80 }} id="buy-credits" data-testid="buy-credits">
      <div className="row between wrap" style={{ gap: 10 }}>
        <div className="col" style={{ gap: 2 }}>
          <span className="h3">Buy AI credits</span>
          <span className="xs muted">
            Added instantly · valid {t?.validityMonths ?? 12} months · paid by UPI, card or netbanking · {t?.gstNote ?? "Prices exclude GST"}
          </span>
        </div>
        <label className="row sm" style={{ gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={!!a?.enabled} onChange={onAuto} style={{ width: 16, height: 16, accentColor: "var(--navy, #00007E)" }} aria-label="Automatic top-up settings" />
          {a?.enabled ? `Auto top-up ${kfmt(a.packCredits)} when below ${a.thresholdPercent}%` : "Automatic top-up"}
        </label>
      </div>
      {d.payments.mode === null && (
        <div className="msg info">
          <span>Online payments aren&apos;t switched on yet. To buy credits, write to support@iitpulse.in; invoices can be paid by bank transfer to the account printed on them.</span>
        </div>
      )}
      <div className="bl-packs">
        {(t?.packs ?? []).map((p) => (
          <button key={p.credits} type="button" className="bl-pack" disabled={!payOk || p.pricePaise == null} onClick={() => onBuy(p)} aria-label={`Buy ${nf(p.credits)} credits for ${rupees(p.pricePaise)} plus GST`}>
            <span className="h3 num">{nf(p.credits)}</span>
            <span className="sm muted">credits</span>
            <span className="num" style={{ fontWeight: 650 }}>
              {rupees(p.pricePaise)}
            </span>
            <span className="xs muted">+ {rupees(p.taxPaise)} GST</span>
            {p.discountPercent > 0 && (
              <span className="badge b-green" style={{ alignSelf: "flex-start" }}>
                Save {p.discountPercent}%
              </span>
            )}
          </button>
        ))}
        <a className="bl-pack" href="mailto:support@iitpulse.in?subject=AI%20credits%20for%20the%20exam%20season" style={{ textDecoration: "none" }}>
          <span className="h3">Custom</span>
          <span className="sm muted">for the exam season</span>
          <span className="sm" style={{ fontWeight: 650, color: "var(--navy, #00007E)" }}>
            Contact us
          </span>
        </a>
      </div>
      {t?.pricePer1000Paise != null && <span className="xs muted">{perCredit(t.pricePer1000Paise)} per credit before GST on your plan.</span>}
    </section>
  );
}

/* ───────────── invoices ───────────── */

const STATUS: Record<InvoiceSummary["displayStatus"], [string, string]> = {
  due: ["b-amber", "Due"],
  past_due: ["b-live", "Past due"],
  failed: ["b-live", "Failed"],
  paid: ["b-green", "Paid"],
  written_off: ["b-grey", "Written off"],
  credited: ["b-grey", "Credited"],
  credit_note: ["b-sky", "Credit note"],
};
function statusText(i: InvoiceSummary): string {
  const label = STATUS[i.displayStatus]?.[1] ?? i.displayStatus;
  if (i.displayStatus === "paid") {
    const via = (i.paidVia ?? "").replace(/^Razorpay · /i, "");
    return i.kind === "topup" && via ? `Paid · ${/^upi$/i.test(via) ? "UPI" : via}` : `Paid · ${dayMonth(i.paidAt)}`;
  }
  if (i.displayStatus === "due") return `Due · ${dayMonth(i.dueDate)}`;
  return label;
}
function periodOf(i: InvoiceSummary): string {
  if (i.kind === "credit_note") return "Credit note";
  if (i.kind === "topup") return "AI credits top-up";
  return i.periodLabel ?? (i.periodMonth ? monthLabel(i.periodMonth, true) : "—");
}

function Invoices({ d, payOk, onPay }: { d: BillingOverview; payOk: boolean; onPay: (i: InvoiceSummary) => void }) {
  const q = useInfiniteQuery({
    queryKey: ["billing-invoices"],
    queryFn: ({ pageParam }) => billingApi.invoices(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const rows = q.data?.pages.flatMap((p) => p.invoices) ?? d.invoices;
  const [busy, setBusy] = useState<string | null>(null);
  const pdf = async (i: InvoiceSummary) => {
    setBusy(i.id);
    try {
      const blob = await billingApi.pdf(i.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${i.number.replace(/\//g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      notify.error("Couldn't download the PDF", { description: "Try again in a moment." });
    } finally {
      setBusy(null);
    }
  };
  const cols: Array<Column<InvoiceSummary>> = [
    { key: "number", header: "Invoice", width: 170, render: (i) => <span className="mono sm">{i.number}</span> },
    { key: "period", header: "Period", width: 170, render: (i) => <span className="sm">{periodOf(i)}</span> },
    { key: "taxable", header: "Amount (excl. GST)", align: "num", width: 170, render: (i) => <span className="sm">{rupees(i.taxablePaise)}</span> },
    { key: "gst", header: "GST", align: "num", tablet: "hide", render: (i) => <span className="sm">{rupees(i.taxPaise)}</span> },
    { key: "total", header: "Total", align: "num", render: (i) => <span className="sm" style={{ fontWeight: 600 }}>{rupees(i.totalPaise)}</span> },
    {
      key: "status",
      header: "Status",
      width: 150,
      render: (i) => <span className={`badge ${STATUS[i.displayStatus]?.[0] ?? "b-grey"}`}>{statusText(i)}</span>,
    },
    {
      key: "act",
      header: <span className="sr-only">Actions</span>,
      width: 220,
      render: (i) => (
        <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
          {payOk && i.amountDuePaise > 0 && ["due", "past_due", "failed"].includes(i.displayStatus) && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onPay(i)}>
              Pay {rupees(i.amountDuePaise)}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy === i.id} onClick={() => void pdf(i)} aria-label={`Download PDF of ${i.number}`}>
            {busy === i.id ? "Downloading…" : "Download PDF"}
          </button>
        </div>
      ),
    },
  ];
  return (
    <section className="card rise" style={{ ["--i" as string]: 5, overflow: "hidden" }} data-testid="invoices">
      <div className="pad row between" style={{ borderBottom: "1px solid #EEF0F5" }}>
        <span className="h3">Invoices</span>
        <span className="xs muted">Numbered per financial year · GST invoices in INR</span>
      </div>
      <DataTable
        ariaLabel="Invoices"
        columns={cols}
        rows={rows}
        rowKey={(i) => i.id}
        status={q.isError && !rows.length ? "error" : q.isLoading && !rows.length ? "loading" : "ready"}
        fillMode="panel"
        minHeight={260}
        empty={<span className="sm muted">No invoices yet. Your first invoice comes on {d.estimate ? dayMonth(d.estimate.invoiceDate) : "the 1st of next month"}; AI credit top-ups get one at once.</span>}
        error={{ title: "Couldn't load invoices", code: apiError(q.error).code ?? undefined, onRetry: () => q.refetch() }}
        footer={
          q.hasNextPage ? (
            <div className="row" style={{ justifyContent: "center", padding: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
                {q.isFetchingNextPage ? "Loading…" : "Show older invoices"}
              </button>
            </div>
          ) : (
            <div className="xs muted" style={{ padding: "10px 16px" }}>
              {rows.length} invoice{rows.length === 1 ? "" : "s"}
            </div>
          )
        }
      />
    </section>
  );
}

/* ───────────── Billing details & GSTIN (BillingStates "details") ───────────── */

const GSTIN_MSG: Record<string, string> = {
  FORMAT: "This GSTIN isn't valid. Check the 15 characters; the last one is a check digit.",
  CHECKSUM: "This GSTIN isn't valid. Check the 15 characters; the last one is a check digit.",
  STATE: "This GSTIN's first two digits aren't a state code. Check the 15 characters.",
  STATE_MISMATCH: "This GSTIN is registered in another state than your billing state.",
};

function DetailsPanel({ d, onClose, readOnly }: { d: BillingOverview; onClose: () => void; readOnly: boolean }) {
  const b = d.billingDetails;
  const qc = useQueryClient();
  const loc = useLocations();
  const [legal, setLegal] = useState(b.legalName ?? "");
  const [gstin, setGstin] = useState(b.gstin ?? "");
  const [state, setState] = useState<string | null>(b.placeOfSupply ?? b.billingAddress?.stateCode ?? null);
  const [email, setEmail] = useState(b.accountsEmail ?? "");
  const [line1, setLine1] = useState(b.billingAddress?.line1 ?? "");
  const [pin, setPin] = useState(b.billingAddress?.pincode ?? "");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const states = useMemo(() => {
    const m = new Map<string, string>();
    for (const name of loc.data?.states ?? []) if (GST_STATE_CODES[name]) m.set(GST_STATE_CODES[name]!, name);
    if (b.placeOfSupply && b.stateName) m.set(b.placeOfSupply, b.stateName);
    return [...m].map(([value, label]) => ({ value, label, hint: `GST code ${value}` }));
  }, [loc.data, b.placeOfSupply, b.stateName]);
  const validSaved = !!b.gstin && gstin.trim().toUpperCase() === b.gstin;
  const save = async () => {
    const e: Record<string, string> = {};
    if (legal.trim().length < 2) e.legal = "Enter the legal name printed on invoices.";
    if (!state) e.state = "Choose the billing state.";
    if (pin && !/^\d{6}$/.test(pin)) e.pin = "Use a 6-digit PIN code.";
    if (email && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email.";
    if (gstin.trim() && gstin.trim().length !== 15) e.gstin = GSTIN_MSG.FORMAT!;
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await billingApi.saveDetails({
        legalName: legal.trim(),
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
        billingAddress: { stateCode: state!, ...(line1.trim() ? { line1: line1.trim() } : {}), ...(pin ? { pincode: pin } : {}) },
        accountsEmail: email.trim() ? email.trim().toLowerCase() : null,
      });
      notify.success("Billing details saved", { description: "Changes apply to the next invoice; issued invoices don't change." });
      await qc.invalidateQueries({ queryKey: ["billing"] });
      onClose();
    } catch (x) {
      const a = apiError(x);
      if (a.code === "GSTIN_INVALID") setErrs({ gstin: GSTIN_MSG[String(a.details?.reason ?? "FORMAT")] ?? a.message ?? GSTIN_MSG.FORMAT! });
      else if (a.code === "VALIDATION_ERROR") setErrs({ form: a.message ?? "Check the fields." });
      else notify.error("Couldn't save the billing details", { description: a.message ?? undefined });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card pad-lg col fade bl-panel" style={{ gap: 14 }} data-testid="details-panel">
      <div className="col" style={{ gap: 2 }}>
        <span className="h3">Billing details &amp; GSTIN</span>
        <span className="xs muted">Printed on every invoice. Changes apply to the next invoice; issued invoices don&apos;t change.</span>
      </div>
      <div className="bl-grid2">
        <Field label="Legal name" htmlFor="bd-legal" error={errs.legal}>
          <TextInput id="bd-legal" value={legal} onChange={(e) => setLegal(e.target.value)} disabled={readOnly} invalid={!!errs.legal} maxLength={200} />
        </Field>
        <Field label="GSTIN" optional htmlFor="bd-gstin" hint={errs.gstin ? undefined : validSaved ? <span className="bl-ok-t">✓ Valid</span> : "Leave empty if not registered"} error={errs.gstin}>
          <TextInput id="bd-gstin" mono value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 15))} disabled={readOnly} invalid={!!errs.gstin} placeholder="23AAAAA0000A1Z5" />
        </Field>
        <Field label="State (place of supply)" htmlFor="bd-state" hint="Decides CGST + SGST or IGST." error={errs.state}>
          <Combobox id="bd-state" value={state} onChange={(v) => setState(v)} options={states} noun="state" placeholder="Choose a state" disabled={readOnly} invalid={!!errs.state} />
        </Field>
        <Field label="Invoices go to" optional htmlFor="bd-email" hint="Empty: the Owner's email" error={errs.email}>
          <TextInput id="bd-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={readOnly} invalid={!!errs.email} />
        </Field>
        <Field label="Billing address" optional htmlFor="bd-line1">
          <TextInput id="bd-line1" value={line1} onChange={(e) => setLine1(e.target.value)} disabled={readOnly} maxLength={200} />
        </Field>
        <Field label="PIN code" optional htmlFor="bd-pin" error={errs.pin}>
          <TextInput id="bd-pin" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} disabled={readOnly} invalid={!!errs.pin} />
        </Field>
      </div>
      {errs.form && <span className="bl-err-t">{errs.form}</span>}
      <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        {!readOnly && (
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
            {busy ? "Saving…" : "Save details"}
          </button>
        )}
      </div>
    </section>
  );
}

/* ───────────── Automatic top-up (BillingStates "auto") + the mandate it charges ───────────── */

function AutoTopupPanel({ d, onClose, readOnly, locked, onMandate }: { d: BillingOverview; onClose: () => void; readOnly: boolean; locked: boolean; onMandate: () => void }) {
  const a = d.autoTopup!;
  const qc = useQueryClient();
  const packs = d.topups?.packs ?? [];
  const [on, setOn] = useState(a.enabled);
  const [pct, setPct] = useState(String(a.thresholdPercent));
  const [pack, setPack] = useState(String(a.packCredits));
  const [max, setMax] = useState(String(a.maxPerMonth));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cancel, setCancel] = useState(false);
  const m = d.mandate;
  const active = m?.status === "active";
  const included = d.credits?.included ?? 0;
  const pctN = Number(pct) || 0;
  const pctBad = pctN < 1 || pctN > 50;
  const save = async () => {
    if (pctBad) return setErr("Use a number from 1 to 50.");
    setBusy(true);
    setErr(null);
    try {
      await billingApi.autoTopup({ enabled: on, thresholdPercent: pctN, packCredits: Number(pack), maxPerMonth: Number(max) });
      notify.success(on ? "Automatic top-up is on" : "Automatic top-up is off", on ? { description: "We email the Owner 24 hours before each charge." } : undefined);
      await qc.invalidateQueries({ queryKey: ["billing"] });
      onClose();
    } catch (x) {
      const e = apiError(x);
      setErr(e.code === "MANDATE_REQUIRED" ? "Set up automatic payments first: top-ups are charged to it." : (e.message ?? "Couldn't save."));
    } finally {
      setBusy(false);
    }
  };
  const method = m?.method ? (m.method === "emandate" || m.method === "nach" ? "NACH mandate" : m.method === "upi" ? "UPI Autopay" : `${m.method} mandate`) : "mandate";
  return (
    <section className="card pad-lg col fade bl-panel" style={{ gap: 4 }} data-testid="auto-panel">
      <span className="h3" style={{ marginBottom: 6 }}>
        Automatic top-up
      </span>
      {!active && (
        <div className="msg info" style={{ marginBottom: 6 }}>
          <span className="grow">
            {m?.status === "pending"
              ? "Your automatic payments authorisation is waiting for the bank. It usually takes a few minutes for UPI Autopay and up to 2 days for NACH."
              : m?.status === "rejected"
                ? "The bank rejected the automatic payments authorisation. Set it up again with another account or method."
                : "Automatic top-up is charged to a NACH, UPI Autopay or card mandate. Set one up first (₹0 today)."}
          </span>
          {!readOnly && d.payments.mode !== null && m?.status !== "pending" && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onMandate}>
              Set up automatic payments
            </button>
          )}
        </div>
      )}
      <div className="bl-frow" style={{ display: "block" }}>
        <Switch
          id="auto-on"
          checked={on}
          onChange={setOn}
          disabled={readOnly || (!active && !a.enabled)}
          label="Top up automatically"
          hint={active ? `Charged to your ${method}${m?.last4 ? ` ••${m.last4}` : ""}. We email the Owner 24 hours before each charge.` : "Needs automatic payments (above)."}
        />
      </div>
      <div className="bl-frow">
        <label className="sm" htmlFor="auto-pct" style={{ fontWeight: 700 }}>
          When credits fall below
        </label>
        <span className="row" style={{ gap: 8 }}>
          <TextInput id="auto-pct" className="num" style={{ width: 80 }} inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 2))} disabled={readOnly} invalid={pctBad} aria-describedby="auto-pct-h" />
          <span id="auto-pct-h" className="sm muted">
            % ({nf(Math.round(((included || Number(pack)) * pctN) / 100))} credits)
          </span>
        </span>
      </div>
      <div className="bl-frow">
        <span className="sm" style={{ fontWeight: 700 }} id="auto-pack-l">
          Add
        </span>
        <span className="col" style={{ gap: 4, alignItems: "flex-end" }}>
          <Segmented ariaLabelledBy="auto-pack-l" value={pack} onChange={setPack} options={packs.map((p) => ({ value: String(p.credits), label: `${kfmt(p.credits)} credits`, disabled: readOnly }))} />
          <span className="xs muted">
            {(() => {
              const p = packs.find((x) => String(x.credits) === pack);
              return p ? `${rupees(p.pricePaise)} + ${rupees(p.taxPaise)} GST per top-up` : "";
            })()}
          </span>
        </span>
      </div>
      <div className="bl-frow">
        <span className="col" style={{ gap: 2 }}>
          <span className="sm" style={{ fontWeight: 700 }} id="auto-max-l">
            At most
          </span>
          <span className="xs muted">Stops for the month after this many top-ups ({a.thisMonth} so far)</span>
        </span>
        <Segmented ariaLabelledBy="auto-max-l" value={max} onChange={setMax} options={["1", "2", "3"].map((v) => ({ value: v, label: v, disabled: readOnly }))} />
      </div>
      {active && m && (
        <div className="bl-frow">
          <span className="col" style={{ gap: 2 }}>
            <span className="sm" style={{ fontWeight: 700 }}>
              Automatic payments
            </span>
            <span className="xs muted">
              {method}
              {m.last4 ? ` ••${m.last4}` : ""}
              {m.since ? ` · since ${dayMonth(m.since)}` : ""} · invoices are charged to it too
            </span>
          </span>
          {!readOnly && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: "#C40000" }} onClick={() => setCancel(true)}>
              Cancel automatic payments…
            </button>
          )}
        </div>
      )}
      {err && <span className="bl-err-t">{err}</span>}
      <div className="row" style={{ gap: 8, justifyContent: "flex-end", paddingTop: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        {!readOnly && (
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy || locked} title={locked ? "Comes back once the account is restored" : undefined}>
            {busy ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      <ConfirmDialog
        open={cancel}
        onOpenChange={setCancel}
        tone="danger"
        title="Cancel automatic payments?"
        description="Automatic top-up stops and invoices go back to being paid by you (UPI, card, netbanking or bank transfer). You can set it up again at any time."
        confirmLabel="Cancel automatic payments"
        onConfirm={async () => {
          await billingApi.cancelMandate();
          notify.success("Automatic payments cancelled");
          await qc.invalidateQueries({ queryKey: ["billing"] });
        }}
      />
    </section>
  );
}

/* ───────────── This month so far · estimate (BillingStates "usage") ───────────── */

function EstimatePanel({ d, onClose }: { d: BillingOverview; onClose: () => void }) {
  const e = d.estimate;
  return (
    <section className="card pad-lg col fade bl-panel" style={{ gap: 8 }} data-testid="estimate-panel">
      <div className="row between">
        <span className="h3">This month so far · estimate</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      {!e ? (
        <span className="sm muted">This month&apos;s active students aren&apos;t available right now. Try again in a few minutes.</span>
      ) : (
        <>
          {e.lines.length === 0 && <div className="bl-kv"><span>Nothing billable so far this month</span><span className="num">₹0</span></div>}
          {e.lines.map((l, i) => (
            <div key={i} className="bl-kv">
              <span>
                {l.description}
                {l.quantity > 1 && l.unitPricePaise ? ` · ${nf(l.quantity)} × ${rupees(l.unitPricePaise)}` : ""}
              </span>
              <span className="num">{rupees(l.amountPaise)}</span>
            </div>
          ))}
          {e.tax && (
            <div className="bl-kv">
              <span>{gstLabel(e.tax.mode, e.tax.rateBp)}</span>
              <span className="num">{rupees(e.tax.taxPaise)}</span>
            </div>
          )}
          <div className="bl-kv t">
            <span>Estimated invoice on {dayMonth(e.invoiceDate)}</span>
            <span className="num">{rupees(e.totalPaise)}</span>
          </div>
          <span className="xs muted">{e.note}</span>
        </>
      )}
    </section>
  );
}

/* ───────────── IIT-PULSE's own institute: usage report only ───────────── */

function UsageOnly({ d }: { d: BillingOverview }) {
  const periods = useQuery({ queryKey: ["billing-periods"], queryFn: billingApi.periods });
  const [month, setMonth] = useState<string>(d.seats.month);
  const usage = useQuery({ queryKey: ["billing-usage", month], queryFn: () => billingApi.usage(month), retry: false });
  const months = useMemo(() => {
    const s = new Set<string>([d.seats.month, ...(periods.data ?? []).map((p) => p.month)]);
    return [...s].sort().reverse().map((m) => ({ value: m, label: monthLabel(m), hint: m === d.seats.month ? "so far" : undefined }));
  }, [periods.data, d.seats.month]);
  const r = usage.data?.report;
  const feats = Object.entries(r?.ai?.byFeature ?? {}).sort((a, b) => b[1].credits - a[1].credits);
  const max = Math.max(1, ...feats.map(([, f]) => f.credits));
  const shadow = r?.shadow;
  return (
    <main className="bl-page" data-testid="billing-usage-only">
      <section className="hero cl-board row wrap rise" style={{ padding: 24, gap: 28, borderRadius: 16 }}>
        <span className="cl-smudge" aria-hidden="true" style={{ right: -40, top: 6 }} />
        <div className="col" style={{ gap: 6, flex: "1 1 260px", position: "relative" }}>
          <span className="eyebrow bl-hero-xs">Your plan</span>
          <span style={{ fontSize: 28, fontWeight: 650, letterSpacing: "-.02em" }}>{d.plan?.name ?? "IIT-PULSE"}</span>
          <span className="sm bl-hero-sub">{d.plan?.note ?? "No charge: usage report only"}</span>
        </div>
        <div className="col" style={{ gap: 6, flex: "1 1 200px", position: "relative" }}>
          <span className="xs bl-hero-xs">Active students · {monthName(d.seats.month)} so far</span>
          <span className="num" style={{ fontSize: 26, fontWeight: 650 }}>
            {nf(d.seats.active)}
          </span>
          <span className="xs bl-hero-xs">AI runs on the platform budget, without credits.</span>
        </div>
      </section>
      <section className="card pad-lg col" style={{ gap: 12 }}>
        <div className="row between wrap" style={{ gap: 10 }}>
          <span className="h3">Usage report · {monthLabel(month)}</span>
          <div style={{ width: 220 }}>
            <Combobox value={month} onChange={(v) => v && setMonth(v)} options={months} noun="month" aria-label="Month" />
          </div>
        </div>
        {usage.isError && <span className="sm muted">This month&apos;s report isn&apos;t available right now. Try again in a few minutes.</span>}
        {usage.isLoading && <span className="skel" style={{ height: 80, display: "block" }} />}
        {r && (
          <>
            <div className="bl-kv">
              <span>Active students (signed in or started a test)</span>
              <span className="num">{nf(r.activeStudents)}</span>
            </div>
            <div className="bl-kv">
              <span>AI credits used</span>
              <span className="num">{nf(r.ai?.credits ?? 0)}</span>
            </div>
            <div className="col" style={{ gap: 8, paddingTop: 6 }}>
              {feats.length === 0 && <span className="sm muted">No AI use this month.</span>}
              {feats.map(([k, f]) => (
                <div key={k} className="col" style={{ gap: 4 }}>
                  <div className="row between sm">
                    <span>{featureGroup(k) === "Admin tools" ? `Admin tools · ${k}` : featureGroup(k)}</span>
                    <span className="num">
                      {nf(f.credits)} <span className="xs muted">credits · {nf(f.calls)} calls</span>
                    </span>
                  </div>
                  <div className="bar" style={{ height: 6 }}>
                    <i style={{ width: `${(f.credits / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {shadow && (
              <div className="col" style={{ gap: 4, paddingTop: 10, borderTop: "1px solid #EEF0F5" }}>
                <span className="sm" style={{ fontWeight: 600 }}>
                  For comparison only: the {shadow.plan.code === "growth" ? "Growth" : shadow.plan.code} plan would charge
                </span>
                {shadow.lines.map((l, i) => (
                  <div key={i} className="bl-kv">
                    <span>{l.description}</span>
                    <span className="num">{rupees(l.amountPaise)}</span>
                  </div>
                ))}
                <div className="bl-kv t">
                  <span>Total incl. GST (not billed)</span>
                  <span className="num">{rupees(shadow.tax.totalPaise)}</span>
                </div>
                <span className="xs muted">{shadow.note}</span>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
