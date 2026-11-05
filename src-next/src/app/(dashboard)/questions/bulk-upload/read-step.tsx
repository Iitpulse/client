"use client";
/* Step 2 of Admin-BulkUpload: uploading (bytes), reading (AI progress, cancel), read failed (0 credits), AI paused. */
import * as React from "react";
import { Clock } from "lucide-react";
import { fmtBytes } from "@/components/kit/FileDrop";
import type { ParseJobV2 } from "@/lib/m6/import";

export interface FileInfo {
  name: string;
  size: number;
  kind: ParseJobV2["kind"];
}

export type ReadPhase = "uploading" | "reading" | "failed" | "paused";

const TILE: Record<ParseJobV2["kind"], { cls: string; label: string }> = {
  docx: { cls: "bu-ft-docx", label: "DOCX" },
  pdf: { cls: "bu-ft-pdf", label: "PDF" },
  xlsx: { cls: "bu-ft-xlsx", label: "XLSX" },
  image: { cls: "bu-ft-image", label: "IMG" },
  text: { cls: "bu-ft-text", label: "TXT" },
};
export const tileOf = (k: ParseJobV2["kind"]) => TILE[k] ?? TILE.text;

/** "Page 9 of 15 · 41 questions so far · about 30 s left" */
export function progressLine(job: ParseJobV2 | null, pct: number): string {
  const p = job?.progress;
  if (!p) return pct > 0 ? `${pct}% read` : "Starting…";
  const unit = p.unit === "page" ? "Page" : "Part";
  const parts = [`${unit} ${Math.min(p.done + (p.done < p.total ? 1 : 0), p.total)} of ${p.total}`];
  parts.push(p.questionsSoFar === 1 ? "1 question so far" : `${p.questionsSoFar} questions so far`);
  if (p.secondsLeft) parts.push(p.secondsLeft >= 90 ? `about ${Math.round(p.secondsLeft / 60)} min left` : `about ${p.secondsLeft} s left`);
  return parts.join(" · ");
}

export function ReadStep({
  phase,
  file,
  uploaded,
  pct,
  job,
  failure,
  onCancel,
  onRetry,
  onChoose,
  onBack,
  onTemplate,
}: {
  phase: ReadPhase;
  file: FileInfo;
  /** bytes sent while uploading */
  uploaded: number;
  /** 0–100 (upload or read) */
  pct: number;
  job: ParseJobV2 | null;
  failure: { code: string; message: string; creditsUsed: number | null } | null;
  onCancel: () => void;
  onRetry: () => void;
  onChoose: () => void;
  onBack: () => void;
  onTemplate: () => void;
}) {
  const t = tileOf(file.kind);
  const title = { uploading: "Uploading", reading: "Reading the paper", failed: "Couldn't read the file", paused: "Can't read papers right now" }[phase];
  return (
    <section className="card pad-lg col" style={{ gap: 14, maxWidth: 760 }} aria-busy={phase === "uploading" || phase === "reading" || undefined}>
      <span className="h3">{title}</span>
      {phase === "uploading" && (
        <div className="k-file">
          <span className={`ft ${t.cls}`}>{t.label}</span>
          <span className="meta">
            <span className="row between" style={{ gap: 8 }}>
              <span className="sm k-ell" style={{ fontWeight: 600 }}>
                {file.name}
              </span>
              <span className="xs muted num">{pct}%</span>
            </span>
            <span className="bar" style={{ height: 5 }}>
              <i style={{ width: `${pct}%`, animation: "none" }} />
            </span>
            <span className="xs muted num">
              {fmtBytes(uploaded)} of {fmtBytes(file.size)}
            </span>
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
      {phase === "reading" && (
        <>
          <div className="k-file">
            <span className={`ft ${t.cls}`}>{t.label}</span>
            <span className="meta">
              <span className="sm k-ell" style={{ fontWeight: 600 }}>
                {file.name}
              </span>
              <span className="xs muted">{file.size ? `${fmtBytes(file.size)} · uploaded` : "uploaded"}</span>
            </span>
          </div>
          <div className="k-file bu-file-ai" style={{ borderRadius: 10 }}>
            <span className="ft bu-ft-ai">AI</span>
            <span className="meta">
              <span className="ai-mark" style={{ fontSize: 11 }}>
                Reading questions
              </span>
              <span className="bar" style={{ height: 5 }}>
                <i style={{ width: `${Math.max(4, pct)}%`, animation: pct ? "none" : undefined, transition: "width 400ms" }} />
              </span>
              <span className="xs muted num" aria-live="polite">
                {progressLine(job, pct)}
              </span>
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
          </div>
          <span className="xs muted">You can leave this page. We keep reading and show it under Import in the bank.</span>
        </>
      )}
      {phase === "failed" && failure && (
        <>
          <div className="k-file bad" role="alert">
            <span className="ft bu-ft-pdf">{t.label}</span>
            <span className="meta">
              <span className="sm k-ell" style={{ fontWeight: 600 }}>
                {file.name}
              </span>
              <span className="xs" style={{ color: "#7A1010" }}>
                {failure.code === "READ_FAILED"
                  ? `Couldn't read this file. ${failure.message && !/^the paper could not be read/i.test(failure.message) ? failure.message : "The pages look like blurry photos."} Upload the Word file if you have it, or a clearer scan.`
                  : failure.message}
              </span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
              Try again
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onChoose}>
              Choose another
            </button>
          </div>
          {(failure.code === "READ_FAILED" || failure.creditsUsed === 0) && <span className="xs muted">No credits were used for this file.</span>}
        </>
      )}
      {phase === "paused" && (
        <div className="bu-note" role="status">
          <Clock className="size-4" style={{ color: "var(--navy)" }} aria-hidden />
          <span className="col grow" style={{ gap: 2 }}>
            <span className="sm" style={{ fontWeight: 600 }}>
              AI is paused for your institute, so papers can&apos;t be read right now.
            </span>
            <span className="sm">The Excel template still works: it&apos;s read without AI.</span>
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onTemplate}>
            Download template
          </button>
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back to upload
        </button>
      </div>
    </section>
  );
}
