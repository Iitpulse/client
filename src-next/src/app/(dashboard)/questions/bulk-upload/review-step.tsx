"use client";
/* Step 3 of Admin-BulkUpload: what was read, what needs a look, duplicates, the source tag and Import. */
import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { MathText } from "@iitpulse/ui";
import { Segmented } from "@/components/kit/Segmented";
import { Combobox } from "@/components/kit/Combobox";
import { fmtBytes } from "@/components/kit/FileDrop";
import type { ISubject } from "@/types";
import { answerLabel, BADGE, importable, needsLook, rowCheck, subjectLabel, type ReviewRow } from "./rows";
import { tileOf, type FileInfo } from "./read-step";

export type ReviewTab = "look" | "dup" | "all";
const PAGE = 25;

export function ReviewStep({
  file,
  rows,
  subjects,
  readSeconds,
  modelUsed,
  tab,
  onTab,
  page,
  onPage,
  sourceTag,
  sourceOptions,
  onSourceTag,
  onOpen,
  onForce,
  onCompare,
  onReplace,
  onImport,
}: {
  file: FileInfo;
  rows: ReviewRow[];
  subjects: ISubject[];
  readSeconds: number | null;
  modelUsed: boolean;
  tab: ReviewTab;
  onTab: (t: ReviewTab) => void;
  page: number;
  onPage: (p: number) => void;
  sourceTag: string | null;
  sourceOptions: string[];
  onSourceTag: (v: string | null) => void;
  onOpen: (id: string) => void;
  onForce: (id: string, on: boolean) => void;
  onCompare: (id: string) => void;
  onReplace: () => void;
  onImport: () => void;
}) {
  const total = rows.length;
  const look = rows.filter(needsLook);
  const dups = rows.filter((r) => !!r.dup && !r.skipped);
  const dupSkipped = dups.filter((r) => !r.forced);
  const ready = rows.filter(importable).length;
  const skip = total - ready;
  const subjectsFound = [...new Set(rows.map((r) => subjectLabel(r.data, subjects)).filter((s) => s && s !== "—"))];

  const order = (a: ReviewRow, b: ReviewRow) => {
    const w = (r: ReviewRow) => (rowCheck(r).tone === "bad" ? 0 : 1);
    return w(a) - w(b) || a.n - b.n;
  };
  const visible = tab === "look" ? [...look].sort(order) : tab === "dup" ? dups : rows;
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const p = Math.min(page, pages - 1);
  const shown = visible.slice(p * PAGE, p * PAGE + PAGE);
  const t = tileOf(file.kind);
  const foundLine = [file.size ? fmtBytes(file.size) : null, total === 1 ? "1 question found" : `${total} questions found`, subjectsFound.length ? subjectsFound.join(", ") : null].filter(Boolean).join(" · ");
  const options = React.useMemo(() => [...new Set([...(sourceTag ? [sourceTag] : []), ...sourceOptions])].map((s) => ({ value: s, label: s })), [sourceOptions, sourceTag]);

  return (
    <>
      <section className="bu-grid3">
        <div className="k-file col rise" style={{ alignItems: "stretch", padding: 16, gap: 10 }}>
          <div className="row" style={{ gap: 12 }}>
            <span className={`bu-file-tile ${t.cls}`}>{t.label}</span>
            <span className="col grow" style={{ gap: 2, minWidth: 0 }}>
              <span className="sm k-ell" style={{ fontWeight: 600 }}>
                {file.name}
              </span>
              <span className="xs muted">{foundLine}</span>
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onReplace}>
              Replace
            </button>
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="row between xs">
              <span style={{ fontWeight: 600 }}>{modelUsed ? (readSeconds ? `Read with AI in ${readSeconds} s` : "Read with AI") : "Read without AI · no credits used"}</span>
              <span className="muted">
                {total} of {total}
              </span>
            </div>
            <div className="bar" style={{ height: 6 }}>
              <i style={{ width: "100%", background: "#0E7A3D", animation: "none" }} />
            </div>
          </div>
        </div>
        <div className="card pad col rise" style={{ gap: 8, ["--i" as string]: 1 }}>
          <span className="sm muted">Ready to import</span>
          <span className="num" style={{ fontSize: 28, fontWeight: 650, letterSpacing: "-.01em" }}>
            {ready}
            <span className="sm muted"> of {total}</span>
          </span>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className={`badge ${look.length ? "b-amber" : "b-green"}`}>{look.length ? `${look.length} need a look` : "All checked"}</span>
            <span className={`badge ${dupSkipped.length ? "b-amber" : "b-grey"}`}>{dupSkipped.length ? `${dupSkipped.length} duplicate${dupSkipped.length === 1 ? "" : "s"} · skipped` : `${dups.length} duplicates`}</span>
          </div>
        </div>
      </section>

      {dupSkipped.length > 0 && (
        <div className="bu-note warn">
          <AlertTriangle className="size-4" aria-hidden />
          <span className="sm grow">
            <b>
              {dupSkipped.length === 1 ? "1 question is" : `${dupSkipped.length} questions are`} already in the bank.
            </b>{" "}
            They&apos;re skipped unless you choose Import anyway on the row.
          </span>
        </div>
      )}

      <section className="card rise" style={{ ["--i" as string]: 2, overflow: "hidden" }}>
        <div className="row between wrap pad" style={{ gap: 10, borderBottom: "1px solid var(--line-2)" }}>
          <Segmented
            ariaLabel="Rows"
            value={tab}
            onChange={(v) => {
              onTab(v);
              onPage(0);
            }}
            options={[
              { value: "look", label: "Needs a look", count: look.length },
              { value: "dup", label: "Duplicates", count: dups.length },
              { value: "all", label: "All", count: total },
            ]}
          />
          <span className="xs muted">{tab === "look" ? "Unread and missing answers first, then the rest in paper order" : "In paper order"}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="bu-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Question</th>
                <th>Subject</th>
                <th>Answer</th>
                <th>Check</th>
                <th>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="sm muted" style={{ textAlign: "center", padding: "28px 14px" }}>
                    {tab === "look" ? "Nothing needs a look. Every row is ready or skipped." : tab === "dup" ? "No duplicates of questions in the bank." : "No rows."}
                  </td>
                </tr>
              )}
              {shown.map((r) => {
                const c = rowCheck(r);
                const ans = answerLabel(r.data);
                return (
                  <tr key={r.data.id} className={c.tone === "warn" ? "warn" : c.tone === "bad" ? "bad" : ""}>
                    <td className="mono sm">{r.n}</td>
                    <td className="sm">
                      <MathText as="div" className="bu-q math" html text={r.data.type === "paragraph" ? r.data.passage?.en ?? "" : r.data.en?.question ?? ""} />
                    </td>
                    <td className="sm">{subjectLabel(r.data, subjects)}</td>
                    <td className="mono sm" style={ans === "—" ? { color: "var(--red-600)" } : undefined}>
                      {ans}
                    </td>
                    <td>
                      {c.tone === "dup" || c.tone === "skip" ? (
                        <span className="col" style={{ gap: 2 }}>
                          <span className={`badge ${BADGE[c.tone]}`}>{c.label}</span>
                          <span className="xs muted">Skipped</span>
                        </span>
                      ) : (
                        <span className={`badge ${BADGE[c.tone]}`}>{c.label}</span>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {c.tone === "dup" ? (
                        <span className="row" style={{ gap: 4 }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCompare(r.data.id)}>
                            Compare
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onForce(r.data.id, true)}>
                            Import anyway
                          </button>
                        </span>
                      ) : r.dup && r.forced ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onForce(r.data.id, false)}>
                          Skip again
                        </button>
                      ) : (
                        <button type="button" className={`btn btn-sm ${c.tone === "bad" || c.tone === "warn" ? "btn-secondary" : "btn-ghost"}`} onClick={() => onOpen(r.data.id)}>
                          {c.action}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="row between" style={{ padding: "12px 16px" }}>
          <span className="xs muted">
            {visible.length ? `Showing ${p * PAGE + 1}–${Math.min(visible.length, (p + 1) * PAGE)} of ${visible.length}` : "Showing 0"}
            {tab !== "all" ? ` · ${total} in the file` : ""}
          </span>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-secondary btn-sm" disabled={p === 0} onClick={() => onPage(p - 1)}>
              Previous
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={p >= pages - 1} onClick={() => onPage(p + 1)}>
              Next
            </button>
          </div>
        </div>
      </section>

      <div className="bu-foot">
        <div className="row wrap" style={{ gap: 10 }}>
          <label className="label" htmlFor="bu-src" style={{ margin: 0 }}>
            Source tag <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
          </label>
          <div style={{ width: 320, maxWidth: "100%" }}>
            <Combobox
              id="bu-src"
              value={sourceTag}
              onChange={(v) => onSourceTag(v)}
              options={options}
              placeholder="Book, paper or your own set"
              clearable
              noun="source"
              creatable={{ label: (q) => `Use "${q}"`, onCreate: (q) => onSourceTag(q.trim() || null) }}
            />
          </div>
          <span className="xs muted">Added to every question</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost" disabled={!look.length} onClick={() => look.length && onOpen([...look].sort(order)[0].data.id)}>
            {look.length ? `Fix ${look.length} to import ${total - dupSkipped.length - rows.filter((r) => r.skipped).length}` : "All rows checked"}
          </button>
          <button type="button" className="btn btn-primary" disabled={!ready} onClick={onImport}>
            {`Import ${ready}${skip ? `, skip ${skip}` : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}

export function ImportingCard({ total, done }: { total: number; done: number }) {
  return (
    <section className="card pad-lg col" style={{ gap: 12, maxWidth: 640 }} aria-busy="true">
      <span className="h3">Saving {total === 1 ? "1 question" : `${total} questions`} to the bank</span>
      <div className="col" style={{ gap: 6 }}>
        <div className="row between xs">
          <span style={{ fontWeight: 600 }}>
            {done} of {total}
          </span>
          <span className="muted">a few seconds</span>
        </div>
        <div className="bar" style={{ height: 6 }}>
          <i style={{ width: `${Math.round((done / Math.max(1, total)) * 100)}%`, animation: "none", transition: "width 300ms" }} />
        </div>
      </div>
      <span className="xs muted">Keep this page open until it&apos;s done.</span>
    </section>
  );
}

