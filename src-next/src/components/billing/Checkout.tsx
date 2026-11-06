"use client";
/*
  Admin-BillingStates checkout dialog (canvas v196): review ("Buy 50,000 AI credits": price before GST, GST beside, total,
  Pay ₹…) → Razorpay Checkout → waiting for the payment (pending UPI / netbanking: polls every 3 s, can be closed) →
  credits added / invoice paid, or "The payment didn't go through" with Try again.

  Checkout (contract docs/m9-api.md "Checkout (frontend)"): with live keys the Razorpay window opens with the order from
  the API and its three response fields are POSTed to /verify. With `checkout.fake: true` (dev/staging until keys exist)
  Razorpay is not loaded: a stand-in step inside this dialog asks the fake for an outcome, then calls /verify with the
  returned response exactly as with Razorpay. A payment is fulfilled once whichever arrives first (verify, webhook, poll).

  Double clicks: the Pay button is disabled while the order is made, and every top-up carries one Idempotency-Key per
  dialog (a new one only after a failed attempt), so the API answers the same payment for a repeat.
*/
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, X } from "lucide-react";
import { KitDialog, apiError } from "@/components/kit";
import { billingApi, gstLabel, nf, rupees, type BillingOverview, type InvoiceSummary, type Pack, type Payment, type RazorpayResponse, type Started } from "@/lib/billing-api";

export type CheckoutTarget = { kind: "topup"; pack: Pack } | { kind: "invoice"; invoice: Pick<InvoiceSummary, "id" | "number" | "amountDuePaise" | "periodLabel" | "kind"> } | { kind: "mandate" };

type Step = "review" | "fake" | "opening" | "pending" | "ok" | "fail";

const RZP_SRC = "https://checkout.razorpay.com/v1/checkout.js";
interface RazorpayInstance {
  open: () => void;
  on: (ev: "payment.failed", cb: (r: { error?: { description?: string; reason?: string } }) => void) => void;
}
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}
function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = RZP_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Razorpay. Check your connection and try again."));
    document.head.appendChild(s);
  });
}
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const METHOD: Record<string, string> = { upi: "UPI", card: "card", netbanking: "netbanking", wallet: "wallet", emandate: "NACH", nach: "NACH" };

export function CheckoutDialog({
  target,
  overview,
  onClose,
}: {
  target: CheckoutTarget | null;
  overview: BillingOverview;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("review");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState<Started | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [result, setResult] = useState<{ payment: Payment; invoiceNumber: string | null } | null>(null);
  const key = useRef(newKey());
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = !!target;
  const aiWasPaused = !!overview.notices.aiPaused || !!overview.credits?.paused;

  useEffect(() => {
    if (!open) return;
    setStep("review");
    setStarted(null);
    setProblem(null);
    setResult(null);
    setBusy(false);
    key.current = newKey();
    return () => {
      if (poll.current) clearTimeout(poll.current);
    };
  }, [open, target]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["billing"] });
    void qc.invalidateQueries({ queryKey: ["billing-invoices"] });
  };

  const finish = async (p: Payment) => {
    if (p.status === "captured" || p.status === "authorized") {
      const invId = p.issuedInvoiceId ?? p.invoiceId;
      let number: string | null = null;
      if (invId) number = await billingApi.invoice(invId).then((i) => i.number).catch(() => null);
      setResult({ payment: p, invoiceNumber: number });
      setStep("ok");
      refresh();
      return;
    }
    if (p.status === "failed" || p.status === "cancelled") {
      setProblem(p.error?.description ?? null);
      setStep("fail");
      refresh();
      return;
    }
    // attempted / created: pending (UPI or netbanking confirming late)
    setStep("pending");
    const tick = async () => {
      try {
        const now = await billingApi.payment(p.id);
        if (["captured", "authorized", "failed", "cancelled"].includes(now.status)) return void finish(now);
      } catch {
        /* keep polling */
      }
      poll.current = setTimeout(tick, 3000);
    };
    poll.current = setTimeout(tick, 3000);
  };

  const verify = async (s: Started, r: RazorpayResponse) => {
    const v = await billingApi.verify(s.payment.id, r);
    await finish(v.payment);
  };

  const start = async () => {
    if (!target || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const s = target.kind === "topup" ? await billingApi.topup(target.pack.credits, key.current) : target.kind === "invoice" ? await billingApi.payInvoice(target.invoice.id) : await billingApi.mandate();
      setStarted(s);
      if (s.checkout.fake) {
        setStep("fake");
        return;
      }
      setStep("opening");
      await loadRazorpay();
      const RZP = window.Razorpay!;
      const rzp = new RZP({
        key: s.checkout.keyId,
        order_id: s.checkout.orderId,
        amount: s.checkout.amountPaise,
        currency: "INR",
        name: s.checkout.name,
        description: s.checkout.description,
        prefill: s.checkout.prefill,
        notes: s.checkout.notes,
        ...(s.checkout.recurring ? { customer_id: s.checkout.customerId, recurring: "1" } : {}),
        theme: { color: "#00007E" },
        handler: (resp: RazorpayResponse) => {
          setStep("pending");
          void verify(s, resp).catch((e) => {
            setProblem(apiError(e).message ?? null);
            setStep("fail");
          });
        },
        modal: {
          // closed without paying: a UPI collect may still complete, so wait on the payment instead of giving up
          ondismiss: () => void finish(s.payment),
        },
      });
      rzp.on("payment.failed", (r) => {
        setProblem(r.error?.description ?? null);
      });
      rzp.open();
    } catch (e) {
      const a = apiError(e);
      setProblem(a.code === "PAYMENTS_NOT_CONFIGURED" ? "Online payments aren't switched on yet. Pay by bank transfer to the account printed on the invoice." : (a.message ?? null));
      setStep("fail");
    } finally {
      setBusy(false);
    }
  };

  const fake = async (outcome: "success" | "failure" | "pending") => {
    if (!started || busy) return;
    setBusy(true);
    try {
      const r = await billingApi.fakeCheckout(started.payment.id, outcome);
      if (r.response) await verify(started, r.response);
      else {
        setProblem(r.error?.description ?? null);
        setStep("fail");
        refresh();
      }
    } catch (e) {
      setProblem(apiError(e).message ?? null);
      setStep("fail");
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    key.current = newKey();
    setStarted(null);
    setStep("review");
  };

  if (!target) return null;
  const taxMode = overview.billingDetails.taxMode ?? "intra";
  const pack = target.kind === "topup" ? target.pack : null;
  const amount = pack ? pack.totalPaise : target.kind === "invoice" ? target.invoice.amountDuePaise : 0;
  const title =
    target.kind === "topup" ? `Buy ${nf(target.pack.credits)} AI credits` : target.kind === "invoice" ? `Pay invoice ${target.invoice.number}` : "Set up automatic payments";
  const closable = step !== "opening" && !busy;
  const method = result?.payment.method ? (METHOD[result.payment.method] ?? result.payment.method) : null;

  return (
    <KitDialog open={open} onOpenChange={(o) => !o && closable && onClose()} title={step === "review" || step === "fake" ? title : <span className="sr-only">{title}</span>} width="w500" busy={!closable}>
      <div data-testid="checkout" data-step={step}>
        {step === "review" && (
          <div className="col" style={{ gap: 14 }}>
            {pack && (
              <div className="col">
                <div className="co-line">
                  <span>{nf(pack.credits)} credits{pack.discountPercent ? ` (${pack.discountPercent}% off)` : ""}</span>
                  <span className="num">{rupees(pack.pricePaise)}</span>
                </div>
                <div className="co-line">
                  <span>{gstLabel(taxMode)}</span>
                  <span className="num">{rupees(pack.taxPaise)}</span>
                </div>
                <div className="co-line t">
                  <span>Total</span>
                  <span className="num">{rupees(pack.totalPaise)}</span>
                </div>
              </div>
            )}
            {target.kind === "invoice" && (
              <div className="col">
                <div className="co-line">
                  <span>{target.invoice.periodLabel ?? (target.invoice.kind === "topup" ? "AI credits" : "Invoice")}</span>
                  <span className="mono sm">{target.invoice.number}</span>
                </div>
                <div className="co-line t">
                  <span>Amount due (incl. GST)</span>
                  <span className="num">{rupees(target.invoice.amountDuePaise)}</span>
                </div>
              </div>
            )}
            <span className="xs muted">
              {pack
                ? `Added as soon as the payment goes through. Valid ${overview.topups?.validityMonths ?? 12} months. GST invoice emailed${overview.billingDetails.accountsEmail ? ` to ${overview.billingDetails.accountsEmail}` : " to the Owner"}.`
                : target.kind === "invoice"
                  ? "Paid by UPI, card or netbanking through Razorpay. The receipt is emailed and the invoice shows as paid here."
                  : "Authorise NACH, UPI Autopay or a card mandate once (₹0 today). Invoices and automatic top-ups are then charged to it, each with an email to the Owner 24 hours before. You can cancel it here at any time."}
            </span>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void start()} disabled={busy} data-testid="checkout-pay">
                {busy ? "Opening…" : target.kind === "mandate" ? "Continue to authorise" : `Pay ${rupees(amount)}`}
              </button>
            </div>
          </div>
        )}

        {step === "fake" && started && (
          <div className="col" style={{ gap: 14 }} data-testid="fake-checkout">
            <div className="msg info">
              <span>
                <b>Test payment window.</b> Razorpay keys aren&apos;t set up on this server, so no money moves. Pick what the bank answers; the rest of the flow (verify, credits, invoice) is the real one.
              </span>
            </div>
            <div className="co-line t">
              <span>{started.checkout.description}</span>
              <span className="num">{started.checkout.amountPaise ? rupees(started.checkout.amountPaise) : "₹0 authorisation"}</span>
            </div>
            <div className="row wrap" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void fake("failure")}>
                Bank declines
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void fake("pending")}>
                Confirms later (UPI)
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void fake("success")}>
                {busy ? "Paying…" : "Pay successfully"}
              </button>
            </div>
          </div>
        )}

        {step === "opening" && (
          <div className="co-big">
            <span className="co-ic" style={{ background: "#E8F1FD" }}>
              <LoaderCircle className="size-[22px] animate-spin" style={{ color: "#0D2E57" }} aria-hidden />
            </span>
            <h3 className="h3">Opening Razorpay…</h3>
            <span className="sm muted">Finish paying in the Razorpay window.</span>
          </div>
        )}

        {step === "pending" && (
          <div className="co-big" role="status">
            <span className="co-ic" style={{ background: "#E8F1FD" }}>
              <LoaderCircle className="size-[22px] animate-spin" style={{ color: "#0D2E57" }} aria-hidden />
            </span>
            <h3 className="h3">Waiting for the payment</h3>
            <span className="sm muted">
              Finish paying in the Razorpay window. If you paid by UPI or netbanking, it can take a few minutes; we&apos;ll {target.kind === "topup" ? "add the credits" : target.kind === "invoice" ? "mark the invoice paid" : "switch automatic payments on"} and email you as soon as it&apos;s confirmed. You can close this.
            </span>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {step === "ok" && (
          <div className="co-big" role="status" data-testid="checkout-ok">
            <span className="co-ic" style={{ background: "#E9F6EE" }}>
              <Check className="size-6" strokeWidth={2.4} style={{ color: "#0B5E2F" }} aria-hidden />
            </span>
            <h3 className="h3">
              {target.kind === "topup" ? `${nf(result?.payment.topup?.credits ?? target.pack.credits)} credits added` : target.kind === "invoice" ? `Invoice ${target.invoice.number} paid` : "Automatic payments are set up"}
            </h3>
            <span className="sm muted">
              {target.kind === "mandate"
                ? "Invoices and automatic top-ups are charged to it from now on, each with an email 24 hours before."
                : `Paid ${rupees(result?.payment.amountPaise)}${method ? ` by ${method}` : ""}.${result?.invoiceNumber ? ` Invoice ${result.invoiceNumber} is in Invoices and on its way by email.` : ""}${target.kind === "topup" && aiWasPaused ? " AI features are on again." : ""}`}
            </span>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {step === "fail" && (
          <div className="co-big" role="alert" data-testid="checkout-fail">
            <span className="co-ic" style={{ background: "#FFF0F0" }}>
              <X className="size-6" strokeWidth={2.2} style={{ color: "#C40000" }} aria-hidden />
            </span>
            <h3 className="h3">The payment didn&apos;t go through</h3>
            <span className="sm muted">
              {problem ?? "Your bank declined it."} Nothing was charged{target.kind === "topup" ? " and no credits were added" : ""}. Try another method.
            </span>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={again}>
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </KitDialog>
  );
}
