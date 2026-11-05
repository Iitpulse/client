"use client";
/*
  Small pieces of the QuestionPicker page: row ids, the preview pane and paper helpers.
*/
import { MathText } from "@iitpulse/ui";
import type { PaperView, PickerPreview } from "@/lib/m6-contract";
import { usePickerPreview } from "@/lib/m6/paper";

export type PaperSub = PaperView["sections"][number]["subsections"][number];
export type PaperSection = PaperView["sections"][number];

/** "QS_c865" for a bank id, "S·single-12" for a sample row. */
export function shortId(id: string): string {
  const m = /^([A-Z]{2})_([0-9a-f]{4})/i.exec(id);
  if (m) return `${m[1]}_${m[2]}`;
  if (id.startsWith("sample-")) {
    const parts = id.split("-");
    return `${parts[1].toUpperCase()}_${parts.slice(-2).join("")}`.slice(0, 12);
  }
  return id.length > 12 ? id.slice(0, 12) : id;
}

export function Stem({ text, className = "qp-stem" }: { text: string; className?: string }) {
  return <MathText html as="span" className={className} text={text} />;
}

const KEY = (i: number) => String.fromCharCode(65 + i);
const M = ({ html, className = "" }: { html: string; className?: string }) => (
  <MathText html as="span" className={`min-w-0 [&_img]:max-w-full [&_p]:inline [&_p]:m-0 ${className}`} text={html || ""} />
);

/** Answer label: "B", "A, C", "5.2–5.4" */
function keyLabel(options: Array<{ id: string }> | undefined, correct?: string[], range?: { from: number; to: number }): string {
  if (range) return range.to !== range.from ? `${range.from}–${range.to}` : String(range.from);
  const ids = correct ?? [];
  return ids.map((id) => {
    const i = (options ?? []).findIndex((o) => o.id === id);
    return i >= 0 ? KEY(i) : id;
  }).join(", ");
}

/** The picked question as the board's preview: stem with options (key ✓), a paragraph set one line per child, a matrix's lists and key. KaTeX. */
function PreviewBody({ q }: { q: PickerPreview["question"] }) {
  const stem = "block font-serif text-[15px] leading-[1.55]";
  if (q.passage || q.questions?.length)
    return (
      <div className="col gap-2">
        <M html={q.passage?.en ?? ""} className={stem} />
        <div className="col gap-1 text-[13px]">
          {(q.questions ?? []).map((c, i) => (
            <span key={c.id} className="row items-baseline gap-1.5">
              <b>Q{i + 1}</b> ·<span className="muted">{c.type === "integer" ? "Numerical" : c.type === "multiple" ? "Multiple" : "Single"}</span> ·
              <M html={c.en.question} className="font-serif" />
              <span className="badge b-green ml-auto shrink-0">Answer {keyLabel(c.en.options, c.correctAnswers, c.correctAnswer) || "not set"}</span>
            </span>
          ))}
        </div>
      </div>
    );
  if (q.matrix)
    return (
      <div className="col gap-2">
        <M html={q.en.question} className={stem} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
          <span className="xs font-semibold text-muted">List I</span>
          <span className="xs font-semibold text-muted">List II</span>
          {Array.from({ length: Math.max(q.matrix.listI.length, q.matrix.listII.length) }, (_, i) => (
            <span key={i} className="contents">
              <span className="row items-baseline gap-1.5">{q.matrix!.listI[i] && <><b className="mono">{q.matrix!.listI[i].id}</b><M html={q.matrix!.listI[i].en} className="font-serif" /></>}</span>
              <span className="row items-baseline gap-1.5">{q.matrix!.listII[i] && <><b className="mono">{q.matrix!.listII[i].id}</b><M html={q.matrix!.listII[i].en} className="font-serif" /></>}</span>
            </span>
          ))}
        </div>
        <span className="xs font-semibold text-success">Key: {q.matrix.listI.map((r) => `${r.id}→${(q.matrix!.matches[r.id] ?? []).join(", ") || "?"}`).join(" · ")}</span>
      </div>
    );
  const opts = q.en.options ?? [];
  return (
    <div className="col gap-2">
      <M html={q.en.question} className={stem} />
      {opts.length > 0 && (
        <div className="row wrap gap-x-[22px] gap-y-1 font-serif text-[15px]">
          {opts.map((o, i) => (
            <span key={o.id} className={`row items-baseline gap-1 ${q.correctAnswers?.includes(o.id) ? "font-semibold text-success" : ""}`}>
              ({KEY(i)}) <M html={o.value} />
              {q.correctAnswers?.includes(o.id) && " ✓"}
            </span>
          ))}
        </div>
      )}
      {q.correctAnswer && <span className="badge b-green self-start">Answer {keyLabel(undefined, undefined, q.correctAnswer)}</span>}
    </div>
  );
}

/** The board's preview strip under the table: "Preview · QS_44e1", question with its key (KaTeX). */
export function PreviewPane({ testId, questionId, hint }: { testId: string; questionId: string | null; type?: string; hint: string }) {
  const pv = usePickerPreview(testId, questionId);
  if (!questionId) return null;
  const q = pv.data?.question;
  return (
    <div className="col gap-2 border-t border-[#EEF0F5] bg-[#FAFBFD] px-4 py-3.5" aria-live="polite">
      <div className="row between gap-2">
        <span className="xs font-semibold">Preview · {shortId(questionId)}</span>
        <span className="xs muted hide-sm">{hint}</span>
      </div>
      {pv.isLoading && (
        <div className="col gap-2">
          <span className="skel block h-3 w-4/5" />
          <span className="skel block h-3 w-3/5" />
        </div>
      )}
      {pv.isError && <span className="sm muted">Couldn&apos;t load this question. Pick it again to retry.</span>}
      {q && (
        <div className="max-h-[360px] overflow-y-auto">
          {q.type === "matrix" && q.matrix && (
            <span className="xs muted mb-1 block">
              {q.matrix.listI.length} rows × {q.matrix.listII.length} columns
            </span>
          )}
          <PreviewBody q={q} />
        </div>
      )}
    </div>
  );
}

export const DIFF_LABEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard", unset: "Not set" };

/** "Mix: 5 easy · 9 medium · 4 hard" (sets: "Mix: 1 hard set"). */
export function mixLabel(sub: PaperSub): string {
  const parts = (["easy", "medium", "hard", "unset"] as const)
    .filter((k) => sub.mix[k] > 0)
    .map((k) => `${sub.mix[k]} ${k === "unset" ? "without difficulty" : k}`);
  if (!parts.length) return "Nothing picked yet";
  const sets = sub.type === "paragraph";
  const n = Object.values(sub.mix).reduce((a, b) => a + b, 0);
  return `Mix: ${parts.join(" · ")}${sets ? (n === 1 ? " set" : " sets") : ""}`;
}
