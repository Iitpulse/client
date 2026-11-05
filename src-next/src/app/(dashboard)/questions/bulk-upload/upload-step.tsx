"use client";
/* Step 1 of Admin-BulkUpload: upload a paper (or paste text), the Excel template card and the defaults. */
import * as React from "react";
import { Download } from "lucide-react";
import { FileDrop } from "@/components/kit/FileDrop";
import { Combobox, type ComboOption } from "@/components/kit/Combobox";
import { Segmented } from "@/components/kit/Segmented";
import { PARSE_EXTENSIONS, PARSE_MAX_BYTES } from "@/lib/m6/import";
import type { Difficulty } from "@/lib/m6-contract";
import type { ISubject } from "@/types";

export interface Defaults {
  subjectId: string | null;
  /** null = "Let AI suggest per question" */
  chapterId: string | null;
  difficulty: Difficulty;
}

export const DIFFICULTIES: Array<{ value: Difficulty; label: string }> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

/** Template v2 columns (board list + contract's List I / List II) */
const COLUMNS = ["Type", "Question", "Option A–D", "Answer", "Range from", "Range to", "Solution", "Subject", "Chapter", "Topic", "Difficulty", "Hindi question", "Hindi options", "Hindi solution", "Passage ID", "List I", "List II"];

export function chapterOptions(subjects: ISubject[], subjectId: string | null): ComboOption[] {
  const s = subjects.find((x) => x._id === subjectId);
  return (s?.chapters ?? []).filter((c) => c.name).map((c) => ({ value: c.id || c._id, label: c.name }));
}

export function UploadStep({
  subjects,
  defaults,
  onDefaults,
  onFile,
  onText,
  dropError,
  onDropErrorClear,
  onTemplate,
  templateBusy,
}: {
  subjects: ISubject[];
  defaults: Defaults;
  onDefaults: (d: Defaults) => void;
  onFile: (f: File) => void;
  onText: (t: string) => void;
  dropError: string | null;
  onDropErrorClear: () => void;
  onTemplate: () => void;
  templateBusy: boolean;
}) {
  const [textMode, setTextMode] = React.useState(false);
  const [text, setText] = React.useState("");
  const subjectOpts = React.useMemo(() => subjects.map((s) => ({ value: s._id, label: s.name })).sort((a, b) => a.label.localeCompare(b.label)), [subjects]);
  const chapterOpts = React.useMemo(() => chapterOptions(subjects, defaults.subjectId), [subjects, defaults.subjectId]);

  return (
    <section className="bu-grid1">
      <div className="card pad-lg col" style={{ gap: 12 }}>
        <span className="h3">{textMode ? "Paste the questions" : "Upload a paper"}</span>
        {textMode ? (
          <>
            <label className="sr-only" htmlFor="bu-text">
              Questions as text
            </label>
            <textarea
              id="bu-text"
              className="k-input"
              style={{ minHeight: 190, fontFamily: "var(--mono)", fontSize: 13 }}
              placeholder={"1. A body of mass $m$ … (A) … (B) … (C) … (D) …\nAnswer key at the end, if you have it."}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-primary btn-sm" disabled={text.trim().length < 10} onClick={() => onText(text)}>
                Read the text
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTextMode(false)}>
                Upload a file instead
              </button>
            </div>
          </>
        ) : (
          <>
            <FileDrop
              accept={PARSE_EXTENSIONS}
              maxBytes={PARSE_MAX_BYTES}
              onFile={onFile}
              title="Drop a Word, PDF or Excel file, or"
              rules=".docx .pdf .xlsx, or photos of pages (.png .jpg) · up to 20 MB"
              error={dropError}
              onErrorClear={onDropErrorClear}
              minHeight={190}
            />
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setTextMode(true)}>
              Paste text instead
            </button>
          </>
        )}
        <span className="xs muted">Reading a paper with AI uses credits. A filled Excel template is read without AI and uses none.</span>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card pad-lg col" style={{ gap: 10 }}>
          <span className="h3">Or fill the Excel template</span>
          <span className="sm muted">One question per row. Maths in $…$, the same as the editor. Good for a set you already typed.</span>
          <div className="bu-cols" aria-label="Template columns">
            {COLUMNS.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <span className="xs muted">Paragraph questions share a Passage ID. Matrix answers go as A-P, B-Q.</span>
          <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }} onClick={onTemplate} disabled={templateBusy} aria-busy={templateBusy || undefined}>
            <Download className="size-4" aria-hidden />
            Download the template (.xlsx)
          </button>
        </div>
        <div className="card pad-lg col" style={{ gap: 12 }}>
          <div className="col" style={{ gap: 2 }}>
            <span className="h3">Defaults</span>
            <span className="xs muted">Used only where a question doesn&apos;t say. You can change each row later.</span>
          </div>
          <div className="field">
            <label className="label" htmlFor="bu-ds">
              Subject
            </label>
            <Combobox
              id="bu-ds"
              value={defaults.subjectId}
              onChange={(v) => onDefaults({ ...defaults, subjectId: v, chapterId: null })}
              options={subjectOpts}
              placeholder="Pick a subject"
              noun="subject"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="bu-dc">
              Chapter <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <Combobox
              id="bu-dc"
              value={defaults.chapterId}
              onChange={(v) => onDefaults({ ...defaults, chapterId: v })}
              options={chapterOpts}
              placeholder="Let AI suggest per question"
              clearable
              disabled={!defaults.subjectId}
              disabledText="Let AI suggest per question"
              noun="chapter"
            />
          </div>
          <div className="field">
            <span id="bu-dd" className="label">
              Difficulty
            </span>
            <Segmented ariaLabelledBy="bu-dd" size="sm" value={defaults.difficulty} onChange={(v) => onDefaults({ ...defaults, difficulty: v })} options={DIFFICULTIES} className="self-start" />
          </div>
        </div>
      </div>
    </section>
  );
}
