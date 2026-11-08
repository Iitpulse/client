"use client";

/*
  The parent's report (batch 8, board Admin-SendParents: "See {first}'s full report"; contract api-tests
  docs/batch8-api.md "Send to parents"). Opened from the result email: no sign-in, 30 days. Score, rank, subjects with
  the batch average, the chapters to work on, then every question with the child's answer, the key and the solution
  (equations in KaTeX). "Save as PDF" prints it. `?stop=1` (the email's "Stop result emails") asks once, then stops.
  States: loading, not found, expired, unavailable, test copy.
*/
import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Paper } from "@iitpulse/ui";
import { MathText } from "@/components/math-text";
import { BrandLogo, PoweredBy } from "@/components/brand/brand-logo";
import { useBrand } from "@/lib/brand";
import { apiError } from "@/lib/m6/client";
import { fetchParentReport, stopParentEmails, type ParentReport } from "@/lib/m6/batch8";
import "./parent-report.css";

const LETTER = (i: number) => String.fromCharCode(65 + i);
const Html = ({ text, className = "" }: { text: string; className?: string }) => <MathText html as="span" className={`min-w-0 [&_img]:max-w-full [&_p]:m-0 ${className}`} text={text || ""} />;
const day = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : "");
const mins = (s: number) => `${Math.round(s / 60)} min`;
const OUT: Record<string, { label: string; cls: string }> = {
  correct: { label: "Right", cls: "pill pill-green" },
  partial: { label: "Partly right", cls: "pill pill-amber" },
  wrong: { label: "Wrong", cls: "pill pill-red" },
  skipped: { label: "Skipped", cls: "pill" },
};

function Shell({ children }: { children: React.ReactNode }) {
  const brand = useBrand();
  return (
    <Paper surface="admin" className="admin pr" style={{ minHeight: "100vh", background: "var(--cl-paper)" }}>
      <header className="row between gap-3 border-b border-line-2 bg-surface px-4 py-3 print:hidden sm:px-7">
        <BrandLogo fallback={<b>{brand.name ?? "IIT-PULSE"}</b>} size="sm" />
        <span className="xs muted">{brand.name ?? ""}</span>
      </header>
      <main className="mx-auto col w-full max-w-[880px] gap-4 px-4 py-6 sm:px-7">{children}</main>
      <footer className="pb-6 text-center">
        <PoweredBy className="xs muted" />
      </footer>
    </Paper>
  );
}

export default function ParentReportPage() {
  const { token } = useParams() as { token: string };
  const search = useSearchParams();
  const [data, setData] = React.useState<ParentReport | null>(null);
  const [err, setErr] = React.useState<{ code: string | null; message: string | null } | null>(null);
  const [stopAsk, setStopAsk] = React.useState(search.get("stop") === "1");
  const [stopped, setStopped] = React.useState<null | "busy" | "done" | "failed">(null);
  const [open, setOpen] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    document.title = "Result report";
    let live = true;
    fetchParentReport(token)
      .then((d) => live && setData(d))
      .catch((e) => {
        const a = apiError(e);
        if (live) setErr({ code: a.code, message: a.message });
      });
    return () => {
      live = false;
    };
  }, [token]);

  const stop = async () => {
    setStopped("busy");
    try {
      await stopParentEmails(token);
      setStopped("done");
    } catch {
      setStopped("failed");
    }
  };

  const stopCard = stopAsk && (
    <section className="card pad-lg col gap-2" data-testid="parent-stop">
      {stopped === "done" ? (
        <>
          <span className="h3">Result emails stopped</span>
          <span className="sm">You won&rsquo;t get result emails about {data?.student.firstName ?? "your child"} any more. Ask the institute if you want them back.</span>
        </>
      ) : (
        <>
          <span className="h3">Stop result emails?</span>
          <span className="sm">You&rsquo;ll stop getting test results about {data?.student.firstName ?? "your child"} from the institute. This page keeps working until its link expires.</span>
          <span className="row gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={stop} disabled={stopped === "busy"} data-testid="parent-stop-confirm">
              {stopped === "busy" ? "Stopping…" : "Stop result emails"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStopAsk(false)}>
              Keep them
            </button>
          </span>
          {stopped === "failed" && <span className="sm text-danger">That didn&rsquo;t save. Try again in a moment.</span>}
        </>
      )}
    </section>
  );

  if (err)
    return (
      <Shell>
        <section className="card pad-lg col gap-2" data-testid="parent-report-error" data-code={err.code ?? ""}>
          <span className="h2">{err.code === "LINK_EXPIRED" ? "This link has expired" : err.code === "REPORT_UNAVAILABLE" ? "This report isn't available any more" : err.code === "LINK_NOT_FOUND" ? "This link doesn't work" : "The report couldn't be loaded"}</span>
          <span className="sm">{err.code === "LINK_EXPIRED" || err.code === "LINK_NOT_FOUND" || err.code === "REPORT_UNAVAILABLE" ? "Report links work for 30 days. Ask the institute to send it again." : "Try again in a moment."}</span>
        </section>
        {stopCard}
      </Shell>
    );
  if (!data)
    return (
      <Shell>
        <span className="skel block h-28 w-full" />
        <span className="skel block h-64 w-full" />
      </Shell>
    );

  const s = data.submission;
  const first = data.student.firstName;
  return (
    <Shell>
      {stopCard}
      {data.testCopy && (
        <div className="k-bn round info print:hidden" role="status">
          <span className="t">Test copy: this is what parents see. This link works for a day.</span>
        </div>
      )}
      <section className="card pad-lg col gap-3" data-testid="parent-report">
        <div className="row between wrap gap-2">
          <span className="col">
            <span className="xs muted">Result report</span>
            <h1 className="h2 m-0">
              {data.student.name} · {data.test.name}
            </h1>
            <span className="xs muted">
              {data.student.batch ? `${data.student.batch} · ` : ""}
              {s ? `Written ${day(s.submittedAt)}` : ""}
            </span>
          </span>
          <button type="button" className="btn btn-secondary btn-sm print:hidden" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
        {s ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <span className="col">
              <span className="xs muted">Score</span>
              <b className="num text-[24px]">
                {s.score} <span className="sm font-normal muted">/ {data.test.maxScore}</span>
              </b>
              <span className="xs muted">Batch average {s.batchAverage}</span>
            </span>
            <span className="col">
              <span className="xs muted">Rank</span>
              <b className="num text-[24px]">{s.rank ?? "—"}</b>
              <span className="xs muted">of {s.of}</span>
            </span>
            <span className="col">
              <span className="xs muted">Accuracy</span>
              <b className="num text-[24px]">{s.accuracyPercent}%</b>
              <span className="xs muted">
                {s.counts.correct} right · {s.counts.wrong} wrong · {s.counts.skipped} skipped
              </span>
            </span>
            <span className="col">
              <span className="xs muted">Time used</span>
              <b className="num text-[24px]">{mins(s.timeUsedSeconds)}</b>
              <span className="xs muted">of {data.test.durationMinutes} min</span>
            </span>
          </div>
        ) : (
          <span className="sm">{first} didn&rsquo;t submit this test.</span>
        )}
      </section>

      {data.subjects.length > 0 && (
        <section className="card scrollx">
          <div className="pad border-b border-line-2">
            <span className="h3">By subject</span>
          </div>
          <table className="table" aria-label="Subjects">
            <thead>
              <tr>
                <th>Subject</th>
                <th className="num">{first}</th>
                <th className="num">Batch average</th>
                <th className="num">Right · wrong · skipped</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((x) => (
                <tr key={x.name}>
                  <td>{x.name}</td>
                  <td className="num">
                    {x.score} / {x.maxScore}
                  </td>
                  <td className="num">{x.batchAverage}</td>
                  <td className="num">
                    {x.right} · {x.wrong} · {x.skipped}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.chapters.length > 0 && (
        <section className="card pad-lg col gap-2">
          <span className="h3">Chapters to work on</span>
          <span className="xs muted">Weakest first, compared with the batch</span>
          {data.chapters.slice(0, 5).map((c) => (
            <span key={`${c.subject}-${c.chapter}`} className="row between gap-2 sm">
              <span>
                {c.chapter} <span className="xs muted">· {c.subject}</span>
              </span>
              <span className="num xs">
                {c.accuracyPercent}% right · batch {c.batchAccuracyPercent}%
              </span>
            </span>
          ))}
        </section>
      )}

      <section className="col gap-2" data-testid="parent-questions">
        <span className="h3">Every question</span>
        <span className="xs muted">
          {first}&rsquo;s answer, the correct answer and the solution. Tap a question to see the solution.
        </span>
        {data.questions.map((q) => {
          const o = OUT[q.outcome] ?? OUT.skipped!;
          const mine = new Set(q.yours?.optionIds ?? []);
          const key = new Set(q.key.optionIds ?? []);
          const on = open.has(q.n);
          return (
            <article key={q.n} className="card pad col gap-2 break-inside-avoid" data-testid="parent-question">
              <div className="row between gap-2">
                <b className="sm">
                  Q{q.n} · {q.subject}
                </b>
                <span className="row gap-2">
                  <span className={o.cls}>{q.dropped ? "Dropped" : o.label}</span>
                  <span className="num xs">
                    {q.marks} / {q.maxMarks}
                  </span>
                </span>
              </div>
              {q.passage && <Html className="block font-serif text-[14px] leading-[1.55]" text={q.passage} />}
              <Html className="block font-serif text-[15px] leading-[1.55]" text={q.en.question} />
              {q.en.options.length > 0 ? (
                <div className="col gap-1.5">
                  {q.en.options.map((op, i) => (
                    <div key={op.id} className={`opt ${key.has(op.id) ? "correct" : ""} ${mine.has(op.id) && !key.has(op.id) ? "mine" : ""}`}>
                      <span className="key">{LETTER(i)}</span>
                      <Html className="font-serif" text={op.value} />
                      {(key.has(op.id) || mine.has(op.id)) && <span className="sr-otag xs">{key.has(op.id) && mine.has(op.id) ? `Correct · ${first}'s answer` : key.has(op.id) ? "Correct" : `${first}'s answer`}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="sm">
                  <b>{first}:</b> <span className="mono">{q.yoursLabel ?? (q.yours?.value !== undefined && q.yours?.value !== null ? String(q.yours.value) : "Skipped")}</span> · <b>Correct:</b>{" "}
                  <span className="mono">{q.keyLabel ?? (q.key.range ? (q.key.range.from === q.key.range.to ? String(q.key.range.from) : `${q.key.range.from} to ${q.key.range.to}`) : "—")}</span>
                </span>
              )}
              {q.en.solution && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm self-start print:hidden" onClick={() => setOpen((x) => { const n = new Set(x); if (n.has(q.n)) n.delete(q.n); else n.add(q.n); return n; })}>
                    {on ? "Hide solution" : "Show solution"}
                  </button>
                  <div className={on ? "" : "hidden print:block"}>
                    <Html className="block font-serif text-[14px] leading-[1.55]" text={q.en.solution} />
                  </div>
                </>
              )}
            </article>
          );
        })}
      </section>
      {data.expiresAt && <span className="xs muted text-center print:hidden">This link works until {day(data.expiresAt)}.</span>}
    </Shell>
  );
}
