"use client";

/*
  Send results to parents (batch 8, board Admin-SendParents). One email per confirmed parent about their own child:
  score, rank, subject marks with the batch average, the institute's note and a 30-day, no-password link to the report.
  States: publish first (results not out yet), no parent emails, couldn't load (support code), the list (who gets it,
  who is skipped and why), sent before (sending again goes only to parents added or confirmed since), bounced (resend
  to these only), the preview of one parent's email with the note, test copy, confirm, sending, sent. Students are
  never told. Data: lib/m6/batch8.ts (api-tests docs/batch8-api.md "Send to parents").
*/
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { ConfirmDialog, FilterChip, SearchBox, StateBox, inr, notify, supportCode, useFillHeight } from "@/components/kit";
import { apiError } from "@/lib/m6/client";
import { istDate, istDateTime } from "@/lib/m6/shared";
import { useBrand } from "@/lib/brand";
import { useCan } from "@/lib/m6/people";
import { parentTestCopy, sendParents, useParentRecipients, useParentSends, type ParentRecipient } from "@/lib/m6/batch8";

const STATUS: Record<string, { label: string; cls: string }> = {
  willSend: { label: "Will get it", cls: "pill pill-navy" },
  delivered: { label: "Delivered", cls: "pill pill-green" },
  sent: { label: "Sent", cls: "pill pill-green" },
  queued: { label: "Still sending", cls: "pill" },
  bounced: { label: "Bounced", cls: "pill pill-red" },
  failed: { label: "Not sent", cls: "pill pill-red" },
  noEmail: { label: "No email", cls: "pill" },
  notConfirmed: { label: "Not confirmed", cls: "pill pill-amber" },
  stopped: { label: "Stopped result emails", cls: "pill" },
};

function statusOf(r: ParentRecipient): keyof typeof STATUS {
  if (r.parent.status !== "confirmed") return r.parent.status;
  if (r.last) return r.last.status;
  return "willSend";
}
const why = (r: ParentRecipient) =>
  r.parent.status === "noEmail"
    ? "18 or older, or joined before sign-up asked for it"
    : r.parent.status === "notConfirmed"
      ? "Under 18; the parent hasn't opened the confirmation link"
      : r.parent.status === "stopped"
        ? "The parent stopped result emails"
        : r.last?.status === "bounced"
          ? "Their mail server refused the address"
          : r.last?.status === "failed"
            ? "Couldn't be sent; resend"
            : r.last
              ? `Sent ${istDateTime(r.last.at)}`
              : "";

export default function SendToParentsPage() {
  const { testId } = useParams() as { testId: string };
  const qc = useQueryClient();
  const { can } = useCan();
  const brand = useBrand();
  const canSend = can("PUBLISH_RESULT");
  const [batchIds, setBatchIds] = React.useState<string[]>([]);
  const rec = useParentRecipients(testId, batchIds);
  const hist = useParentSends(testId);
  const [q, setQ] = React.useState("");
  const [note, setNote] = React.useState("");
  const [pos, setPos] = React.useState(0);
  const [confirm, setConfirm] = React.useState<null | "all" | "bounced">(null);
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState<null | { sent: number; at: string }>(null);
  const [fillRef, fillH] = useFillHeight<HTMLElement>(!!rec.data?.items.length, 320, 72, "panel");

  const d = rec.data;
  const items = React.useMemo(() => d?.items ?? [], [d]);
  const needle = q.trim().toLowerCase();
  const shown = items.filter((r) => !needle || r.student.name.toLowerCase().includes(needle));
  const willSend = items.filter((r) => r.willSend);
  const bounced = items.filter((r) => r.parent.status === "confirmed" && r.last && (r.last.status === "bounced" || r.last.status === "failed"));
  const previewable = willSend.length ? willSend : items.filter((r) => r.parent.status === "confirmed");
  const p = previewable[Math.min(pos, Math.max(0, previewable.length - 1))] ?? null;
  const c = d?.counts;
  const skipText = c ? [c.noEmail ? `${c.noEmail} no email` : null, c.notConfirmed ? `${c.notConfirmed} not confirmed` : null, c.stopped ? `${c.stopped} stopped` : null, c.alreadySent ? `${c.alreadySent} already sent` : null].filter(Boolean).join(" · ") : "";
  const testName = d?.test.name ?? "Results";
  const institute = brand.name ?? "Your institute";
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["m6", "parent-recipients", testId] });
    await qc.invalidateQueries({ queryKey: ["m6", "parent-sends", testId] });
  };

  const send = async (only: "all" | "bounced") => {
    setSending(true);
    try {
      const r = await sendParents(testId, { note: note.trim() || null, ...(batchIds.length ? { batchIds } : {}), ...(only === "bounced" ? { only: "bounced" as const } : {}) });
      setDone({ sent: r.send.sent, at: r.send.at });
      notify.success(`Sent to ${inr(r.send.sent)} parent${r.send.sent === 1 ? "" : "s"}.`, { description: "Delivery updates come in over the next hour. Students aren't told." });
      await refresh();
    } catch (e) {
      const a = apiError(e);
      throw new Error(a.code === "NOTHING_TO_SEND" ? "Every confirmed parent here already has this result." : a.code === "SEND_IN_PROGRESS" ? "Another send for this test is still going. Try again in a minute." : a.code === "RESULTS_NOT_PUBLISHED" ? "Publish the results first." : `Nothing was sent. Try again (${supportCode("E-P", e)}).`);
    } finally {
      setSending(false);
    }
  };

  const testCopy = async () => {
    try {
      const r = await parentTestCopy(testId, { ...(p ? { studentId: p.student.id } : {}), note: note.trim() || null });
      notify.success(`Test copy sent to ${r.copy.emailMasked}`);
    } catch (e) {
      notify.error("The test copy couldn't be sent", { description: apiError(e).message });
    }
  };

  const top = <Topbar title="Send results to parents" back={{ href: `/tests/${encodeURIComponent(testId)}/result`, label: "Results" }} />;

  if (rec.isLoading)
    return (
      <>
        {top}
        <main className="col gap-4 px-7 pt-5 pb-10">
          <span className="skel block h-24 w-full" />
          <span className="skel block h-64 w-full" />
        </main>
      </>
    );
  if (rec.error || !d)
    return (
      <>
        {top}
        <main className="col gap-4 px-7 pt-5 pb-10" data-testid="parents-error">
          <section className="card">
            <StateBox tone="error" title="Couldn't load parent emails" body="Nothing was sent. Try again, or share this code with support:" code={supportCode("E-P", rec.error)} action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => rec.refetch()}>Try again</button>} />
          </section>
        </main>
      </>
    );
  if (d.blocked)
    return (
      <>
        {top}
        <main className="col gap-4 px-7 pt-5 pb-10" data-testid="parents-blocked">
          <section className="card">
            <StateBox
              title="Publish the results first"
              body={`Parents can't get a result before the student sees it.${d.blocked.publishesAt ? ` ${testName} publishes by itself on ${istDateTime(d.blocked.publishesAt)}. You can come back then, or publish now.` : ""}`}
              action={
                <Link href={`/tests/${encodeURIComponent(testId)}/result`} className="btn btn-secondary btn-sm">
                  Back to results
                </Link>
              }
            />
          </section>
        </main>
      </>
    );

  const noEmails = c && c.students > 0 && c.noEmail === c.students;
  return (
    <>
      {top}
      <main className="col gap-4 px-7 pt-5 pb-28" data-testid="parents-page">
        <div className="row between wrap gap-2">
          <span className="col">
            <span className="h2">{testName}</span>
            <span className="xs muted">
              {inr(c?.students ?? 0)} students with a result{d.batches.length ? ` · ${d.batches.map((b) => b.name).join(", ")}` : ""}
            </span>
          </span>
          {hist.data && hist.data.items.length > 0 && <a href="#sent-before" className="btn btn-ghost btn-sm">Sent before · {hist.data.items.length}</a>}
        </div>

        {done ? (
          <div className="k-bn round ok" role="status" data-testid="parents-done">
            <span className="t">
              <b>Sent to {inr(done.sent)} parents at {istDateTime(done.at)}.</b> Delivery updates come in over the next hour. Students aren&rsquo;t told; the email goes to the parent only.
            </span>
          </div>
        ) : (
          d.lastSend && (
            <div className="k-bn round info" role="status" data-testid="parents-last">
              <span className="t">
                Sent to {inr(d.lastSend.sent)} parents on {istDateTime(d.lastSend.at)} by {d.lastSend.by.name ?? "staff"}. Sending again goes only to the {inr(c?.willSend ?? 0)} parents added or confirmed since then; nobody gets it twice.
              </span>
            </div>
          )
        )}

        {noEmails ? (
          <section className="card">
            <StateBox
              title="No parent emails yet"
              body={`None of the ${inr(c!.students)} students here has a parent or guardian email. Students under 18 add one when they sign up; for the rest, add them on each student or import them from Excel.`}
              action={
                <Link href="/users?type=student" className="btn btn-secondary btn-sm">
                  Open students
                </Link>
              }
            />
          </section>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="col gap-4">
              {bounced.length > 0 && (
                <section className="card col" data-testid="parents-bounced">
                  <div className="pad row between wrap gap-2 border-b border-line-2">
                    <span className="col">
                      <span className="h3">Bounced · fix and resend</span>
                      <span className="xs muted">Resending goes to these {bounced.length} only. Fix the email on the student first.</span>
                    </span>
                    {canSend && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm("bounced")} disabled={sending}>
                        Resend to {bounced.length}
                      </button>
                    )}
                  </div>
                  <table className="table" aria-label="Bounced">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Parent email</th>
                        <th>Why</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {bounced.map((r) => (
                        <tr key={r.student.id}>
                          <td>{r.student.name}</td>
                          <td className="mono xs">{r.parent.emailMasked}</td>
                          <td className="xs">{why(r)}</td>
                          <td>
                            <Link className="btn btn-ghost btn-sm" href={`/users/${encodeURIComponent(r.student.id)}`}>
                              Fix email
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              <section ref={fillRef} className={`card ${fillH !== null ? "k-fill k-fill-panel" : "scrollx"}`} style={{ height: fillH ?? undefined, overflow: fillH !== null ? "hidden" : undefined }} data-testid="parents-list">
                <div className="pad col gap-2 border-b border-line-2">
                  <div className="row between wrap gap-2">
                    <span className="col">
                      <span className="h3">Who gets it</span>
                      <span className="xs muted">One email per parent, about their own child only</span>
                    </span>
                    <div className="row wrap gap-2">
                      <SearchBox value={q} onChange={setQ} placeholder="Search students" label="Search students" width={220} />
                      {d.batches.length > 1 && (
                        <FilterChip label="Batch" noun="batch" options={d.batches.map((b) => ({ value: b.id, label: b.name }))} value={batchIds[0] ?? null} onChange={(v) => setBatchIds(v ? [v] : [])} />
                      )}
                    </div>
                  </div>
                  {!!c?.noEmail && (
                    <span className="xs">
                      <b>{c.noEmail} students have no parent email.</b> They&rsquo;re 18 or older, or joined before sign-up asked for it. Add the email on the student, or import many at once.
                    </span>
                  )}
                  {!!c?.notConfirmed && (
                    <span className="xs">
                      <b>{c.notConfirmed} parents haven&rsquo;t confirmed yet.</b> These students are under 18; their parent got a confirmation link at sign-up and hasn&rsquo;t opened it. Results go only to confirmed parents.
                    </span>
                  )}
                </div>
                <div className="k-fill-body scrollx">
                  <table className="table" aria-label="Parents">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Parent or guardian</th>
                        <th className="num">Score</th>
                        <th className="num">Rank</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => {
                        const st = STATUS[statusOf(r)]!;
                        return (
                          <tr key={r.student.id} data-testid="parents-row" data-student={r.student.id} data-status={statusOf(r)}>
                            <td>
                              <span className="col">
                                <span>{r.student.name}</span>
                                <span className="xs muted">{r.student.batch?.name ?? ""}</span>
                              </span>
                            </td>
                            <td>
                              <span className="col">
                                <span>{r.parent.name ?? (r.parent.emailMasked ? "Parent" : "—")}</span>
                                <span className="xs muted mono">{r.parent.emailMasked ?? "No email"}</span>
                              </span>
                            </td>
                            <td className="num">
                              {r.score} / {r.maxScore}
                            </td>
                            <td className="num">
                              {r.rank} of {r.of}
                            </td>
                            <td>
                              <span className="col gap-0.5">
                                <span className={st.cls}>{st.label}</span>
                                <span className="xs muted">{why(r)}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {!shown.length && (
                        <tr>
                          <td colSpan={5} className="muted sm">
                            No students match.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="card pad-lg col gap-3" data-testid="parents-preview">
              <div className="row between gap-2">
                <span className="h3">Preview</span>
                {previewable.length > 1 && (
                  <span className="row gap-1">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPos((x) => Math.max(0, x - 1))} disabled={pos === 0}>
                      Previous
                    </button>
                    <span className="xs muted num">
                      {Math.min(pos + 1, previewable.length)} of {previewable.length}
                    </span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPos((x) => Math.min(previewable.length - 1, x + 1))} disabled={pos >= previewable.length - 1}>
                      Next
                    </button>
                  </span>
                )}
              </div>
              <label className="sm font-semibold" htmlFor="pr-note">
                Note from the institute <span className="muted font-normal">(optional)</span>
              </label>
              <textarea id="pr-note" className="input" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} data-testid="parents-note" />
              <span className="xs muted">
                {note.length} / 300 · Same note for every parent. Score, rank and marks fill in per student.
              </span>
              {p ? (
                <div className="col gap-2 rounded-control border border-line-2 p-3 sm">
                  <span className="xs muted">
                    To {p.parent.name ?? "Parent"} &lt;{p.parent.emailMasked}&gt;
                  </span>
                  <span className="xs">
                    <b>Subject</b> {p.student.name.split(" ")[0]}&rsquo;s result: {testName}
                  </span>
                  <span>Hello {p.parent.name ?? ""},</span>
                  <span>
                    <b>{p.student.name}</b> wrote <b>{testName}</b> at {institute} on {istDate(p.submittedAt)}. Here is the result.
                  </span>
                  <span className="col rounded-control bg-surface p-2">
                    <span className="xs muted">Score</span>
                    <span className="num text-[22px] font-semibold">
                      {p.score} <span className="sm font-normal muted">/ {p.maxScore}</span>
                    </span>
                    <span className="xs">
                      Rank {p.rank} of {p.of}
                      {p.student.batch ? ` in ${p.student.batch.name}` : ""}
                    </span>
                  </span>
                  <table className="table xs" aria-label="Subjects">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th className="num">{p.student.name.split(" ")[0]}</th>
                        <th className="num">Batch average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.subjects.map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td className="num">
                            {s.score} / {s.maxScore}
                          </td>
                          <td className="num">{s.batchAverage ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {note.trim() && (
                    <span className="col rounded-control bg-surface p-2">
                      <span className="xs muted">From {institute}</span>
                      <span>{note.trim()}</span>
                    </span>
                  )}
                  <span className="btn btn-primary btn-sm self-start" aria-hidden>
                    See {p.student.name.split(" ")[0]}&rsquo;s full report
                  </span>
                  <span className="xs muted">The report shows every question, {p.student.name.split(" ")[0]}&rsquo;s answer and the solution. The link works for {d.linkDays ?? 30} days and doesn&rsquo;t need a password.</span>
                  <span className="xs muted">
                    {institute} · You get this because {institute} has you as {p.student.name.split(" ")[0]}&rsquo;s parent or guardian. Stop result emails
                  </span>
                </div>
              ) : (
                <span className="sm muted">No confirmed parent to preview yet.</span>
              )}
              {canSend && p && (
                <button type="button" className="btn btn-ghost btn-sm self-start" onClick={testCopy} data-testid="parents-test-copy">
                  Send me a test copy
                </button>
              )}
            </aside>
          </div>
        )}

        {hist.data && hist.data.items.length > 0 && (
          <section id="sent-before" className="card scrollx" data-testid="parents-history">
            <div className="pad row between wrap gap-2 border-b border-line-2">
              <span className="col">
                <span className="h3">Sent before · {testName}</span>
                <span className="xs muted">Every send is also in the audit log</span>
              </span>
              <Link href="/audit-logs" className="btn btn-ghost btn-sm">
                Audit log
              </Link>
            </div>
            <table className="table" aria-label="Sent before">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Sent by</th>
                  <th>Who</th>
                  <th className="num">Sent</th>
                  <th className="num">Delivered</th>
                  <th className="num">Bounced</th>
                  <th className="num">Stopped</th>
                </tr>
              </thead>
              <tbody>
                {hist.data.items.map((h) => (
                  <tr key={h.id}>
                    <td>{istDateTime(h.at)}</td>
                    <td>{h.by.name ?? "staff"}</td>
                    <td className="xs">
                      {(h.batchIds ?? []).map((b) => d.batches.find((x) => x.id === b)?.name ?? b).join(", ")}
                      {h.note ? " · with a note" : ""}
                    </td>
                    <td className="num">{h.sent}</td>
                    <td className="num">{h.delivered + h.queued}</td>
                    <td className="num">{h.bounced + h.failed}</td>
                    <td className="num">{h.skipped.stopped ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <span className="pad xs muted">
              {hist.data.totals.sends} sends · {inr(hist.data.totals.parents)} parents emailed for this test
            </span>
          </section>
        )}
      </main>

      {!noEmails && canSend && (
        <div className="sticky bottom-0 z-10 row between wrap gap-2 border-t border-line-2 bg-surface px-7 py-3" data-testid="parents-bar">
          <span className="sm">
            <b>{inr(willSend.length)} parents selected</b>
            {skipText ? <span className="muted"> · {skipText}</span> : null}
          </span>
          <button type="button" className="btn btn-primary" onClick={() => setConfirm("all")} disabled={!willSend.length || sending} data-testid="parents-send">
            {sending ? "Sending…" : `Send to ${inr(willSend.length)} parents`}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone="navy"
        title={confirm === "bounced" ? `Resend to ${bounced.length} parents?` : `Send results to ${inr(willSend.length)} parents?`}
        description="Each parent gets one email about their own child: score, rank, subject marks, your note and a link to the report."
        facts={[
          ["Test", testName],
          ["Batches", (batchIds.length ? d.batches.filter((b) => batchIds.includes(b.id)) : d.batches).map((b) => b.name).join(", ")],
          ["Parents", `${inr(confirm === "bounced" ? bounced.length : willSend.length)}, by email`],
          ...(confirm === "all" && skipText ? [["Skipped", skipText] as [string, string]] : []),
          ["Report link", `Works for ${d.linkDays ?? 30} days, no password`],
          ["Undo", "Emails can't be taken back"],
        ]}
        confirmLabel={confirm === "bounced" ? `Resend to ${bounced.length} parents` : `Send to ${inr(willSend.length)} parents`}
        onConfirm={() => send(confirm ?? "all")}
      />
    </>
  );
}
