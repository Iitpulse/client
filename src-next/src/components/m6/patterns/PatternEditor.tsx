"use client";
/*
  Admin-Patterns board, views edit / new / errors / in-use (+ duplicate dialog) and the read-only view (row menu
  "Preview"; replaces the legacy preview route). PatternWriteRequest: sections → sub-sections with type, paragraph
  {setSize, childType}, totalQuestions, toAttempt and labelled marking {correct, incorrect, partial[]}; the
  "Reads as" line and the live totals are built here. A pattern used by tests is locked: only name and duration.
*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical, Trash2, TriangleAlert, X } from "lucide-react";
import "@/components/m6/m6-patterns.css";
import { Topbar } from "@/components/admin/Topbar";
import { AffixInput, Banner, Checkbox, Combobox, ErrorSummary, Field, NoAccess, notify, NumberStepper, PageError, PageSkeleton, Segmented, SignedMarks, TextInput } from "@/components/kit";
import { errorCode, isForbidden, SamplePill } from "@/components/m6/parts";
import { DuplicatePatternDialog } from "@/components/m6/patterns/DuplicatePatternDialog";
import { apiError, fieldErrors } from "@/lib/m6/client";
import {
  CHILD_LABEL,
  CORRECT_LABEL,
  defaultMarking,
  hasPartial,
  PARTIAL_COUNTS,
  readsAs,
  sectionTotals,
  TYPE_HELP,
  TYPE_LABEL,
  TYPE_ORDER,
  validatePattern,
  whereOf,
} from "@/lib/m6/pattern-rules";
import { patternsApi, useInvalidatePatterns, usePattern, usePatterns } from "@/lib/m6/patterns";
import { examRefs, useM6Exams, useM6Subjects } from "@/lib/m6/shared";
import type { ChildType, Pattern, PatternSubsection, PatternWriteRequest, QuestionType } from "@/lib/m6-contract";

type Draft = PatternWriteRequest;
type DSection = Draft["sections"][number];
type Mode = "new" | "edit" | "view";

let tmp = 0;
const tid = (p: string) => `${p}-${Date.now().toString(36)}${(tmp++).toString(36)}`;

function toDraft(p: Pattern): Draft {
  return {
    name: p.name,
    examId: p.exam.id,
    durationMinutes: p.durationMinutes,
    sections: p.sections.map((s) => ({ id: s.id, name: s.name, subjectId: s.subject?.id ?? null, subsections: structuredClone(s.subsections) })),
  };
}
function newSub(n: number, type: QuestionType = "single"): PatternSubsection {
  return { id: "", name: `Section ${n}`, description: null, type, paragraph: null, totalQuestions: 10, toAttempt: 10, marking: defaultMarking(type) };
}
/** New ids are "" (the server makes them); keys for React live in this map. */
function keyOf(map: WeakMap<object, string>, o: object) {
  let k = map.get(o);
  if (!k) map.set(o, (k = tid("k")));
  return k;
}
const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) => (Number.isFinite(n) ? String(Math.abs(n)) : "");

export function PatternEditor({ mode, patternId }: { mode: Mode; patternId?: string }) {
  const router = useRouter();
  const one = usePattern(mode === "new" ? undefined : patternId);
  const exams = useM6Exams();
  const subjects = useM6Subjects();
  const invalidate = useInvalidatePatterns();
  const [keys] = useState(() => new WeakMap<object, string>());

  const [draft, setDraft] = useState<Draft | null>(mode === "new" ? { name: "", examId: "", durationMinutes: 60, sections: [] } : null);
  const [orig, setOrig] = useState<string>(mode === "new" ? JSON.stringify({ name: "", examId: "", durationMinutes: 60, sections: [] }) : "");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<Set<number>>(new Set([0]));
  const [tried, setTried] = useState(false);
  const [server, setServer] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  useEffect(() => {
    if (one.data && mode !== "new") {
      const d = toDraft(one.data);
      setDraft(d);
      setOrig(JSON.stringify(d));
      setServer({});
    }
  }, [one.data, mode]);

  const pattern = one.data;
  const locked = mode === "edit" && !!pattern?.locked;
  const readOnly = mode === "view";
  const structLocked = locked || readOnly;
  const dirty = !!draft && !readOnly && JSON.stringify(draft) !== orig;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const client = useMemo(() => (draft ? validatePattern(draft) : {}), [draft]);
  const errors: Record<string, string> = useMemo(() => {
    const live: Record<string, string> = {};
    // "to attempt is more than the questions" shows as you type (board view=errors); the rest after a Save
    for (const [k, v] of Object.entries(client)) if (tried || k.endsWith(".toAttempt") || k.endsWith(".paragraph.setSize")) live[k] = v;
    return { ...live, ...server };
  }, [client, server, tried]);

  const examOptions = useMemo(() => examRefs(exams.data).map((e) => ({ value: e.id, label: e.name })), [exams.data]);
  const subjectOptions = useMemo(() => (subjects.data ?? []).map((s) => ({ value: s.id, label: s.name })), [subjects.data]);

  if (mode !== "new" && one.isError)
    return (
      <>
        <Topbar title="Pattern" back={{ href: "/patterns", label: "Patterns" }} />
        <main className="col" style={{ padding: "20px 28px 40px" }}>
          {isForbidden(one.error) ? (
            <NoAccess what="patterns" />
          ) : (
            <PageError what="this pattern" body="Tests that use it still work. Try again in a moment." code={errorCode("PAT", one.error)} onRetry={() => one.refetch()} />
          )}
        </main>
      </>
    );

  if (!draft)
    return (
      <>
        <Topbar title="Pattern" back={{ href: "/patterns", label: "Patterns" }} />
        <main className="col" style={{ padding: "20px 28px 40px" }}>
          <PageSkeleton rows={8} onRetry={() => one.refetch()} />
        </main>
      </>
    );

  const set = (fn: (d: Draft) => void) => {
    setDraft((d) => {
      const n = structuredClone(d!);
      fn(n);
      return n;
    });
  };
  const clearServer = (...ks: string[]) => setServer((s) => (ks.some((k) => k in s) ? Object.fromEntries(Object.entries(s).filter(([k]) => !ks.includes(k))) : s));

  const totals = (() => {
    let questions = 0;
    let toAttempt = 0;
    let marks = 0;
    for (const s of draft.sections) {
      const t = sectionTotals(s);
      questions += t.questions;
      toAttempt += t.toAttempt;
      marks += t.marks;
    }
    return { sections: draft.sections.length, questions, toAttempt, marks };
  })();

  const addSection = () => {
    const n = draft.sections.length;
    set((d) => d.sections.push({ id: "", name: `Section ${n + 1}`, subjectId: null, subsections: [newSub(1)] }));
    setActive(n);
    setOpen((o) => new Set(o).add(n));
    requestAnimationFrame(() => document.getElementById(`sec-${n}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };
  const moveSection = (from: number, to: number) => {
    if (from === to) return;
    set((d) => {
      const [s] = d.sections.splice(from, 1);
      d.sections.splice(to, 0, s);
    });
    setActive(to);
    setOpen(new Set([to]));
  };
  const pick = (i: number) => {
    setActive(i);
    setOpen((o) => new Set(o).add(i));
    requestAnimationFrame(() => document.getElementById(`sec-${i}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  const summary = Object.entries(errors).map(([k, msg]) => ({ id: anchorOf(k), label: `${whereOf(k, draft)}: ${lower(msg)}` }));

  const save = async () => {
    setTried(true);
    setServer({});
    const body: Draft = locked && pattern ? { ...toDraft(pattern), name: draft.name, durationMinutes: draft.durationMinutes } : draft;
    const errs = locked ? Object.fromEntries(Object.entries(validatePattern(body)).filter(([k]) => k === "name" || k === "durationMinutes")) : validatePattern(body);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (mode === "new") {
        const r = await patternsApi.create(body);
        await invalidate();
        setOrig(JSON.stringify(draft));
        notify.success("Pattern saved", { description: `${r.pattern.name} · ${r.pattern.totals.questions} questions · ${r.pattern.totals.marks} marks` });
        router.replace(`/patterns/${r.pattern.id}/edit`);
      } else {
        const r = await patternsApi.update(patternId!, body);
        await invalidate();
        const d = toDraft(r.pattern);
        setDraft(d);
        setOrig(JSON.stringify(d));
        setTried(false);
        notify.success("Pattern saved", {
          description: r.testsUpdated ? `${r.testsUpdated} test${r.testsUpdated === 1 ? "" : "s"} that haven't opened now run ${r.pattern.durationMinutes} min.` : undefined,
        });
      }
    } catch (e) {
      const err = apiError(e);
      const f = fieldErrors(e);
      if (err.code === "NAME_TAKEN") f.name = "Another pattern has this name";
      if (Object.keys(f).length) setServer(f);
      else if (err.code === "PATTERN_LOCKED") {
        notify.error("This pattern is locked", { description: err.message });
        one.refetch();
      } else notify.error("Couldn't save the pattern", { description: err.message, retry: save });
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "new" ? "New pattern" : pattern?.name ?? "Pattern";
  const usedBy = pattern?.usedBy ?? 0;

  return (
    <>
      <Topbar
        title={title}
        back={{ href: "/patterns", label: "Patterns" }}
        badge={
          <>
            {dirty && <span className="badge b-amber">Unsaved</span>}
            {readOnly && locked === false && pattern?.locked && <span className="badge b-grey">Used by {usedBy} tests</span>}
            <SamplePill areas={["patterns"]} />
          </>
        }
        actions={
          readOnly ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDup(true)}>
                Duplicate
              </button>
              <Link href={`/patterns/${patternId}/edit`} className="btn btn-primary btn-sm">
                Edit
              </Link>
            </>
          ) : (
            <>
              {mode === "edit" && (
                <Link href={`/patterns/${patternId}`} className="btn btn-secondary btn-sm">
                  Preview exam
                </Link>
              )}
              {mode === "edit" && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDup(true)}>
                  Duplicate
                </button>
              )}
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={save}>
                {busy ? "Saving…" : locked ? "Save name and duration" : "Save pattern"}
              </button>
            </>
          )
        }
      />
      <main className="m6-ed">
        <div className="m6-outline-wrap">
          <nav className="card m6-outline" aria-label="Sections">
            <span className="eyebrow" style={{ padding: "6px 10px" }}>
              Sections
            </span>
            {draft.sections.map((s, i) => (
              <button
                key={keyOf(keys, s)}
                type="button"
                className={`m6-oi ${i === active ? "on" : ""} ${over === i && drag !== null && drag !== i ? "drop" : ""}`}
                draggable={!structLocked}
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(i);
                }}
                onDragEnd={() => {
                  setDrag(null);
                  setOver(null);
                }}
                onDrop={() => {
                  if (drag !== null) moveSection(drag, i);
                  setDrag(null);
                  setOver(null);
                }}
                onClick={() => pick(i)}
              >
                {!structLocked && <GripVertical className="m6-grip size-4" aria-hidden />}
                <span className="truncate">{s.name || `Section ${i + 1}`}</span>
                <span className="n">{s.subsections.length}</span>
              </button>
            ))}
            {!structLocked && (
              <button type="button" className="m6-oi m6-add" onClick={addSection}>
                + Add section
              </button>
            )}
            {!structLocked && draft.sections.length > 1 && (
              <span className="xs muted" style={{ padding: "6px 10px" }}>
                Drag to reorder. Students see sections in this order.
              </span>
            )}
          </nav>
        </div>

        <div className="col" style={{ gap: 14, minWidth: 0 }}>
          {pattern?.locked && (
            <Banner
              tone="warn"
              round
              title={`${usedBy} test${usedBy === 1 ? " uses" : "s use"} this pattern, so questions and marks are locked.`}
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDup(true)}>
                  Duplicate
                </button>
              }
            >
              Their scores must keep adding up the same way. You can still rename it and change the duration for tests that haven&apos;t opened. Duplicate it to change anything else.
            </Banner>
          )}
          {tried && summary.length > 0 && <ErrorSummary fields={summary} title={`${summary.length} thing${summary.length === 1 ? "" : "s"} to fix before saving`} />}

          <section className="card pad-lg col" style={{ gap: 12 }}>
            <div className="m6-g3">
              <Field label="Name" htmlFor="pn" error={errors.name}>
                <TextInput
                  id="pn"
                  value={draft.name}
                  invalid={!!errors.name}
                  disabled={readOnly}
                  placeholder="e.g. Weekly sectional, 30 questions"
                  onChange={(e) => {
                    const v = e.target.value;
                    set((d) => void (d.name = v));
                    clearServer("name");
                  }}
                />
              </Field>
              <Field label="Exam" htmlFor="px" error={errors.examId}>
                <Combobox
                  id="px"
                  value={draft.examId || null}
                  options={examOptions}
                  placeholder="Pick an exam"
                  noun="exam"
                  invalid={!!errors.examId}
                  disabled={structLocked}
                  valueLabel={pattern?.exam.name}
                  loading={exams.isLoading}
                  onChange={(v) => {
                    set((d) => void (d.examId = v ?? ""));
                    clearServer("examId");
                  }}
                />
              </Field>
              <Field label="Duration" htmlFor="pd" error={errors.durationMinutes}>
                <AffixInput
                  id="pd"
                  inputMode="numeric"
                  suffix="min"
                  invalid={!!errors.durationMinutes}
                  disabled={readOnly}
                  value={draft.durationMinutes ? String(draft.durationMinutes) : ""}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                    set((d) => void (d.durationMinutes = Number.isFinite(n) ? n : 0));
                    clearServer("durationMinutes");
                  }}
                />
              </Field>
            </div>
          </section>

          <div className="m6-totals" role="status">
            <span>
              <b>{totals.sections}</b>section{totals.sections === 1 ? "" : "s"}
            </span>
            <span>
              <b>{totals.questions}</b>questions
            </span>
            <span>
              <b>{totals.toAttempt}</b>to attempt
            </span>
            <span>
              <b>{totals.marks}</b>marks
            </span>
            {!readOnly && !locked && <span className="muted" style={{ marginLeft: "auto" }}>Updates as you type</span>}
          </div>

          {!draft.sections.length && (
            <StartCard
              disabled={structLocked}
              onAdd={addSection}
              onCopy={(p) => {
                set((d) => {
                  d.sections = p.sections.map((s) => ({ id: "", name: s.name, subjectId: s.subject?.id ?? null, subsections: s.subsections.map((x) => ({ ...structuredClone(x), id: "" })) }));
                  if (!d.examId) d.examId = p.exam.id;
                  if (!d.durationMinutes || d.durationMinutes === 60) d.durationMinutes = p.durationMinutes;
                });
                setOpen(new Set([0]));
                setActive(0);
              }}
            />
          )}
          {errors.sections && (
            <span className="m6-err-t" id="sections">
              {errors.sections}
            </span>
          )}

          {draft.sections.map((s, i) => {
            const t = sectionTotals(s);
            const isOpen = open.has(i);
            const secErr = errors[`sections.${i}.subsections`];
            if (!isOpen)
              return (
                <section
                  key={keyOf(keys, s)}
                  id={`sec-${i}`}
                  className="card pad col m6-collapsed"
                  style={{ gap: 6 }}
                  onClick={() => pick(i)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={false}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick(i))}
                >
                  <div className="row between">
                    <span className="row h3" style={{ gap: 8 }}>
                      <ChevronRight className="size-4 text-muted" aria-hidden />
                      {s.name || `Section ${i + 1}`}
                    </span>
                    <span className="xs muted">{s.subsections.length ? `${t.questions} questions · ${t.marks} marks · collapsed` : "No sub-sections"}</span>
                  </div>
                  {secErr && <span className="m6-err-t">{secErr}</span>}
                </section>
              );
            return (
              <SectionCard
                key={keyOf(keys, s)}
                i={i}
                s={s}
                errors={errors}
                structLocked={structLocked}
                subjectOptions={subjectOptions}
                subjectsLoading={subjects.isLoading}
                subjectName={pattern?.sections.find((x) => x.subject?.id === s.subjectId)?.subject?.name}
                keyOf={(o) => keyOf(keys, o)}
                onCollapse={() =>
                  setOpen((o) => {
                    const n = new Set(o);
                    n.delete(i);
                    return n;
                  })
                }
                onRemove={() => {
                  set((d) => void d.sections.splice(i, 1));
                  setOpen(new Set([Math.max(0, i - 1)]));
                  setActive(Math.max(0, i - 1));
                }}
                update={(fn) => set((d) => fn(d.sections[i]))}
                clear={clearServer}
              />
            );
          })}
          {!structLocked && draft.sections.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={addSection}>
              + Add section
            </button>
          )}
        </div>
      </main>
      {dup && pattern && <DuplicatePatternDialog pattern={pattern} onClose={() => setDup(false)} onDone={(id) => (setDup(false), router.push(`/patterns/${id}/edit`))} />}
    </>
  );
}

function lower(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
/** Field path → the DOM id the summary jumps to. */
function anchorOf(path: string): string {
  if (path === "name") return "pn";
  if (path === "examId") return "px";
  if (path === "durationMinutes") return "pd";
  const m = /^sections\.(\d+)(?:\.subsections\.(\d+))?(?:\.(.+))?$/.exec(path);
  if (!m) return "sections";
  if (m[2] === undefined) return m[3] === "name" ? `sec-${m[1]}-name` : `sec-${m[1]}`;
  const base = `ss-${m[1]}-${m[2]}`;
  const f = m[3] ?? "";
  if (f === "toAttempt") return `${base}-att`;
  if (f === "totalQuestions") return `${base}-q`;
  if (f === "name") return `${base}-name`;
  if (f.startsWith("paragraph")) return `${base}-set`;
  if (f === "marking.correct") return `${base}-c`;
  if (f === "marking.incorrect") return `${base}-w`;
  return base;
}

function StartCard({ disabled, onAdd, onCopy }: { disabled: boolean; onAdd: () => void; onCopy: (p: Pattern) => void }) {
  const [copying, setCopying] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const list = usePatterns({ sort: "lastUsed" });
  const src = usePattern(from ?? undefined);
  useEffect(() => {
    if (src.data && from) {
      onCopy(src.data);
      setFrom(null);
      setCopying(false);
    }
  }, [src.data, from, onCopy]);
  return (
    <section className="card m6-st" style={{ padding: "40px 20px" }}>
      <span className="h3">Start with a section</span>
      <span className="sm muted" style={{ maxWidth: 420 }}>
        One section per subject is usual. Each section holds sub-sections with one question type and one marking rule.
      </span>
      {copying ? (
        <div className="row" style={{ gap: 8, width: 360, maxWidth: "100%" }}>
          <div className="grow">
            <Combobox
              id="copy-from"
              value={from}
              options={(list.data?.items ?? []).map((p) => ({ value: p.id, label: p.name, end: p.exam?.name }))}
              placeholder="Pick a pattern to copy"
              noun="pattern"
              loading={list.isLoading || src.isFetching}
              onChange={(v) => setFrom(v)}
            />
          </div>
          <button type="button" className="btn btn-ghost btn-sm" aria-label="Cancel copy" onClick={() => setCopying(false)}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-primary btn-sm" disabled={disabled} onClick={onAdd}>
            + Add section
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => setCopying(true)}>
            Copy an existing pattern
          </button>
        </div>
      )}
    </section>
  );
}

function SectionCard({
  i,
  s,
  errors,
  structLocked,
  subjectOptions,
  subjectsLoading,
  subjectName,
  keyOf,
  onCollapse,
  onRemove,
  update,
  clear,
}: {
  i: number;
  s: DSection;
  errors: Record<string, string>;
  structLocked: boolean;
  subjectOptions: Array<{ value: string; label: string }>;
  subjectsLoading: boolean;
  subjectName?: string;
  keyOf: (o: object) => string;
  onCollapse: () => void;
  onRemove: () => void;
  update: (fn: (s: DSection) => void) => void;
  clear: (...k: string[]) => void;
}) {
  const at = `sections.${i}`;
  return (
    <section className="card pad-lg col" style={{ gap: 12, scrollMarginTop: 84 }} id={`sec-${i}`}>
      <div className="row between wrap" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 10, flex: 1, minWidth: 260 }}>
          <button type="button" className="m6-rm" aria-label={`Collapse ${s.name}`} aria-expanded onClick={onCollapse}>
            <ChevronDown className="size-4" aria-hidden />
          </button>
          <TextInput
            id={`sec-${i}-name`}
            value={s.name}
            aria-label="Section name"
            invalid={!!errors[`${at}.name`]}
            disabled={structLocked}
            style={{ maxWidth: 200, fontWeight: 600 }}
            onChange={(e) => {
              const v = e.target.value;
              update((x) => void (x.name = v));
              clear(`${at}.name`);
            }}
          />
          <div style={{ width: 220 }}>
            <Combobox
              id={`sec-${i}-subject`}
              aria-label="Subject for this section"
              value={s.subjectId}
              options={subjectOptions}
              valueLabel={subjectName}
              placeholder="Subject: none"
              noun="subject"
              clearable
              loading={subjectsLoading}
              disabled={structLocked}
              onChange={(v) => update((x) => void (x.subjectId = v))}
            />
          </div>
        </div>
        {!structLocked && (
          <button type="button" className="m6-rm" aria-label={`Remove section ${s.name}`} title="Remove section" onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {errors[`${at}.name`] && <span className="m6-err-t">{errors[`${at}.name`]}</span>}
      {s.subsections.map((x, j) => (
        <SubsectionBlock
          key={keyOf(x)}
          i={i}
          j={j}
          x={x}
          errors={errors}
          locked={structLocked}
          canRemove={!structLocked}
          onRemove={() => update((sec) => void sec.subsections.splice(j, 1))}
          update={(fn) => update((sec) => fn(sec.subsections[j]))}
          clear={clear}
        />
      ))}
      {errors[`${at}.subsections`] && <span className="m6-err-t">{errors[`${at}.subsections`]}</span>}
      {!structLocked && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => update((sec) => void sec.subsections.push(newSub(sec.subsections.length + 1)))}>
          + Add sub-section
        </button>
      )}
    </section>
  );
}

function SubsectionBlock({
  i,
  j,
  x,
  errors,
  locked,
  canRemove,
  onRemove,
  update,
  clear,
}: {
  i: number;
  j: number;
  x: PatternSubsection;
  errors: Record<string, string>;
  locked: boolean;
  canRemove: boolean;
  onRemove: () => void;
  update: (fn: (x: PatternSubsection) => void) => void;
  clear: (...k: string[]) => void;
}) {
  const p = `sections.${i}.subsections.${j}`;
  const id = `ss-${i}-${j}`;
  const e = (k: string) => errors[`${p}.${k}`];
  const bad = Object.keys(errors).some((k) => k.startsWith(`${p}.`));
  const partialOn = x.marking.partial.some((l) => l.marks > 0);
  const unit = x.type === "multiple" ? "option" : "row";
  const setType = (t: QuestionType) =>
    update((s) => {
      s.type = t;
      s.marking = defaultMarking(t);
      s.paragraph = t === "paragraph" ? { setSize: s.totalQuestions % 2 === 0 ? 2 : 1, childType: "single" } : null;
    });
  const childOptions = (["single", "multiple", "integer"] as ChildType[]).map((c) => ({ value: c as ChildType | "mixed", label: CHILD_LABEL[c] }));
  if (x.paragraph?.childType === "mixed") childOptions.push({ value: "mixed", label: CHILD_LABEL.mixed });

  return (
    <fieldset disabled={locked} className={`m6-ss ${bad ? "bad" : ""} ${locked ? "m6-locked" : ""}`} id={id} style={{ scrollMarginTop: 84 }}>
      <div className="row between wrap" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8, flex: 1, minWidth: 220 }}>
          {!locked && <GripVertical className="m6-grip size-4" aria-hidden />}
          <TextInput
            id={`${id}-name`}
            value={x.name}
            aria-label="Sub-section name"
            invalid={!!e("name")}
            disabled={locked}
            style={{ maxWidth: 180 }}
            onChange={(ev) => {
              const v = ev.target.value;
              update((s) => void (s.name = v));
              clear(`${p}.name`);
            }}
          />
          <TextInput
            value={x.description ?? ""}
            aria-label="Note for students (optional)"
            placeholder="Note for students (optional)"
            disabled={locked}
            onChange={(ev) => {
              const v = ev.target.value;
              update((s) => void (s.description = v || null));
            }}
          />
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Segmented<QuestionType>
            size="sm"
            ariaLabel="Question type"
            value={x.type}
            options={TYPE_ORDER.map((t) => ({ value: t, label: TYPE_LABEL[t], disabled: locked }))}
            onChange={(t) => !locked && setType(t)}
          />
          {canRemove && (
            <button type="button" className="m6-rm" aria-label={`Remove ${x.name}`} title="Remove sub-section" onClick={onRemove}>
              <Trash2 className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className="m6-ssg">
        <span className="m6-mini wide">{TYPE_HELP[x.type]}</span>
        <div className="field" style={{ gap: 4 }}>
          <label className="m6-mini" htmlFor={`${id}-q`}>
            Questions
          </label>
          <NumberStepper
            id={`${id}-q`}
            aria-label="Questions"
            min={1}
            value={x.totalQuestions}
            width={116}
            invalid={!!e("totalQuestions")}
            onChange={(v) => {
              const n = v ?? 0;
              update((s) => {
                const wasAll = s.toAttempt === s.totalQuestions;
                s.totalQuestions = n;
                if (wasAll || s.toAttempt > n) s.toAttempt = n;
              });
              clear(`${p}.totalQuestions`, `${p}.toAttempt`, `${p}.paragraph.setSize`);
            }}
          />
        </div>
        <div className="field" style={{ gap: 4 }}>
          <label className="m6-mini" htmlFor={`${id}-att`}>
            To attempt
          </label>
          <NumberStepper
            id={`${id}-att`}
            aria-label="To attempt"
            min={1}
            value={x.toAttempt}
            invalid={!!e("toAttempt")}
            width={116}
            onChange={(n) => {
              update((s) => void (s.toAttempt = n ?? 0));
              clear(`${p}.toAttempt`);
            }}
          />
        </div>
        <div className="field" style={{ gap: 4 }}>
          <label className="m6-mini" htmlFor={`${id}-c`}>
            {CORRECT_LABEL[x.type]}
          </label>
          <AffixInput
            id={`${id}-c`}
            prefix="+"
            tone="plus"
            inputMode="decimal"
            aria-label="Marks if correct"
            invalid={!!e("marking.correct")}
            disabled={locked}
            value={fmt(x.marking.correct)}
            onChange={(ev) => {
              const v = num(ev.target.value);
              update((s) => void (s.marking.correct = Math.abs(v)));
              clear(`${p}.marking.correct`);
            }}
          />
        </div>
        <div className="field" style={{ gap: 4 }}>
          <label className="m6-mini" htmlFor={`${id}-w`}>
            Wrong
          </label>
          <AffixInput
            id={`${id}-w`}
            prefix="−"
            tone="minus"
            inputMode="decimal"
            aria-label="Marks taken off if wrong"
            invalid={!!e("marking.incorrect")}
            disabled={locked}
            value={fmt(x.marking.incorrect)}
            onChange={(ev) => {
              const v = num(ev.target.value);
              update((s) => void (s.marking.incorrect = -Math.abs(v)));
              clear(`${p}.marking.incorrect`);
            }}
          />
        </div>
      </div>
      {(["toAttempt", "totalQuestions", "marking.correct", "marking.incorrect"] as const).map(
        (k) =>
          e(k) && (
            <span key={k} className="m6-err-t">
              <TriangleAlert className="size-3.5" aria-hidden />
              {e(k)}
            </span>
          )
      )}

      {x.type === "paragraph" && (
        <div className="col" style={{ gap: 6 }}>
          <div className="row wrap" style={{ gap: 10, alignItems: "center" }}>
            <span className="sm">Questions under each paragraph are</span>
            <Segmented<ChildType | "mixed">
              size="sm"
              ariaLabel="Type of the questions under each paragraph"
              value={x.paragraph?.childType ?? "single"}
              options={childOptions.map((o) => ({ ...o, disabled: locked }))}
              onChange={(c) => !locked && update((s) => void (s.paragraph = { setSize: s.paragraph?.setSize ?? 2, childType: c }))}
            />
            <span className="sm">·</span>
            <label className="sm" htmlFor={`${id}-set`}>
              Questions per paragraph
            </label>
            <div style={{ width: 116 }}>
              <NumberStepper
                id={`${id}-set`}
                aria-label="Questions per paragraph"
                min={1}
                max={8}
                value={x.paragraph?.setSize ?? 1}
                invalid={!!e("paragraph.setSize")}
                width={116}
                onChange={(n) => {
                  update((s) => void (s.paragraph = { childType: s.paragraph?.childType ?? "single", setSize: n ?? 0 }));
                  clear(`${p}.paragraph.setSize`);
                }}
              />
            </div>
          </div>
          <span className="xs muted">
            Each paragraph&apos;s questions stay together
            {x.paragraph && x.paragraph.setSize > 0 && x.totalQuestions % x.paragraph.setSize === 0
              ? ` · ${x.totalQuestions / x.paragraph.setSize} paragraph${x.totalQuestions / x.paragraph.setSize === 1 ? "" : "s"} of ${x.paragraph.setSize}`
              : ""}
          </span>
          {e("paragraph.setSize") && (
            <span className="m6-err-t">
              <TriangleAlert className="size-3.5" aria-hidden />
              {e("paragraph.setSize")}
            </span>
          )}
        </div>
      )}

      {hasPartial(x.type) && (
        <div className="col" style={{ gap: 8 }}>
          <Checkbox
            checked={partialOn}
            disabled={locked}
            onChange={(on) =>
              update((s) => {
                s.marking.partial = on ? defaultMarking(s.type).partial : [];
              })
            }
          >
            <span className="sm">
              <b>Partial marking</b>{" "}
              <span className="muted">
                {x.type === "multiple" ? "· marks for some correct options when none are wrong" : "· marks for each row matched, when no row is wrong"}
              </span>
            </span>
          </Checkbox>
          {partialOn && (
            <div className="m6-pt">
              <span className="m6-mini">If the student picks…</span>
              <span className="m6-mini">Marks</span>
              {PARTIAL_COUNTS.map((k) => {
                const lv = x.marking.partial.find((l) => l.count === k);
                return (
                  <PartialRow
                    key={k}
                    when={x.type === "multiple" ? `${k} correct option${k === 1 ? "" : "s"}, none wrong` : `${k} row${k === 1 ? "" : "s"} right, none wrong`}
                    value={lv?.marks ?? 0}
                    disabled={locked}
                    onChange={(v) => {
                      update((s) => {
                        const rest = s.marking.partial.filter((l) => l.count !== k);
                        s.marking.partial = (v > 0 ? [...rest, { count: k, marks: v }] : rest).sort((a, b) => b.count - a.count);
                      });
                      clear(`${p}.marking.partial`);
                    }}
                  />
                );
              })}
              <span>Any wrong {unit}</span>
              <AffixInput
                prefix="−"
                tone="minus"
                inputMode="decimal"
                aria-label={`Marks taken off for any wrong ${unit}`}
                disabled={locked}
                value={fmt(x.marking.incorrect)}
                onChange={(ev) => {
                  const v = num(ev.target.value);
                  update((s) => void (s.marking.incorrect = -Math.abs(v)));
                }}
              />
            </div>
          )}
          {e("marking.partial") && (
            <span className="m6-err-t">
              <TriangleAlert className="size-3.5" aria-hidden />
              {e("marking.partial")}
            </span>
          )}
          <span className="row" style={{ gap: 8 }}>
            <span className="xs muted">Reads as</span>
            <span className="m6-rule">{readsAs(x.type, x.marking)}</span>
          </span>
        </div>
      )}
    </fieldset>
  );
}

function PartialRow({ when, value, disabled, onChange }: { when: string; value: number; disabled: boolean; onChange: (n: number) => void }) {
  return (
    <>
      <span>{when}</span>
      <AffixInput prefix="+" tone="plus" inputMode="decimal" aria-label={`Marks when ${when}`} disabled={disabled} value={value ? String(value) : "0"} onChange={(e) => onChange(Math.abs(num(e.target.value)))} />
    </>
  );
}
