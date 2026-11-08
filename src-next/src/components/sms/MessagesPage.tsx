"use client";
/*
  Admin-Messages (batch 9 v2, pay per SMS; approved canvas v243): Institute › Messages, under Billing & usage, for the
  Owner and Admins. Tabs Overview (SMS this month and the cost so far, delivered, didn't arrive, by type, sender name
  IITPLS, quiet hours), Delivery log (search by name or the last 4 digits, status filter with counts, numbers show the
  last 4 digits only, pages) and Templates (the DLT wording, read only, registered / waiting). The paused banner when
  IIT-PULSE paused SMS. States: loading, error (SMS keep going out; only this page failed), log no-match.
  API: api-users docs/sms-api.md §5 (lib/sms.ts).
*/
import Link from "next/link";
import { useEffect, useState } from "react";
import { Pause } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, NoAccess, Pagination, SearchBox, Segmented, StateBox, supportCode, type Column } from "@/components/kit";
import { useOwner, useMessagesVisible } from "@/components/m7b/invites";
import { useMe } from "@/lib/m6/people";
import { istDateTime } from "@/lib/m6/shared";
import { dayMonth, nf, rupeesExact, unitPrice, useSmsLog, useSmsSummary, useSmsTemplates, type SmsLogItem, type SmsSummary, type SmsTemplate } from "@/lib/sms";
import "./sms.css";

type Tab = "overview" | "log" | "tpl";
const TABS: Array<[Tab, string]> = [
  ["overview", "Overview"],
  ["log", "Delivery log"],
  ["tpl", "Templates"],
];
const FILTERS: Array<[string, string]> = [
  ["all", "All"],
  ["delivered", "Delivered"],
  ["failed", "Failed"],
  ["operator", "Not delivered by operator"],
  ["invalid", "Number invalid"],
];
const BADGE: Record<string, string> = {
  delivered: "b-green",
  failed: "b-red",
  operator: "b-amber",
  invalid: "b-grey",
  waiting: "b-sky",
  dropped: "b-grey",
  paused: "b-grey",
  logged: "b-grey",
};
const STATUS_LABEL: Record<string, string> = {
  delivered: "Delivered",
  failed: "Failed",
  operator: "Not delivered by operator",
  invalid: "Number invalid",
  waiting: "Waiting",
  dropped: "Dropped",
  paused: "Moved to email",
  logged: "Logged only",
};

function PausedBanner({ p }: { p: NonNullable<SmsSummary["paused"]> }) {
  return (
    <div className="ms-bn" role="status" data-testid="messages-paused">
      <Pause className="size-4" aria-hidden />
      <span>
        <b>SMS is paused by IIT-PULSE since {istDateTime(p.since)}.</b>
        {p.reason ? ` Reason given: ${p.reason.replace(/\.$/, "")}.` : ""} Messages go by email and the bell. Sign-in codes still go by SMS. Contact IIT-PULSE support to turn it back on.
      </span>
    </div>
  );
}

export function MessagesPage() {
  const visible = useMessagesVisible();
  const me = useMe();
  const { owner, loading: ownerLoading } = useOwner();
  const router = useRouter();
  const sp = useSearchParams();
  const want = sp.get("tab");
  const [tab, setTab] = useState<Tab>(want === "log" || want === "tpl" ? want : "overview");
  useEffect(() => {
    const w = sp.get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the address (back / forward)
    setTab(w === "log" || w === "tpl" ? w : "overview");
  }, [sp]);
  const pick = (t: Tab) => {
    setTab(t);
    router.replace(t === "overview" ? "/messages" : `/messages?tab=${t}`, { scroll: false });
  };
  const summary = useSmsSummary(visible);
  const s = summary.data;

  if (!visible && !me.isLoading && !ownerLoading)
    return (
      <main className="ms-page">
        <NoAccess what="Messages" who="Your institute's Owner" />
      </main>
    );

  return (
    <>
      <header className="ms-head">
        <div className="row between wrap" style={{ gap: 10 }}>
          <div className="col" style={{ gap: 2 }}>
            <h1 className="topbar-title">Messages</h1>
            <span className="xs muted">SMS your institute sent this month, what they cost and whether they arrived</span>
          </div>
          {owner && (
            <Link href="/billing" className="btn btn-secondary btn-sm">
              See invoices
            </Link>
          )}
        </div>
        <div className="underline-tabs" role="tablist" aria-label="Messages" style={{ borderBottom: 0 }}>
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={`utab${tab === k ? " on" : ""}`} onClick={() => pick(k)}>
              {l}
            </button>
          ))}
        </div>
      </header>
      <main className="ms-page" data-testid="messages-page">
        {s?.paused && <PausedBanner p={s.paused} />}
        {tab === "overview" &&
          (summary.isLoading ? (
            <div className="col" style={{ gap: 12 }} aria-busy="true" aria-label="Loading messages" data-testid="messages-loading">
              <div className="ms-tiles">
                <span className="skel" style={{ gridColumn: "span 2", height: 112, borderRadius: 12 }} />
                <span className="skel" style={{ height: 112, borderRadius: 12 }} />
                <span className="skel" style={{ height: 112, borderRadius: 12 }} />
              </div>
              <span className="skel" style={{ height: 260, borderRadius: 12 }} />
            </div>
          ) : summary.isError || !s ? (
            <LoadError code={supportCode("E-MS", summary.error)} onRetry={() => summary.refetch()} />
          ) : (
            <Overview s={s} />
          ))}
        {tab === "log" && <DeliveryLog enabled={visible} />}
        {tab === "tpl" && <Templates enabled={visible} />}
      </main>
    </>
  );
}

function LoadError({ code, onRetry }: { code: string; onRetry: () => void }) {
  return (
    <section className="card" role="alert" data-testid="messages-error">
      <StateBox
        tone="error"
        title="Couldn't load messages"
        body="SMS keep going out; only this page failed. Try again in a moment."
        code={code}
        action={
          <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
            Try again
          </button>
        }
      />
    </section>
  );
}

function Overview({ s }: { s: SmsSummary }) {
  const total = Math.max(1, s.byType.reduce((a, t) => a + t.sms, 0));
  const invoice = s.cost.invoiceOn ? dayMonth(s.cost.invoiceOn) : null;
  const prices = s.cost.byPrice.length > 1 ? s.cost.byPrice.map((b) => `${nf(b.count)} at ${unitPrice(b.unitPricePaise)}`).join(", ") : null;
  const notArrivedRate = s.sms.sent ? s.sms.notArrived : 0;
  return (
    <div className="col fade" style={{ gap: 16 }}>
      <section className="ms-tiles" data-testid="messages-tiles">
        <article className="ms-tile wide">
          <span className="l">
            SMS this month · {s.monthLabel}
            {s.soFar ? " so far" : ""}
          </span>
          <b data-testid="messages-month">
            {nf(s.cost.sms)}{" "}
            <span className="sm muted" style={{ fontWeight: 500 }}>
              · {s.cost.estimate ? "about " : ""}
              {rupeesExact(s.cost.amountPaise)}
              {s.soFar ? " so far" : ""}
            </span>
          </b>
          <span className="xs muted">
            {unitPrice(s.cost.unitPricePaise)} per SMS, every SMS including sign-in codes. No limit. {invoice ? `Billed as its own line on the ${invoice} invoice.` : "Billed as its own line on the monthly invoice."}
            {prices ? ` This month: ${prices}.` : ""}
            {s.lastMonth ? ` ${monthOf(s.lastMonth.month)}: ${nf(s.lastMonth.sms)} SMS, ${rupeesExact(s.lastMonth.amountPaise)}.` : ""}
          </span>
        </article>
        <article className="ms-tile">
          <span className="l">Delivered</span>
          <b>{s.sms.deliveredRate == null ? "—" : `${s.sms.deliveredRate}%`}</b>
          <span className="xs muted">
            {nf(s.sms.delivered)} of {nf(s.sms.sent)}
            {s.sms.pending ? ` · ${nf(s.sms.pending)} waiting for a report` : ""}
          </span>
        </article>
        <article className="ms-tile">
          <span className="l">Didn&rsquo;t arrive</span>
          <b style={{ color: notArrivedRate ? "#C40000" : undefined }}>{nf(s.sms.notArrived)}</b>
          <span className="xs muted">{s.sms.notArrived ? `${nf(s.sms.emailInstead)} got the email instead` : "every SMS arrived"}</span>
        </article>
      </section>
      <section className="ms-2">
        <article className="card pad-lg col" style={{ gap: 10 }} data-testid="messages-bytype">
          <span className="h3">By type this month</span>
          {s.byType.map((t, i) => (
            <div key={t.type} className="col" style={{ gap: 4 }}>
              <div className="row between sm" style={{ gap: 12 }}>
                <span>{t.label}</span>
                <span className="num whitespace-nowrap">
                  {nf(t.sms)} · {rupeesExact(t.amountPaise)}
                </span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.round((t.sms / total) * 100)}%`, animationDelay: `${i * 0.1}s` }} />
              </div>
            </div>
          ))}
          <span className="xs muted">
            {s.spike?.over ? "This month has passed twice last month's SMS; the Owner was emailed. Nothing is blocked." : "If this month passes twice last month's SMS, the Owner gets an email."}
          </span>
        </article>
        <article className="card pad-lg col" style={{ gap: 10 }} data-testid="messages-sender">
          <span className="h3">Sender name</span>
          <div className="row" style={{ gap: 12 }}>
            <span className="ms-sender">{s.sender.id}</span>
            <span className={`badge ${s.sender.dlt === "registered" ? "b-green" : "b-amber"}`}>{s.sender.dlt === "registered" ? "DLT registered" : "Waiting for DLT"}</span>
          </div>
          <span className="sm muted">Every SMS comes from this name, for every institute on IIT-PULSE. Set by IIT-PULSE; it can&rsquo;t be changed here.</span>
          <span className="xs muted">
            No SMS between {clock(s.quietHours.from)} and {clock(s.quietHours.to)} IST except sign-in codes. Messages written then go at {clock(s.quietHours.to)}.
          </span>
        </article>
      </section>
    </div>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;
/** "21:00" → "9 PM", "08:00" → "8 AM" */
function clock(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const hh = (h ?? 0) % 12 || 12;
  return `${hh}${m ? `:${String(m).padStart(2, "0")}` : ""} ${(h ?? 0) < 12 ? "AM" : "PM"}`;
}

function DeliveryLog({ enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const log = useSmsLog({ status, q: q.trim(), page, pageSize }, enabled);
  const d = log.data;
  const columns: Array<Column<SmsLogItem>> = [
    { key: "at", header: "Sent", width: 150, render: (r) => <span className="sm num whitespace-nowrap">{istDateTime(r.sentAt ?? r.at)}</span> },
    {
      key: "to",
      header: "To",
      render: (r) => (
        <span className="col" style={{ gap: 1 }}>
          <span className="sm" style={{ fontWeight: 600 }}>
            {r.to}
          </span>
          <span className="xs muted mono" data-testid="log-phone">
            {r.phone}
          </span>
        </span>
      ),
    },
    {
      key: "msg",
      header: "Message",
      render: (r) => (
        <span className="col sm" style={{ gap: 1 }}>
          <span>
            {r.message}
            {r.note ? ` (${r.note})` : ""}
          </span>
          <span className="xs muted mono">{r.template}</span>
        </span>
      ),
    },
    { key: "st", header: "Status", width: 190, render: (r) => <span className={`badge ${BADGE[r.status] ?? "b-grey"}`}>{r.statusLabel || STATUS_LABEL[r.status] || r.status}</span> },
    { key: "then", header: "Then", width: 230, tablet: "hide", render: (r) => <span className="xs muted">{r.then ?? "—"}</span> },
  ];
  return (
    <section className="card col fade" style={{ overflow: "hidden" }} data-testid="messages-log">
      <div className="pad row wrap" style={{ gap: 10 }}>
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Student, parent or last 4 digits"
          label="Search the delivery log"
          width={340}
        />
        <Segmented
          ariaLabel="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={FILTERS.map(([v, l]) => ({ value: v, label: l, count: d?.counts[v as keyof typeof d.counts] != null ? nf(d.counts[v as keyof typeof d.counts]) : undefined }))}
        />
      </div>
      <DataTable
        ariaLabel="Delivery log"
        columns={columns}
        rows={d?.items}
        rowKey={(r) => r.id}
        status={log.isLoading ? "loading" : log.isError ? "error" : "ready"}
        scrollX
        minWidth={860}
        filtered={!!q.trim() || status !== "all"}
        empty={<StateBox title="No SMS this month yet" body="Class, test and result messages and sign-in codes show here as they go out." />}
        noMatch={
          <StateBox
            title={q.trim() ? `No messages match "${q.trim()}"` : "No messages with this status"}
            body="Searches this month. Try a last name or the last 4 digits of the number."
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setQ("");
                  setStatus("all");
                }}
              >
                Clear search
              </button>
            }
          />
        }
        error={{ title: "Couldn't load the delivery log", body: "SMS keep going out; only this page failed.", code: supportCode("E-MS", log.error), onRetry: () => log.refetch() }}
        footer={d && d.total > 0 ? <Pagination page={page} pageSize={pageSize} total={d.total} onPage={setPage} onPageSize={(n) => (setPageSize(n), setPage(1))} extra={<span className="xs muted">This month · numbers show the last 4 digits only</span>} /> : undefined}
      />
    </section>
  );
}

function TemplateText({ t }: { t: SmsTemplate }) {
  const bits = t.text.split("{#var#}");
  return (
    <span className="ms-txt">
      {bits.map((b, i) => (
        <span key={i}>
          {b}
          {i < bits.length - 1 && <span className="var">{"{#var#}"}</span>}
        </span>
      ))}
    </span>
  );
}

function Templates({ enabled }: { enabled: boolean }) {
  const q = useSmsTemplates(enabled);
  const rows = q.data?.templates;
  const columns: Array<Column<SmsTemplate>> = [
    { key: "id", header: "Template", width: 150, render: (t) => <span className="sm mono" style={{ fontWeight: 600 }}>{t.key}</span> },
    { key: "use", header: "Used for", width: 200, render: (t) => <span className="sm">{t.use}</span> },
    { key: "text", header: "Text", render: (t) => <TemplateText t={t} /> },
    {
      key: "dlt",
      header: "DLT",
      width: 170,
      render: (t) => (
        <span className={`badge ${t.dltStatus === "registered" ? "b-green" : "b-amber"}`} data-testid="tpl-dlt">
          {t.dltLabel || (t.dltStatus === "registered" ? "Registered" : "Waiting for DLT")}
        </span>
      ),
    },
  ];
  const waiting = rows?.filter((t) => t.dltStatus !== "registered").length ?? 0;
  return (
    <section className="card col fade" style={{ overflow: "hidden" }} data-testid="messages-templates">
      <div className="pad row between wrap" style={{ gap: 8 }}>
        <span className="col" style={{ gap: 2 }}>
          <span className="h3">SMS templates</span>
          <span className="xs muted">Fixed wording approved on the DLT portal. Highlighted parts are filled in per message. Read only.</span>
        </span>
        {waiting > 0 && <span className="xs muted">{nf(waiting)} waiting for DLT: operators drop unregistered text, so those SMS won&rsquo;t arrive until IIT-PULSE registers them.</span>}
      </div>
      <DataTable
        ariaLabel="SMS templates"
        columns={columns}
        rows={rows}
        rowKey={(t) => t.key}
        status={q.isLoading ? "loading" : q.isError ? "error" : "ready"}
        scrollX
        minWidth={860}
        empty={<StateBox title="No templates yet" body="IIT-PULSE adds them as DLT approves them." />}
        error={{ title: "Couldn't load the templates", body: "SMS keep going out; only this page failed.", code: supportCode("E-MS", q.error), onRetry: () => q.refetch() }}
      />
    </section>
  );
}
