"use client";
/*
  Batch 9 SMS in staff flows (board Admin-SMSChannels, approved canvas v243, pay per SMS): the SMS preview bubble with
  the filled-in parts highlighted and the 160 count, the "Text students" switch row, the "SMS is paused" note, and the
  shared cost confirm "This sends N SMS · about ₹X on this month's invoice" (shown before any send over 50 SMS, rule 6).
  The month-so-far facts come from GET /users/admin/messages/summary, which only the Owner and Admins may read; other
  staff see the confirm without them.
*/
import { useRef, useState, type ReactNode } from "react";
import { Pause, CircleAlert } from "lucide-react";
import { KitDialog } from "@/components/kit";
import { useMessagesVisible } from "@/components/m7b/invites";
import { istDateTime } from "@/lib/m6/shared";
import { COST_CONFIRM_OVER, about, isPaused, nextInvoiceDay, nf, pausedSince, unitPrice, useSmsSummary, type SmsEstimate, type SmsPart, type SmsTemplate } from "@/lib/sms";
import "./sms.css";

/** Owner or Admin (the Messages page, the month-so-far facts, template DLT status) */
export function useSmsAdmin(): boolean {
  return useMessagesVisible();
}

export function SmsBubble({ parts, from = "IITPLS", testId }: { parts: SmsPart[]; from?: string; testId?: string }) {
  return (
    <div className="sm-sms" data-testid={testId ?? "sms-preview"}>
      <span className="from">{from}</span>
      <span className="bub">
        {parts.map((p, i) =>
          p.v ? (
            <span key={i} className="var">
              {p.text}
            </span>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </span>
    </div>
  );
}

/** "121 of 160 characters · 1 SMS each" + the extra facts the board puts on the same line */
export function SmsMeta({ length, sms, short, children }: { length: number; sms: number; short?: boolean; children?: ReactNode }) {
  return (
    <div className="sm-meta" data-testid="sms-meta">
      <span>
        <b className="num">{length}</b> of 160{short ? "" : " characters"} · {sms === 1 ? "1 SMS each" : `${sms} SMS each`}
      </span>
      {children}
    </div>
  );
}

/** "Template parent_result · DLT approved" (the status is shown to Owner/Admin, who can read the template list) */
export function TemplateMeta({ k, templates }: { k: string; templates?: SmsTemplate[] | null }) {
  const t = templates?.find((x) => x.key === k);
  return (
    <span>
      Template <b className="mono">{k}</b>
      {t ? ` · ${t.dltStatus === "registered" ? "DLT approved" : "waiting for DLT"}` : ""}
    </span>
  );
}

export function TextStudentsRow({
  id,
  on,
  onChange,
  hint,
  paused,
  label = "Text students",
}: {
  id: string;
  on: boolean;
  onChange: (v: boolean) => void;
  hint: ReactNode;
  paused?: boolean;
  label?: string;
}) {
  return (
    <div className={`sm-trow${paused ? " off" : ""}`} data-testid="sms-switch-row">
      <span className="col" style={{ gap: 2 }}>
        <span className="sm" style={{ fontWeight: 600 }} id={`${id}-l`}>
          {label}
        </span>
        <span className="xs muted" data-testid="sms-switch-hint">
          {paused ? "Not available while SMS is paused" : hint}
        </span>
      </span>
      <button
        type="button"
        className="sm-switch"
        role="switch"
        aria-checked={paused ? false : on}
        aria-disabled={paused || undefined}
        disabled={paused}
        aria-labelledby={`${id}-l`}
        onClick={() => onChange(!on)}
        data-testid="sms-switch"
      />
    </div>
  );
}

/** "SMS is paused for your institute by IIT-PULSE since 9 Nov, 10:40 AM." */
export function SmsPausedNote({ since }: { since?: string | null }) {
  return (
    <div className="sm-note warn" role="status" data-testid="sms-paused">
      <Pause className="size-4" aria-hidden />
      <span>
        <b>SMS is paused for your institute</b> by IIT-PULSE{since ? ` since ${istDateTime(since)}` : ""}. Messages go by email and the bell until it&rsquo;s back on. Ask your Owner if you need it sooner.
      </span>
    </div>
  );
}

export function SmsWarnNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="sm-note warn" role="note">
      <CircleAlert className="size-4" aria-hidden />
      <span className="grow">{children}</span>
      {action}
    </div>
  );
}

/**
 * The shared cost confirm (board Admin-SMSChannels "cost-confirm"). `count` = SMS to send, `estimatePaise` their cost
 * at the price now. `detail` explains the count ("JEE Main Mock 14: 206 students now + the same 206 an hour before it
 * opens."); `backHint` says how to avoid the cost. Back reopens the flow's own dialog.
 */
export function SmsCostDialog({
  open,
  count,
  unitPricePaise,
  estimatePaise,
  detail,
  backHint = 'Go back and turn off "Text students" to tell them by email and the bell only, at no cost.',
  onBack,
  onCancel,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  count: number;
  unitPricePaise: number;
  estimatePaise: number;
  detail?: ReactNode;
  backHint?: ReactNode;
  onBack: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const admin = useSmsAdmin();
  const month = useSmsSummary(open && admin);
  const m = month.data;
  const so = m ? m.cost.sms : null;
  const soPaise = m ? m.cost.amountPaise : null;
  const invoiceOn = m?.cost.invoiceOn ? m.cost.invoiceOn.slice(0, 10) : null;
  const inv = invoiceOn ? `${Number(invoiceOn.slice(8, 10))} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(invoiceOn.slice(5, 7)) - 1]}` : nextInvoiceDay();
  return (
    <KitDialog
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      alert
      busy={busy}
      title={`This sends ${nf(count)} SMS · ${about(estimatePaise)} on this month's invoice`}
      description={
        <span className="sm" style={{ color: "var(--ink)" }}>
          <span className="num">
            {nf(count)} × {unitPrice(unitPricePaise)}
          </span>{" "}
          per SMS. It goes on the {inv} invoice as its own SMS line. There is no monthly limit.
        </span>
      }
      initialFocus="sms-cost-ok"
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} disabled={busy}>
            Back
          </button>
          <button id="sms-cost-ok" type="button" className="btn btn-primary btn-sm" onClick={onConfirm} disabled={busy} data-testid="sms-cost-send">
            {busy ? "Sending…" : `Send ${nf(count)} SMS`}
          </button>
        </>
      }
    >
      <div data-testid="sms-cost" className="col" style={{ gap: 12 }}>
        {so != null && soPaise != null && (
          <div className="sm-facts">
            <span className="k">SMS this month so far</span>
            <span className="num">
              {nf(so)} · {about(soPaise)}
            </span>
            <span className="k">After this</span>
            <span className="num">
              <b>
                {nf(so + count)} · {about(soPaise + estimatePaise)}
              </b>
            </span>
          </div>
        )}
        {(detail || backHint) && (
          <div className="sm-note grey">
            <span>
              {detail} {backHint}
            </span>
          </div>
        )}
        {error && (
          <span className="sm text-danger" role="alert">
            {error}
          </span>
        )}
      </div>
    </KitDialog>
  );
}

/**
 * "Text students" on a publish confirm that is a kit ConfirmDialog (results publish: Results page and Tests list).
 * `row` goes in the dialog; `confirmLabel(label)` says "Continue" when the cost confirm follows; `onConfirm(run)` runs
 * the publish at once or opens the cost confirm (`dialog`) that runs it; `onOpenChange(o, close)` keeps the flow open
 * while it moves on to the cost confirm.
 */
export function useSmsSwitch({ sms, template, detail }: { sms: SmsEstimate | null | undefined; template: string; detail: string }) {
  const [tx, setTx] = useState(true);
  const [cost, setCostState] = useState(false);
  const costRef = useRef(false);
  const runRef = useRef<null | ((o: { sms?: boolean }) => Promise<unknown>)>(null);
  const closeRef = useRef<null | (() => void)>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const setCost = (v: boolean) => {
    costRef.current = v;
    setCostState(v);
  };
  const paused = isPaused(sms?.paused);
  const n = (sms?.messages ?? 0) + (sms?.reminderMessages ?? 0);
  const send = !!sms && !paused && tx && n > 0;
  const needsCost = send && n > COST_CONFIRM_OVER;
  const opts = sms ? { sms: send } : {};
  const noPhone = sms?.noVerifiedPhone ?? 0;
  const hint = !tx ? "Off: bell and email only" : `${nf(n)} SMS now, ${about(sms?.estimatePaise)} (template ${template}).${noPhone ? ` The ${nf(noPhone)} without a verified phone get email.` : ""}`;
  const reset = () => {
    setTx(true);
    setCost(false);
    setErr(null);
  };
  const row = sms ? (
    <>
      {paused && <SmsPausedNote since={pausedSince(sms.paused)} />}
      <TextStudentsRow id={`tx-${template}`} on={tx} onChange={setTx} hint={hint} paused={paused} />
    </>
  ) : null;
  return {
    row,
    opts,
    needsCost,
    open: cost,
    confirmLabel: (label: string) => (needsCost ? "Continue" : label),
    /** wraps the dialog's onOpenChange: (o) => s.onOpenChange(o, () => setPreview(null)) */
    onOpenChange: (o: boolean, close: () => void) => {
      closeRef.current = close;
      if (!o && costRef.current) return;
      if (!o) reset();
      if (!o) close();
    },
    /** the dialog's onConfirm: () => s.onConfirm((opts) => publish(opts)) */
    onConfirm: async (run: (o: { sms?: boolean }) => Promise<unknown>) => {
      if (needsCost) {
        runRef.current = run;
        setErr(null);
        setCost(true);
        return;
      }
      await run(opts);
    },
    dialog:
      cost && sms ? (
        <SmsCostDialog
          open
          count={n}
          unitPricePaise={sms.unitPricePaise}
          estimatePaise={sms.estimatePaise}
          detail={detail}
          busy={busy}
          error={err}
          onBack={() => setCost(false)}
          onCancel={() => {
            reset();
            closeRef.current?.();
          }}
          onConfirm={async () => {
            if (!runRef.current) return;
            setBusy(true);
            setErr(null);
            try {
              await runRef.current({ sms: true });
              reset();
              closeRef.current?.();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Not published. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null,
  };
}
