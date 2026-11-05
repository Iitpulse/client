"use client";
/*
  Small pieces of the QuestionPicker page: row ids, the preview pane and paper helpers.
*/
import { MathText } from "@iitpulse/ui";
import { QuestionBody } from "@/components/question-body";
import type { BankChild, BankQuestion } from "@/lib/question-queries";
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

function toBank(q: PickerPreview["question"], rowType?: string): BankQuestion {
  const type = q.type ?? rowType ?? "single";
  q = { ...q, type: type as PickerPreview["question"]["type"] };
  const kind = q.type === "paragraph" ? "paragraph" : q.type === "matrix" ? "matrix" : q.type === "integer" ? "numerical" : "mcq";
  return {
    _id: q.id,
    type: q.type,
    _kind: kind,
    en: q.en,
    hi: q.hi ?? undefined,
    correctAnswers: q.correctAnswers,
    correctAnswer: q.correctAnswer,
    passage: q.passage ? { en: q.passage.en, hi: q.passage.hi } : undefined,
    questions: q.questions as BankChild[] | undefined,
    matrix: q.matrix,
  } as BankQuestion;
}

/** The board's preview strip under the table: "Preview · QS_44e1", question with its key (KaTeX). */
export function PreviewPane({ testId, questionId, type, hint }: { testId: string; questionId: string | null; type?: string; hint: string }) {
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
          <QuestionBody q={toBank(q, type)} showAnswers variant="pane" />
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
