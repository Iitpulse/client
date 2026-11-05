"use client";
/*
  Row-fix drawer (Admin-BulkUpload "row-fix"): one flagged row at a time, with the kit LaTeX field for the question,
  options and solution, the answer, subject / chapter, type and difficulty. Paragraph rows open with the passage and
  their questions, matrix rows with List I / List II and the match grid, as in the editor. "Save and next" marks the
  row checked and moves to the next one that needs a look; "Skip this row" leaves it out of the import.
*/
import * as React from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp, CircleAlert } from "lucide-react";
import { Drawer } from "@/components/kit/Overlay";
import { Combobox } from "@/components/kit/Combobox";
import { Segmented } from "@/components/kit/Segmented";
import { MathField } from "@/components/kit/math-field";
import { isBlankHtml, issueText, latexIssues } from "@/lib/latex-source";
import { uploadMedia } from "@/lib/m6/questions";
import type { ChildType, Difficulty, ParagraphChild } from "@/lib/m6-contract";
import type { ImportRowData } from "@/lib/m6/import";
import type { ISubject } from "@/types";
import { hasAnswer, hasTaxonomy, rowCheck, type ReviewRow } from "./rows";
import { chapterOptions, DIFFICULTIES } from "./upload-step";

const KEY = (i: number) => String.fromCharCode(65 + i);
const upload = (file: File, onProgress: (p: number) => void, signal: AbortSignal) => uploadMedia(file, onProgress, signal);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function noteFor(r: ReviewRow): { tone: "err" | "warn"; text: string } | null {
  const q = r.data;
  if (r.serverError) return { tone: "err", text: `The bank refused this row: ${r.serverError}` };
  if (r.invalid) return { tone: "err", text: `The reader couldn't make this question whole (${r.invalid}). Check it against the paper.` };
  if (!hasAnswer(q)) return { tone: "err", text: "The answer key in the file had nothing for this question. Pick the answer to import it." };
  if (q.flags.includes("DIAGRAM_WMF")) return { tone: "warn", text: "A diagram in this question was a WMF picture, which browsers can't show. Upload it as PNG with the picture button." };
  if (q.flags.includes("EQUATION_WAS_IMAGE")) return { tone: "warn", text: "An equation in the file was a picture. It's kept, marked \"needs LaTeX\": type it as LaTeX here, or convert it with AI in the editor after import." };
  if (q.flags.includes("PARTIAL")) return { tone: "warn", text: "This question may be cut off at a page break. Check the text is complete." };
  if (q.flags.includes("LOW_CONFIDENCE")) return { tone: "warn", text: "The AI wasn't sure it read this question right. Check it against the paper." };
  if (!hasTaxonomy(q)) return { tone: "warn", text: "Pick the subject and chapter this question belongs to." };
  return null;
}

/** Problems that keep "Save and next" from marking the row checked. */
function problemsOf(q: ImportRowData): string[] {
  const out: string[] = [];
  const fields: Array<[string, string | undefined | null]> = [];
  if (q.type === "paragraph") {
    if (isBlankHtml(q.passage?.en)) out.push("Write the passage");
    fields.push(["Passage", q.passage?.en]);
    (q.questions ?? []).forEach((c, i) => {
      if (isBlankHtml(c.en.question)) out.push(`Write Q${i + 1}`);
      fields.push([`Q${i + 1}`, c.en.question]);
      (c.en.options ?? []).forEach((o, j) => fields.push([`Q${i + 1} option ${KEY(j)}`, o.value]));
    });
    if (!q.questions?.length) out.push("A passage needs at least one question");
  } else {
    if (isBlankHtml(q.en.question)) out.push("Write the question");
    fields.push(["Question", q.en.question], ["Solution", q.en.solution]);
    (q.en.options ?? []).forEach((o, j) => fields.push([`Option ${KEY(j)}`, o.value]));
    if ((q.type === "single" || q.type === "multiple") && (q.en.options ?? []).filter((o) => !isBlankHtml(o.value)).length < 2) out.push("Write at least two options");
    if (q.type === "matrix") (["listI", "listII"] as const).forEach((l) => (q.matrix?.[l] ?? []).forEach((row) => fields.push([`${l === "listI" ? "List I" : "List II"} ${row.id}`, row.en])));
  }
  if (!hasAnswer(q)) out.push(q.type === "matrix" ? "Tick at least one match in every row" : q.type === "integer" ? "Type the answer" : q.type === "paragraph" ? "Every question on the passage needs an answer" : "Pick the correct option");
  if (q.type === "integer" && q.correctAnswer && q.correctAnswer.to < q.correctAnswer.from) out.push("To must be more than From");
  if (!q.subjectId) out.push("Pick a subject");
  if (!q.chapterIds?.length) out.push("Pick a chapter");
  for (const [label, html] of fields) {
    const iss = html ? latexIssues(html) : [];
    if (iss.length) out.push(`${label}: ${issueText(iss[0]).replace(/ Save is off until it's fixed\.$/, "")}`);
  }
  return out;
}

function Options({
  options,
  correct,
  multi,
  name,
  onOptions,
  onCorrect,
}: {
  options: Array<{ id: string; value: string }>;
  correct: string[];
  multi: boolean;
  name: string;
  onOptions: (o: Array<{ id: string; value: string }>) => void;
  onCorrect: (c: string[]) => void;
}) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <span className="label">{multi ? "Options · tick every correct one" : "Options · pick the correct one"}</span>
      {options.map((o, i) => {
        const on = correct.includes(o.id);
        return (
          <div key={o.id} className={`opt ${on ? "correct" : ""}`} style={{ padding: "6px 10px", alignItems: "center", gap: 10 }}>
            <input
              type={multi ? "checkbox" : "radio"}
              name={name}
              className="bu-radio"
              checked={on}
              aria-label={`Option ${KEY(i)} is correct`}
              onChange={() => onCorrect(multi ? (on ? correct.filter((x) => x !== o.id) : [...correct, o.id]) : [o.id])}
            />
            <span className="key">{KEY(i)}</span>
            <div className="grow" style={{ minWidth: 0 }}>
              <MathField variant="inline" label={`Option ${KEY(i)}`} value={o.value} onChange={(v) => onOptions(options.map((x) => (x.id === o.id ? { ...x, value: v } : x)))} onUploadImage={upload} />
            </div>
            {on && <span className="badge b-green">Correct</span>}
          </div>
        );
      })}
    </div>
  );
}

function NumberAnswer({ value, onChange, idBase }: { value: { from: number; to: number } | undefined; onChange: (v: { from: number; to: number } | undefined) => void; idBase: string }) {
  const [mode, setMode] = React.useState<"exact" | "range">(value && value.from !== value.to ? "range" : "exact");
  const [from, setFrom] = React.useState(value && Number.isFinite(value.from) ? String(value.from) : "");
  const [to, setTo] = React.useState(value && Number.isFinite(value.to) ? String(value.to) : "");
  const push = (m: "exact" | "range", f: string, t: string) => {
    const a = parseFloat(f);
    const b = m === "exact" ? a : parseFloat(t);
    onChange(f.trim() !== "" && Number.isFinite(a) && Number.isFinite(b) ? { from: a, to: b } : undefined);
  };
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row wrap" style={{ gap: 12 }}>
        <span id={`${idBase}-l`} className="label" style={{ margin: 0 }}>
          Answer
        </span>
        <Segmented
          size="sm"
          ariaLabelledBy={`${idBase}-l`}
          value={mode}
          onChange={(m) => {
            setMode(m);
            push(m, from, to);
          }}
          options={[
            { value: "exact", label: "Exact" },
            { value: "range", label: "Range" },
          ]}
        />
      </div>
      {mode === "exact" ? (
        <input
          className="k-input num"
          style={{ maxWidth: 200 }}
          inputMode="decimal"
          aria-label="Exact answer"
          placeholder="Type the answer"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            push("exact", e.target.value, to);
          }}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 140px))", gap: 10 }}>
          <label className="field">
            <span className="label">From</span>
            <input className="k-input num" inputMode="decimal" value={from} onChange={(e) => (setFrom(e.target.value), push("range", e.target.value, to))} />
          </label>
          <label className="field">
            <span className="label">To</span>
            <input className="k-input num" inputMode="decimal" value={to} onChange={(e) => (setTo(e.target.value), push("range", from, e.target.value))} />
          </label>
        </div>
      )}
    </div>
  );
}

const blankOptions = () => Array.from({ length: 4 }, (_, i) => ({ id: `opt_${Date.now().toString(36)}_${i}`, value: "" }));

function setType(q: ImportRowData, t: "single" | "multiple" | "integer"): ImportRowData {
  if (t === q.type) return q;
  if (t === "integer") return { ...q, type: t, en: { question: q.en.question, solution: q.en.solution }, correctAnswers: undefined, correctAnswer: undefined };
  const options = q.en.options?.length ? q.en.options : blankOptions();
  const correct = t === "single" ? (q.correctAnswers ?? []).slice(0, 1) : q.correctAnswers ?? [];
  return { ...q, type: t, en: { ...q.en, options }, correctAnswers: correct, correctAnswer: undefined };
}

export function RowFixDrawer({
  row,
  subjects,
  remaining,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onClose,
  onSave,
  onSkip,
}: {
  row: ReviewRow | null;
  subjects: ISubject[];
  /** rows that still need a look after this one */
  remaining: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onSave: (data: ImportRowData) => void;
  onSkip: () => void;
}) {
  const [q, setQ] = React.useState<ImportRowData | null>(row ? clone(row.data) : null);
  const [tried, setTried] = React.useState(false);
  const [openKid, setOpenKid] = React.useState(0);
  const rowId = row?.data.id;
  React.useEffect(() => {
    setQ(row ? clone(row.data) : null);
    setTried(false);
    setOpenKid(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowId]);

  const subjectOpts = React.useMemo(() => subjects.map((s) => ({ value: s._id, label: s.name })).sort((a, b) => a.label.localeCompare(b.label)), [subjects]);
  const chapterOpts = React.useMemo(() => chapterOptions(subjects, q?.subjectId ?? null), [subjects, q?.subjectId]);
  if (!row || !q) return null;
  const dirty = JSON.stringify(q) !== JSON.stringify(row.data);
  const problems = problemsOf(q);
  const note = noteFor({ ...row, data: q, invalid: row.invalid && !dirty ? row.invalid : null });
  const subject = subjects.find((s) => s._id === q.subjectId)?.name ?? q.subject ?? "";
  const set = (patch: Partial<ImportRowData>) => setQ((x) => (x ? { ...x, ...patch } : x));
  const setEn = (patch: Partial<ImportRowData["en"]>) => setQ((x) => (x ? { ...x, en: { ...x.en, ...patch } } : x));
  const setKid = (i: number, fn: (c: ParagraphChild) => ParagraphChild) => setQ((x) => (x ? { ...x, questions: (x.questions ?? []).map((c, j) => (j === i ? fn(c) : c)) } : x));
  const save = () => {
    setTried(true);
    if (problems.length) return;
    onSave(q);
  };

  const header = (
    <>
      <button type="button" className="k-xbtn" aria-label="Previous row" disabled={!canPrev} onClick={onPrev}>
        <ChevronUp className="size-4" aria-hidden />
      </button>
      <button type="button" className="k-xbtn" aria-label="Next row" disabled={!canNext} onClick={onNext}>
        <ChevronDown className="size-4" aria-hidden />
      </button>
    </>
  );
  const flagTone = rowCheck(row).tone;

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Row ${row.n}${subject ? ` · ${subject}` : ""}`}
      subtitle={remaining > 0 ? `${remaining} more row${remaining === 1 ? " needs" : "s need"} a look after this` : flagTone === "bad" || flagTone === "warn" ? "The last row that needs a look" : "No other rows need a look"}
      headerActions={header}
      dirty={dirty}
      aria-label={`Fix row ${row.n}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" style={{ marginRight: "auto" }} onClick={onSkip}>
            Skip this row
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save and next
          </button>
        </>
      }
    >
      {note && (
        <div className={`bu-note ${note.tone}`} role="status">
          {note.tone === "err" ? <CircleAlert className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
          <span>{note.text}</span>
        </div>
      )}
      {tried && problems.length > 0 && (
        <div className="k-sum" role="alert">
          <CircleAlert className="size-4" style={{ color: "var(--red-600)" }} aria-hidden />
          <span className="col" style={{ gap: 2 }}>
            <span className="sm" style={{ fontWeight: 600 }}>
              {problems.length === 1 ? "1 thing to fix" : `${problems.length} things to fix`}
            </span>
            <span className="sm">{problems.join(" · ")}</span>
          </span>
        </div>
      )}

      {q.type === "paragraph" ? (
        <>
          <div className="field">
            <span className="label">Passage</span>
            <MathField label="Passage" value={q.passage?.en ?? ""} onChange={(v) => set({ passage: { en: v, hi: q.passage?.hi ?? null } })} onUploadImage={upload} minHeight={90} />
          </div>
          <div className="col" style={{ gap: 8 }}>
            <span className="label">Questions on this passage · {(q.questions ?? []).length}</span>
            {(q.questions ?? []).map((c, i) => {
              const open = openKid === i;
              const ok = c.type === "integer" ? !!c.correctAnswer : (c.correctAnswers ?? []).length > 0;
              return (
                <div key={c.id} className="bu-kid">
                  <button type="button" className="row" style={{ gap: 8, border: 0, background: "none", padding: 0, font: "inherit", textAlign: "left", cursor: "pointer" }} onClick={() => setOpenKid(open ? -1 : i)} aria-expanded={open}>
                    <span className="badge b-navy">Q{i + 1}</span>
                    <span className="badge b-grey">{c.type === "integer" ? "Numerical" : c.type === "multiple" ? "Multiple" : "Single"}</span>
                    {!ok && <span className="badge b-live">No answer</span>}
                    <span className="grow" />
                    {open ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
                  </button>
                  {open && (
                    <>
                      <Segmented<ChildType>
                        size="sm"
                        ariaLabel={`Type of Q${i + 1}`}
                        value={c.type}
                        onChange={(t) =>
                          setKid(i, (k) =>
                            t === "integer"
                              ? { ...k, type: t, en: { question: k.en.question, solution: k.en.solution }, correctAnswers: undefined }
                              : { ...k, type: t, en: { ...k.en, options: k.en.options?.length ? k.en.options : blankOptions() }, correctAnswers: t === "single" ? (k.correctAnswers ?? []).slice(0, 1) : k.correctAnswers ?? [], correctAnswer: undefined }
                          )
                        }
                        options={[
                          { value: "single", label: "Single" },
                          { value: "multiple", label: "Multiple" },
                          { value: "integer", label: "Numerical" },
                        ]}
                      />
                      <MathField label={`Q${i + 1}`} value={c.en.question} onChange={(v) => setKid(i, (k) => ({ ...k, en: { ...k.en, question: v } }))} toolbar="focus" preview={false} onUploadImage={upload} minHeight={56} />
                      {c.type === "integer" ? (
                        <NumberAnswer idBase={`bu-k${i}`} value={c.correctAnswer} onChange={(v) => setKid(i, (k) => ({ ...k, correctAnswer: v }))} />
                      ) : (
                        <Options
                          name={`bu-k${i}`}
                          multi={c.type === "multiple"}
                          options={c.en.options ?? []}
                          correct={c.correctAnswers ?? []}
                          onOptions={(o) => setKid(i, (k) => ({ ...k, en: { ...k.en, options: o } }))}
                          onCorrect={(cr) => setKid(i, (k) => ({ ...k, correctAnswers: cr }))}
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="field">
          <span className="label">Question</span>
          <MathField label="Question" value={q.en.question} onChange={(v) => setEn({ question: v })} onUploadImage={upload} minHeight={80} />
        </div>
      )}

      {(q.type === "single" || q.type === "multiple") && (
        <Options name="bu-fx" multi={q.type === "multiple"} options={q.en.options ?? []} correct={q.correctAnswers ?? []} onOptions={(o) => setEn({ options: o })} onCorrect={(c) => set({ correctAnswers: c })} />
      )}
      {q.type === "integer" && <NumberAnswer key={q.id} idBase="bu-num" value={q.correctAnswer} onChange={(v) => set({ correctAnswer: v })} />}
      {q.type === "matrix" && q.matrix && (
        <div className="col" style={{ gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {(["listI", "listII"] as const).map((l) => (
              <div key={l} className="col" style={{ gap: 6 }}>
                <span className="xs" style={{ fontWeight: 600 }}>
                  {l === "listI" ? "List I" : "List II"}
                </span>
                {q.matrix![l].map((r) => (
                  <div key={r.id} className="row" style={{ gap: 6 }}>
                    <span className="mono xs muted" style={{ width: 14 }}>
                      {r.id}
                    </span>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <MathField variant="inline" boxed label={`${l === "listI" ? "List I" : "List II"} row ${r.id}`} value={r.en} onChange={(v) => set({ matrix: { ...q.matrix!, [l]: q.matrix![l].map((x) => (x.id === r.id ? { ...x, en: v } : x)) } })} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <span className="label">Correct matches · a row can have more than one</span>
          <div className="card" style={{ padding: "6px 10px", alignSelf: "flex-start", overflowX: "auto", maxWidth: "100%" }}>
            <table className="bu-mx">
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">List I</span>
                  </th>
                  {q.matrix.listII.map((c) => (
                    <th key={c.id} scope="col">
                      {c.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.matrix.listI.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">{r.id}</th>
                    {q.matrix!.listII.map((c) => {
                      const on = (q.matrix!.matches[r.id] ?? []).includes(c.id);
                      return (
                        <td key={c.id}>
                          <button
                            type="button"
                            className={`bu-mxc ${on ? "on" : ""}`}
                            aria-pressed={on}
                            aria-label={`${r.id} matches ${c.id}`}
                            onClick={() => {
                              const cur = q.matrix!.matches[r.id] ?? [];
                              set({ matrix: { ...q.matrix!, matches: { ...q.matrix!.matches, [r.id]: on ? cur.filter((x) => x !== c.id) : [...cur, c.id] } } });
                            }}
                          >
                            <Check className="size-3.5" strokeWidth={3} aria-hidden />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {q.type !== "paragraph" && (
        <div className="field">
          <span className="label">
            Solution <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
          </span>
          <MathField label="Solution" value={q.en.solution ?? ""} onChange={(v) => setEn({ solution: v })} onUploadImage={upload} toolbar="focus" minHeight={56} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div className="field">
          <label className="label" htmlFor="bu-fs">
            Subject
          </label>
          <Combobox id="bu-fs" value={q.subjectId ?? null} onChange={(v) => set({ subjectId: v ?? undefined, chapterIds: [] })} options={subjectOpts} placeholder="Pick a subject" noun="subject" invalid={tried && !q.subjectId} />
        </div>
        <div className="field">
          <label className="label" htmlFor="bu-fch">
            Chapter
          </label>
          <Combobox
            id="bu-fch"
            value={q.chapterIds?.[0] ?? null}
            onChange={(v) => set({ chapterIds: v ? [v] : [] })}
            options={chapterOpts}
            placeholder={q.chapter ? `AI said "${q.chapter}"` : "Pick a chapter"}
            disabled={!q.subjectId}
            disabledText="Pick a subject first"
            noun="chapter"
            invalid={tried && !q.chapterIds?.length}
          />
        </div>
      </div>
      <div className="row wrap" style={{ gap: 14 }}>
        {(q.type === "single" || q.type === "multiple" || q.type === "integer") && (
          <div className="field">
            <span id="bu-ft" className="label">
              Type
            </span>
            <Segmented
              size="sm"
              ariaLabelledBy="bu-ft"
              value={q.type}
              onChange={(t) => setQ((x) => (x ? setType(x, t) : x))}
              options={[
                { value: "single", label: "Single" },
                { value: "multiple", label: "Multiple" },
                { value: "integer", label: "Numerical" },
              ]}
            />
          </div>
        )}
        <div className="field">
          <span id="bu-fd" className="label">
            Difficulty
          </span>
          <Segmented<Difficulty> size="sm" ariaLabelledBy="bu-fd" value={q.difficulty ?? null} onChange={(d) => set({ difficulty: d })} options={DIFFICULTIES} />
        </div>
      </div>
    </Drawer>
  );
}
