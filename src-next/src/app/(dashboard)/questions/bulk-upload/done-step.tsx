"use client";
/* Step 4 of Admin-BulkUpload: what was added, what was skipped, and what to do next. */
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { ImportConfirmResponseV2 } from "@/lib/m6-contract";

const fmt = (n: number) => n.toLocaleString("en-IN");

export function DoneStep({
  result,
  sourceTag,
  skippedDup,
  skippedNoAnswer,
  skippedOther,
  onRestart,
}: {
  result: ImportConfirmResponseV2;
  sourceTag: string | null;
  skippedDup: number;
  skippedNoAnswer: number;
  skippedOther: number;
  onRestart: () => void;
}) {
  const by = result.bySubject.map((s) => `${s.subject} ${fmt(s.count)}`).join(", ");
  const line = [sourceTag ? `Tagged "${sourceTag}"` : null, by || null].filter(Boolean).join(" · ");
  const n = result.created;
  return (
    <section className="card pad-lg col" style={{ gap: 16, maxWidth: 860 }}>
      <div className="row" style={{ gap: 12 }}>
        <span className="bu-done-ico">
          <Check className="size-5" strokeWidth={2.4} aria-hidden />
        </span>
        <span className="col" style={{ gap: 2 }}>
          <h2 className="h3" style={{ margin: 0 }}>
            {n === 1 ? "1 question added to the bank" : `${fmt(n)} questions added to the bank`}
          </h2>
          {line && <span className="sm muted">{line}</span>}
        </span>
      </div>
      <div className="row wrap" style={{ gap: 10 }}>
        <div className="bu-stat">
          <span className="xs muted">Added</span>
          <b>{fmt(n)}</b>
        </div>
        <div className="bu-stat">
          <span className="xs muted">Skipped as duplicates</span>
          <b>{fmt(skippedDup)}</b>
        </div>
        <div className="bu-stat">
          <span className="xs muted">Skipped, no answer</span>
          <b>{fmt(skippedNoAnswer)}</b>
        </div>
        {skippedOther > 0 && (
          <div className="bu-stat">
            <span className="xs muted">Skipped, not checked</span>
            <b>{fmt(skippedOther)}</b>
          </div>
        )}
        <div className="bu-stat">
          <span className="xs muted">Without Hindi</span>
          <b>{fmt(result.withoutHindi)}</b>
        </div>
      </div>
      {n > 0 && (
        <div className="bu-note">
          <Sparkles className="size-4" style={{ color: "var(--navy)" }} aria-hidden />
          <span className="sm grow">Next: draft solutions and Hindi for {n === 1 ? "this question" : `these ${fmt(n)}`} with AI. You check every draft before it&apos;s saved.</span>
          <Link href="/questions/drafts" className="btn btn-secondary btn-sm">
            Start AI drafts
          </Link>
        </div>
      )}
      <div className="row wrap" style={{ gap: 8 }}>
        <Link href="/questions" className="btn btn-primary">
          See them in the bank
        </Link>
        <Link href="/tests/new" className="btn btn-secondary">
          Make a test from them
        </Link>
        <button type="button" className="btn btn-ghost" onClick={onRestart}>
          Import another file
        </button>
      </div>
    </section>
  );
}
