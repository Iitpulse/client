"use client";
/*
  "Fill by rule" (board Admin-QuestionPicker state fill-by-rule): chapters, difficulty mix and three switches propose
  questions for the empty slots only (POST …/picker/fill-preview, deterministic for its seed); Swap replaces one
  proposal; shortfalls are listed; "Fill N slots" commits through the sub-section PUT (the picked ones stay).
*/
import { useEffect, useMemo, useState } from "react";
import { Checkbox, Field, InlineNote, MultiSelect, NumberStepper, useDebounced } from "@/components/kit";
import type { Difficulty, FillPreviewResponse, Ref } from "@/lib/m6-contract";
import { apiError } from "@/lib/m6/client";
import { fillPreview } from "@/lib/m6/paper";
import { DIFF_LABEL, shortId, Stem, type PaperSub } from "./parts";

export function FillByRule({
  testId,
  sub,
  start,
  title,
  chapters,
  initialChapterId,
  locked,
  onCancel,
  onCommit,
}: {
  testId: string;
  sub: PaperSub;
  start: number;
  title: string;
  chapters: Ref[];
  initialChapterId: string | null;
  locked: boolean;
  onCancel: () => void;
  onCommit: (questionIds: string[]) => Promise<void>;
}) {
  const per = sub.type === "paragraph" ? sub.paragraph?.setSize ?? 1 : 1;
  const slotsLeft = Math.max(0, sub.need - sub.have);
  const units = Math.floor(slotsLeft / per);
  const unit = per > 1 ? "sets" : "slots";
  const [chapterIds, setChapterIds] = useState<string[]>(initialChapterId ? [initialChapterId] : []);
  const [mix, setMix] = useState<Record<Difficulty, number>>(() => {
    const m = Math.ceil(units / 2);
    return { easy: 0, medium: m, hard: units - m };
  });
  const [skipRecent, setSkipRecent] = useState(true);
  const [onlyWithSolution, setOnlyWithSolution] = useState(true);
  const [onlyWithHindi, setOnlyWithHindi] = useState(false);
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [res, setRes] = useState<FillPreviewResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const mixSum = mix.easy + mix.medium + mix.hard;
  const req = useDebounced(JSON.stringify({ chapterIds, mix, skipRecent, onlyWithSolution, onlyWithHindi }), 300);

  const run = async (extra: { swapOut?: string; proposed?: string[] } = {}) => {
    if (!units) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fillPreview(testId, { subsectionId: sub.id, chapterIds, mix, skipRecent, onlyWithSolution, onlyWithHindi, seed, ...extra });
      setRes(r);
    } catch (e) {
      setErr(apiError(e).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req, sub.id, units]);

  const chapterName = useMemo(() => new Map(chapters.map((c) => [c.id, c.name])), [chapters]);
  const proposed = res?.proposed ?? [];

  if (!units)
    return (
      <section className="card pad-lg col gap-2">
        <span className="h3">{title} is full</span>
        <span className="sm muted">Fill by rule only fills empty slots. Remove questions from the list on the right to make room.</span>
        <div className="row justify-end">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Pick by hand
          </button>
        </div>
      </section>
    );

  return (
    <section className="card pad-lg col gap-3.5" aria-label="Fill by rule">
      <div className="col gap-0.5">
        <span className="h3">
          Fill {units} {units === 1 ? unit.slice(0, -1) : unit} in {title}
        </span>
        <span className="sm muted">Only empty slots are filled. Questions you picked stay.</span>
      </div>
      <div className="qp-grid2">
        <Field
          label="Chapters"
          htmlFor="fr-ch"
          optional
          hint={res ? `${res.matching.toLocaleString("en-IN")} matching ${per > 1 ? "sets" : "questions"}${skipRecent ? " not in the last 4 tests" : ""}.` : undefined}
        >
          <MultiSelect id="fr-ch" noun="chapter" placeholder="Any chapter" options={chapters.map((c) => ({ value: c.id, label: c.name }))} value={chapterIds} onChange={setChapterIds} />
        </Field>
        <Field label="Difficulty mix" group error={mixSum > units ? `That's ${mixSum}; only ${units} empty ${unit} are left.` : undefined} hint={mixSum > units ? undefined : `Adds up to ${Math.min(mixSum, units)} of ${units} empty ${unit}.`}>
          <div className="row wrap gap-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <span key={d} className="col gap-0.5">
                <span className="xs muted">{DIFF_LABEL[d]}</span>
                <NumberStepper width={104} value={mix[d]} min={0} max={units} aria-label={DIFF_LABEL[d]} invalid={mixSum > units} onChange={(n) => setMix((m) => ({ ...m, [d]: n ?? 0 }))} />
              </span>
            ))}
          </div>
        </Field>
      </div>
      <div className="row wrap gap-[18px]">
        <Checkbox checked={skipRecent} onChange={setSkipRecent}>
          Skip questions used in the last 4 tests
        </Checkbox>
        <Checkbox checked={onlyWithSolution} onChange={setOnlyWithSolution}>
          Only questions with a solution
        </Checkbox>
        <Checkbox checked={onlyWithHindi} onChange={setOnlyWithHindi}>
          Only questions with Hindi
        </Checkbox>
      </div>

      <div className="col gap-1.5 border-t border-[#EEF0F5] pt-3" aria-busy={loading}>
        {err && (
          <InlineNote tone="warn">
            Couldn&apos;t work out a proposal. {err}{" "}
            <button type="button" className="k-linkbtn" onClick={() => run()}>
              Try again
            </button>
          </InlineNote>
        )}
        {!err && (
          <span className="xs font-semibold">
            {loading && !res ? "Finding questions…" : proposed.length ? `These ${proposed.length} would go in` : "Nothing matches these rules"}
          </span>
        )}
        {proposed.map((p, i) => (
          <div key={p.questionId} className="qp-pk">
            <span className="no">{start + i * per}</span>
            <span className="mono xs muted">{shortId(p.questionId)}</span>
            <Stem text={p.stemPreview} className="qp-ell grow font-serif" />
            {p.set && <span className="badge b-navy">{p.set.count} questions</span>}
            {p.flags.needsLatex > 0 && <span className="badge b-amber">Image</span>}
            <span className="badge b-grey">{DIFF_LABEL[p.difficulty ?? "unset"]}</span>
            <button type="button" className="btn btn-ghost btn-sm" disabled={loading || locked} onClick={() => run({ swapOut: p.questionId, proposed: proposed.map((x) => x.questionId) })}>
              Swap
            </button>
          </div>
        ))}
        {(res?.shortfalls ?? []).map((s, i) => (
          <InlineNote key={i} tone="warn">
            Wanted {s.wanted}
            {s.difficulty ? ` ${s.difficulty}` : ""} {s.chapter ? `from ${s.chapter}` : ""}; only {s.available} {s.available === 1 ? "matches" : "match"}. Add chapters or turn a switch off.
          </InlineNote>
        ))}
      </div>
      <div className="row justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!proposed.length || saving || locked || mixSum > units}
          onClick={async () => {
            setSaving(true);
            try {
              await onCommit(proposed.map((p) => p.questionId));
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Filling…" : `Fill ${proposed.length} ${proposed.length === 1 ? unit.slice(0, -1) : unit}`}
        </button>
      </div>
    </section>
  );
}
