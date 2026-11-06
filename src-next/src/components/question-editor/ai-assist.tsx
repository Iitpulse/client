"use client";
/*
  AI assist in the editor (board Admin-QuestionEditor right column + Kit-Math "AI conversion"). Contract: M5 assist,
  drafts and accept (api-ai docs/m5-api.md) + M6 (docs/m6-api.md "Assist on paragraph and matrix", "Image to LaTeX").

  - Single / multiple / numerical (as M5): Suggest tags → badges + Apply (fills the form); Translate to Hindi (streams
    into the Hindi stem; "Translation not used: an equation came back changed"); Draft a solution (streams; "AI draft ·
    check before saving", Accept / Discard, "Matches the answer key (A)" or "Answer differs from the key").
  - Paragraph / matrix (M6): one tag set for the whole question; the Hindi draft covers the passage and every child
    (or the stem, solution and every row) and is reviewed side by side on AI drafts; solutions per child ("Or one
    question: Q2 · no solution") or one for the matrix, checked against the key.
  - "Convert with AI" on a flagged image (kind latex): a draft card under the image; Accept puts $…$ in place of the
    image in the form.
  Apply / Accept only move a draft into the form; Save accepts each such draft (with the form's version when the
  teacher edited it), then sends the usual update. AI reads the saved question: "Save first?" when the form has
  unsaved changes, "Write and save the question first" on a new one. Daily limits, AI paused and rate limits as M5.
*/
import * as React from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { MathText } from "@iitpulse/ui";
import { aiAdmin, apiError, editorKind, questionsAdmin } from "@/lib/ai-admin";
import {
  acceptDraft,
  assistM6,
  discardDraft,
  isSampleDraft,
  sampleDraft,
  useQuestionsSource,
  type AiDraftM6,
  type DraftKindM6,
} from "@/lib/m6/questions";
import type { DuplicateCheckResponse, SolutionPayload, TagsPayload, TranslationPayload } from "@/lib/m5-contract";
import type { LatexPayload, SolutionPayloadM6, TranslationPayloadM6 } from "@/lib/m6-contract";
import { isBlankHtml, isMathsOnly, replaceImageWithLatex, type FieldImage } from "@/lib/latex-source";
import { KEY, getField, mapField, type Form } from "./form";
import { I, Note } from "./ui";

type Kind = "tags" | "translation" | "solution";

interface Applied {
  draft: AiDraftM6;
  snap: { chapters?: string[]; topics?: string[]; difficulty?: string; questionHi?: string; optionsHi?: Record<string, string>; solutionHi?: string; solutionEn?: string };
}

export interface Conversion {
  field: string;
  src: string;
  state: "running" | "ready" | "failed" | "accepted";
  draft?: AiDraftM6;
  latex?: string;
  error?: string;
}

const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** An AI solution (plain text with line breaks) as the editor's HTML: one paragraph per line. */
const solutionHtml = (t: string) => t.split(/\n/).map((l) => `<p>${l.trim() ? escHtml(l) : "<br>"}</p>`).join("");
const sameList = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((x, i) => x === b[i]);

const LIMIT_TEXT: Record<Kind, (n: number) => string> = {
  tags: (n) => `Today's ${n.toLocaleString("en-IN")} tag suggestions are used up. Suggest again after midnight.`,
  translation: (n) => `Today's ${n.toLocaleString("en-IN")} Hindi translations are used up. Translate again after midnight.`,
  solution: (n) => `Today's ${n.toLocaleString("en-IN")} solution drafts are used up. Draft again after midnight.`,
};
const WAIT_NOUN: Record<string, string> = { tags: "tag suggestion", translation: "Hindi draft", solution: "solution draft", latex: "LaTeX conversion" };

export interface AiAssistArgs {
  /** saved question id (null: a new question) */
  questionId: string | null;
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  /** the last saved form */
  saved: Form;
  dirty: boolean;
  loading: boolean;
  ro: boolean;
  setLang: (l: "en" | "hi") => void;
  /** saves; resolves true when saved */
  save: () => Promise<boolean>;
  /** chapter id of a chapter name (tags payload) */
  chapterIdOf: (name: string) => string | null;
  subjectId: string | null;
  notifyError: (title: string, description?: string) => void;
}

export function useAiAssist(a: AiAssistArgs) {
  const { questionId, form, setForm } = a;
  const pm = form.type === "paragraph" || form.type === "matrix";
  const [applied, setApplied] = React.useState<Partial<Record<Kind, Applied>>>({});
  const [running, setRunning] = React.useState<DraftKindM6 | null>(null);
  const [hiStream, setHiStream] = React.useState<string | null>(null);
  const [hiFailed, setHiFailed] = React.useState<AiDraftM6 | null>(null);
  const [sol, setSol] = React.useState<{ draft: AiDraftM6 | null; text: string; state: "streaming" | "ready" | "accepted" } | null>(null);
  const [tagsDraft, setTagsDraft] = React.useState<AiDraftM6 | null>(null);
  const [pmHi, setPmHi] = React.useState<AiDraftM6 | null>(null);
  const [pmSol, setPmSol] = React.useState<AiDraftM6 | null>(null);
  const [failed, setFailed] = React.useState<{ kind: Kind; title: string; message: string } | null>(null);
  const [askSave, setAskSave] = React.useState<{ kind: Kind; childId?: string } | null>(null);
  const [limits, setLimits] = React.useState<Partial<Record<Kind, number>>>({});
  const [waiting, setWaiting] = React.useState<AiDraftM6[]>([]);
  const [dups, setDups] = React.useState<DuplicateCheckResponse["results"][number]["matches"] | null>(null);
  const [dupBusy, setDupBusy] = React.useState(false);
  const [conv, setConv] = React.useState<Record<string, Conversion>>({});
  const [latexApplied, setLatexApplied] = React.useState<AiDraftM6[]>([]);
  const abort = React.useRef<AbortController | null>(null);
  const sample = useQuestionsSource("latex", "assistPM") === "sample";
  React.useEffect(() => () => abort.current?.abort(), []);

  // Drafts already waiting for this question (a bulk run, or an assist the teacher left)
  React.useEffect(() => {
    if (!questionId) return;
    let live = true;
    aiAdmin
      .drafts({ questionId, status: "ready" })
      .then((r) => live && setWaiting(r.items as unknown as AiDraftM6[]))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [questionId]);

  /* ---------- fixtures for M6 features not on this backend yet ---------- */
  const sampleFor = (kind: DraftKindM6, extra: { childId?: string; field?: string; src?: string } = {}): AiDraftM6 => {
    const qid = questionId ?? "new";
    if (kind === "latex") {
      const payload: LatexPayload = { field: extra.field ?? "en.question", imageSrc: extra.src ?? "", latex: "\\displaystyle\\int_0^{\\pi/2} \\sin^2 x\\,dx" };
      return sampleDraft(qid, "latex", payload);
    }
    if (kind === "tags") {
      const ch = form.chapters[0] ?? "";
      return sampleDraft(qid, "tags", { subject: null, chapters: ch ? [{ id: a.chapterIdOf(ch) ?? ch, name: ch }] : [], topics: [], difficulty: form.difficulty || "medium" } as TagsPayload);
    }
    if (kind === "translation") {
      const p: TranslationPayloadM6 = {
        hi: {
          question: form.hi.question || form.en.question,
          ...(form.type === "paragraph"
            ? { passage: form.passage.hi || form.passage.en, children: form.children.map((c) => ({ id: c.id, question: c.hi.question || c.en.question, options: c.options.map((o) => ({ id: o.id, value: o.hi || o.en })), solution: c.hi.solution || c.en.solution })) }
            : {}),
          ...(form.type === "matrix"
            ? { matrix: { listI: form.listI.map((r) => ({ id: r.id, value: r.hi || r.en })), listII: form.listII.map((r) => ({ id: r.id, value: r.hi || r.en })) } }
            : {}),
        },
      };
      return sampleDraft(qid, "translation", p as unknown as AiDraftM6["payload"]);
    }
    const kids = form.children.filter((c) => (extra.childId ? c.id === extra.childId : isBlankHtml(c.en.solution)));
    const p: SolutionPayloadM6 =
      form.type === "paragraph"
        ? { children: kids.map((c) => ({ childId: c.id, solution: "Worked solution (sample).", statedAnswer: c.type === "integer" ? { value: Number(c.from) || 0 } : { optionIds: c.correct.slice(0, 1) }, keyAgreement: "agrees" as const })) }
        : { solution: "Worked solution (sample).", statedAnswer: { matches: form.matches }, };
    return sampleDraft(qid, "solution", p as unknown as AiDraftM6["payload"], { checks: { keyAgreement: "agrees" } } as Partial<AiDraftM6>);
  };

  /* ---------- running an assist ---------- */
  const handleError = (kind: Kind, e: unknown) => {
    const err = apiError(e);
    if (kind === "translation") setHiStream(null);
    if (kind === "solution") setSol(null);
    if (err.code === "ADMIN_AI_DAILY_LIMIT") setLimits((l) => ({ ...l, [kind]: Number(err.details?.perDay ?? 0) }));
    else
      a.notifyError(
        "AI assist is not available",
        err.code === "AI_RATE_LIMITED"
          ? `Too many AI requests this hour. Try again in ${Math.max(1, Math.ceil(Number(err.details?.retryAfterSeconds ?? 60) / 60))} min.`
          : err.code === "AI_PAUSED"
            ? "AI is switched off for now. Try again later."
            : err.message
      );
  };

  const finish = (kind: Kind, d: AiDraftM6) => {
    setWaiting((w) => w.filter((x) => !(x.kind === kind && x.status === "ready")));
    if (d.status !== "ready") {
      const message = (d.error as { message?: string } | null)?.message || "The AI could not make this draft. Try again.";
      if (kind === "translation" && !pm) {
        setHiStream(null);
        setHiFailed(d);
        return;
      }
      if (kind === "solution") setSol(null);
      const code = (d.error as { code?: string } | null)?.code;
      setFailed({ kind, title: kind === "tags" ? (code === "NO_VALID_TAGS" ? "No tags suggested from your chapter list" : "Couldn't suggest tags") : kind === "translation" ? "Couldn't translate" : "Couldn't draft a solution", message });
      return;
    }
    if (kind === "tags") setTagsDraft(d);
    else if (pm) {
      if (kind === "translation") setPmHi(d);
      else setPmSol(d);
    } else if (kind === "translation") {
      setHiStream(null);
      applyTranslation(d);
    } else setSol({ draft: d, text: (d.payload as SolutionPayload).solution, state: "ready" });
  };

  const run = async (kind: Kind, opts: { saved?: boolean; childId?: string } = {}) => {
    if (!questionId || a.loading) return;
    if (a.dirty && !opts.saved) {
      setAskSave({ kind, childId: opts.childId });
      return;
    }
    setAskSave(null);
    setFailed(null);
    if (kind === "translation") {
      setHiFailed(null);
      if (pm) setPmHi(null);
      else {
        setHiStream("");
        a.setLang("hi");
      }
    }
    if (kind === "solution") {
      if (pm) setPmSol(null);
      else {
        setSol({ draft: null, text: "", state: "streaming" });
        a.setLang("en");
      }
    }
    if (kind === "tags") setTagsDraft(null);
    setRunning(kind);
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    try {
      const d = await assistM6(
        questionId,
        { kind, ...(opts.childId ? { childId: opts.childId } : {}) },
        pm ? "assistPM" : null,
        () => sampleFor(kind, { childId: opts.childId }),
        {
          onDelta: (part, text) => {
            if (part === "stem" && kind === "translation" && !pm) setHiStream((x) => (x ?? "") + text);
            if (part === "solution" && kind === "solution" && !pm) setSol((x) => (x ? { ...x, text: x.text + text } : x));
          },
        },
        ac.signal
      );
      finish(kind, d);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      handleError(kind, e);
    } finally {
      setRunning((r) => (r === kind ? null : r));
    }
  };

  const saveAndDraft = async () => {
    const ask = askSave;
    if (!ask) return;
    setAskSave(null);
    const ok = await a.save();
    if (ok) run(ask.kind, { saved: true, childId: ask.childId });
  };

  /* ---------- drafts into the form ---------- */
  const applyTranslation = (d: AiDraftM6) => {
    const hi = (d.payload as TranslationPayload).hi;
    const optionsHi: Record<string, string> = {};
    for (const o of hi.options ?? []) optionsHi[o.id] = o.value ?? "";
    setForm((f) => ({
      ...f,
      hi: { question: hi.question, solution: hi.solution ?? f.hi.solution },
      options: f.options.map((o) => (optionsHi[o.id] === undefined ? o : { ...o, hi: optionsHi[o.id] })),
    }));
    setApplied((m) => ({ ...m, translation: { draft: d, snap: { questionHi: hi.question, optionsHi, ...(hi.solution !== undefined ? { solutionHi: hi.solution } : {}) } } }));
  };
  const applyTags = () => {
    if (!tagsDraft) return;
    const p = tagsDraft.payload as TagsPayload;
    const snap = { chapters: p.chapters.map((c) => c.name), topics: p.topics.map((t) => t.name), difficulty: p.difficulty };
    setForm((f) => ({ ...f, ...snap, ...(p.subject && !f.subject ? { subject: p.subject.name } : {}) }));
    setApplied((m) => ({ ...m, tags: { draft: tagsDraft, snap } }));
    setTagsDraft(null);
  };
  const acceptSolution = () => {
    if (!sol?.draft) return;
    const html = solutionHtml((sol.draft.payload as SolutionPayload).solution);
    setForm((f) => ({ ...f, en: { ...f.en, solution: html } }));
    setApplied((m) => ({ ...m, solution: { draft: sol.draft!, snap: { solutionEn: html } } }));
    setSol({ ...sol, state: "accepted" });
    a.setLang("en");
  };
  const discardSolution = () => {
    if (sol?.draft) discardDraft(sol.draft.id);
    setSol(null);
  };
  const discardPm = (which: "hi" | "sol") => {
    const d = which === "hi" ? pmHi : pmSol;
    if (d) discardDraft(d.id);
    if (which === "hi") setPmHi(null);
    else setPmSol(null);
  };

  /* ---------- Convert with AI (latex) ---------- */
  const convert = (field: string) => (img: FieldImage) => {
    if (!questionId) {
      a.notifyError("Save the question first", "AI reads the saved question. Save it, then convert the image.");
      return;
    }
    if (a.dirty) {
      a.notifyError("Save first", "AI reads the saved question, and you have unsaved changes. Save, then convert.");
      return;
    }
    const key = `${field}|${img.src}`;
    setConv((c) => ({ ...c, [key]: { field, src: img.src, state: "running" } }));
    assistM6(questionId, { kind: "latex", target: { field, imageSrc: img.src } }, "latex", () => sampleFor("latex", { field, src: img.src }))
      .then((d) => {
        if (d.status !== "ready") {
          setConv((c) => ({ ...c, [key]: { field, src: img.src, state: "failed", error: (d.error as { message?: string } | null)?.message || "Couldn't read the image. Type it instead." } }));
          return;
        }
        const p = d.payload as LatexPayload;
        setConv((c) => ({ ...c, [key]: { field, src: img.src, state: "ready", draft: d, latex: p.latex } }));
      })
      .catch((e) => {
        const err = apiError(e);
        setConv((c) => ({ ...c, [key]: { field, src: img.src, state: "failed", error: err.code === "AI_PAUSED" ? "AI is switched off for now. Try again later." : err.message } }));
      });
  };
  const acceptLatex = (key: string) => {
    const c = conv[key];
    if (!c?.draft || !c.latex) return;
    setForm((f) => mapField(f, c.field, (h) => replaceImageWithLatex(h, c.src, c.latex!)) ?? f);
    setLatexApplied((l) => [...l, c.draft!]);
    setConv((x) => {
      const n = { ...x };
      delete n[key];
      return n;
    });
  };
  const discardLatex = (key: string) => {
    const c = conv[key];
    if (c?.draft) discardDraft(c.draft.id);
    setConv((x) => {
      const n = { ...x };
      delete n[key];
      return n;
    });
  };
  // The AI-conversion panel under one image of a field (a render function MathField calls, not a component)
  const latexExtra = (field: string) =>
    function renderLatexExtra(img: FieldImage) {
      const key = `${field}|${img.src}`;
      const c = conv[key];
      if (!c) return null;
      if (c.state === "running")
        return (
          <div className="ai col gap-2 rounded-[12px] px-3.5 py-3 mx-3.5 mb-3" role="status">
            <span className="ai-mark">
              {I.spin()}Reading the image…
            </span>
          </div>
        );
      if (c.state === "failed")
        return (
          <Note tone="err" className="mx-3.5 mb-3" role="alert">
            {I.err(16)}
            <span className="sm grow">{c.error}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => convert(field)(img)}>
              Try again
            </button>
          </Note>
        );
      return (
        <div className="ai col gap-2.5 rounded-[12px] px-3.5 py-3 mx-3.5 mb-3 pop">
          <span className="ai-mark">
            {I.spark()}Read from the image
            {isSampleDraft(c.draft?.id ?? "") && <span className="badge b-grey ml-2">Sample data</span>}
          </span>
          <code className="mono sm" style={{ background: "var(--navy-50)", color: "var(--navy)", borderRadius: 4, padding: "1px 4px", alignSelf: "flex-start" }}>
            ${c.latex}$
          </code>
          <MathText text={`$${c.latex}$`} as="p" className="m-0 font-serif text-[16px]" />
          <div className="row gap-2">
            <span className="badge b-navy">AI draft · check before saving</span>
            <button type="button" className="btn btn-primary btn-sm ml-auto" onClick={() => acceptLatex(key)}>
              Accept
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => discardLatex(key)}>
              Discard
            </button>
          </div>
          <span className="xs muted">Accept replaces the image with the LaTeX and removes the flag. Discard keeps the flag.</span>
        </div>
      );
    };

  /* ---------- Save: accept the drafts the form holds ---------- */
  function editedPayload(kind: Kind, ap: Applied, f: Form): unknown | null {
    const s = ap.snap;
    if (kind === "tags") {
      if (sameList(f.chapters, s.chapters) && sameList(f.topics, s.topics) && f.difficulty === s.difficulty) return null;
      const p = ap.draft.payload as TagsPayload;
      const chapters = f.chapters.map((name) => ({ id: p.chapters.find((x) => x.name === name)?.id || a.chapterIdOf(name) || "", name })).filter((c) => c.id);
      const topics = p.topics.filter((t) => f.topics.includes(t.name) && chapters.some((c) => c.id === t.chapterId));
      return { subject: null, chapters, topics, difficulty: f.difficulty || p.difficulty };
    }
    if (kind === "translation") {
      const optsSame = f.options.every((o) => s.optionsHi?.[o.id] === undefined || s.optionsHi[o.id] === o.hi);
      if (f.hi.question === s.questionHi && optsSame && (s.solutionHi === undefined || f.hi.solution === s.solutionHi)) return null;
      const p = (ap.draft.payload as TranslationPayload).hi;
      return { hi: { question: f.hi.question, ...(p.options ? { options: f.options.map((o) => ({ id: o.id, value: o.hi })) } : {}), ...(p.solution !== undefined ? { solution: f.hi.solution } : {}) } };
    }
    if (f.en.solution === s.solutionEn) return null;
    return { solution: f.en.solution, statedAnswer: (ap.draft.payload as SolutionPayload).statedAnswer };
  }

  /** Accepts every draft the form holds. false = stop the save (the toast says why). */
  const acceptAll = async (f: Form): Promise<boolean> => {
    for (const k of Object.keys(applied) as Kind[]) {
      const ap = applied[k]!;
      try {
        await acceptDraft(ap.draft.id, editedPayload(k, ap, f) ?? undefined);
      } catch (e) {
        const err = apiError(e);
        if (err.code === "DRAFT_ALREADY_DECIDED") continue;
        a.notifyError(
          "Couldn't save the AI draft",
          err.code === "DRAFT_STALE"
            ? "Someone changed this question after the draft was made. Reload the page to see the latest version."
            : err.code === "DRAFT_CHECK_FAILED"
              ? ((err.details?.checks as { problems?: string[] } | undefined)?.problems?.join(" ") ?? err.message)
              : err.message
        );
        return false;
      }
    }
    for (const d of latexApplied) {
      try {
        await acceptDraft(d.id);
      } catch (e) {
        const err = apiError(e);
        if (err.code !== "DRAFT_ALREADY_DECIDED" && err.code !== "DRAFT_STALE") {
          a.notifyError("Couldn't save the LaTeX conversion", err.message);
          return false;
        }
      }
    }
    return true;
  };
  const afterSave = () => {
    const ids = new Set([...Object.values(applied).map((x) => x!.draft.id), ...latexApplied.map((d) => d.id)]);
    setApplied({});
    setLatexApplied([]);
    setSol((x) => (x?.state === "accepted" ? null : x));
    setWaiting((w) => w.filter((d) => !ids.has(d.id)));
  };
  const discardAll = () => {
    for (const ap of Object.values(applied)) if (ap) discardDraft(ap.draft.id);
    for (const d of latexApplied) discardDraft(d.id);
    if (sol?.draft && sol.state !== "accepted" && !applied.solution) discardDraft(sol.draft.id);
    setApplied({});
    setLatexApplied([]);
    setSol(null);
    setTagsDraft(null);
    setHiFailed(null);
  };

  const checkDuplicates = async () => {
    const text = form.type === "paragraph" ? form.passage.en : form.en.question;
    setDupBusy(true);
    try {
      const r = await questionsAdmin.duplicates({ items: [{ key: "q", text, ...(questionId ? { excludeId: questionId } : {}), ...(a.subjectId ? { subjectId: a.subjectId } : {}) }] });
      setDups(r.results[0]?.matches ?? []);
    } catch (e) {
      a.notifyError("Couldn't check for duplicates", apiError(e).message);
    } finally {
      setDupBusy(false);
    }
  };

  return {
    pm, running, hiStream, hiFailed, sol, tagsDraft, pmHi, pmSol, failed, askSave, limits, waiting, dups, dupBusy, sample, applied,
    run, saveAndDraft, setAskSave, applyTags, acceptSolution, discardSolution, discardPm, convert, latexExtra, acceptAll, afterSave,
    discardAll, checkDuplicates, setFailed,
  };
}

export type AiAssist = ReturnType<typeof useAiAssist>;

/* ─────────────────────────────── the panel ─────────────────────────────── */

export function AiAssistPanel({ ai, form, isNew, questionId, ro }: { ai: AiAssist; form: Form; isNew: boolean; questionId: string | null; ro: boolean }) {
  const para = form.type === "paragraph";
  const mx = form.type === "matrix";
  const off = !!ai.askSave || !!ai.running || isNew || ro;
  const kids = form.children;

  const tagLabel = para ? "Suggest chapter, topic, difficulty for the passage" : mx ? "Suggest chapter, topic, difficulty from the lists" : "Suggest chapter, topic, difficulty";
  const hiLabel = para ? "Translate passage and questions to Hindi" : mx ? "Translate stem and List I / List II to Hindi" : "Translate to Hindi";
  const solLabel = para ? "Draft solutions for questions without one" : mx ? "Draft a solution for the whole question" : "Draft a solution";

  const waiting = ai.waiting.filter((d) => d.status === "ready" && d.kind !== ai.running && !ai.applied[d.kind as Kind] && !(d.kind === "tags" && ai.tagsDraft) && !(d.kind === "solution" && ai.sol));
  const btn = (kind: Kind, label: string, extraOff = false) => (
    <button type="button" className="btn btn-secondary justify-start" disabled={off || extraOff || !!ai.limits[kind]} onClick={() => ai.run(kind)}>
      {ai.running === kind ? I.spin() : I.spark()}
      {label}
    </button>
  );

  // tag badges
  const tagBadges = (() => {
    if (!ai.tagsDraft) return null;
    const p = ai.tagsDraft.payload as TagsPayload;
    const ch = p.chapters.map((c) => c.name);
    const tp = p.topics.map((t) => t.name);
    const chDiff = !sameList(ch, form.chapters);
    const tpDiff = !sameList(tp, form.topics);
    const dfDiff = p.difficulty !== form.difficulty;
    const none = !chDiff && !tpDiff && !dfDiff;
    const lv = { easy: "b-green", medium: "b-amber", hard: "b-live" }[p.difficulty] ?? "b-grey";
    return (
      <div className="row wrap gap-1.5">
        {(chDiff || none) && ch.length > 0 && <span className="badge b-navy pop max-w-full truncate">Chapter: {ch.join(", ")}</span>}
        {(tpDiff || none) && tp.length > 0 && <span className="badge b-navy pop max-w-full truncate">Topic: {tp.join(", ")}</span>}
        {(dfDiff || none) && (
          <span className={`badge ${lv} pop`}>
            {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
            {dfDiff ? "?" : ""}
          </span>
        )}
        <button type="button" className="btn btn-primary btn-sm pop" onClick={ai.applyTags}>
          Apply
        </button>
      </div>
    );
  })();

  // paragraph / matrix Hindi draft parts
  const hiParts = (() => {
    if (!ai.pmHi) return null;
    const ok = "badge b-green";
    const parts: Array<{ part: string; state: string; cls: string }> = [];
    if (para) {
      parts.push({ part: "Hindi passage", state: "Ready", cls: ok });
      kids.forEach((c, i) => {
        const opts = c.options.length ? `, options ${KEY(0)}–${KEY(c.options.length - 1)}` : "";
        parts.push({ part: c.type === "integer" ? `Q${i + 1} stem and solution (numerical, no options)` : `Q${i + 1} stem${opts}, solution`, state: "Ready", cls: ok });
      });
    } else {
      parts.push({ part: "Stem and solution", state: "Ready", cls: ok });
      const noHi = form.listI.filter((r) => isBlankHtml(r.hi)).map((r) => r.id);
      parts.push({ part: `List I rows ${form.listI[0]?.id}–${form.listI[form.listI.length - 1]?.id}${noHi.length ? ` (row ${noHi.join(", ")} had no Hindi)` : ""}`, state: "Ready", cls: ok });
      const mathsOnly = form.listII.every((r) => isMathsOnly(r.en));
      parts.push({ part: `List II rows ${form.listII[0]?.id}–${form.listII[form.listII.length - 1]?.id}${mathsOnly ? ": maths only, kept as is" : ""}`, state: mathsOnly ? "Same" : "Ready", cls: mathsOnly ? "badge b-grey" : ok });
    }
    const rowsN = form.listI.length + form.listII.length;
    return (
      <div className="qe-draft pop">
        <span className="xs font-semibold">Hindi draft · {para ? `passage + ${kids.length === 1 ? "1 question" : `${kids.length} questions`}` : `stem, solution, ${rowsN} rows`}</span>
        {parts.map((h) => (
          <span key={h.part} className="row items-start gap-2 text-[12px]">
            <span className={`${h.cls} shrink-0`}>{h.state}</span>
            <span className="grow">{h.part}</span>
          </span>
        ))}
        <span className="row gap-1.5">
          <Link href={`/questions/drafts?questionId=${encodeURIComponent(questionId ?? "")}`} className="btn btn-primary btn-sm">
            Review side by side
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => ai.discardPm("hi")}>
            Discard
          </button>
        </span>
        <span className="xs muted">LaTeX and images checked in every part. Option and row labels stay the same.</span>
      </div>
    );
  })();

  // paragraph / matrix solution draft rows
  const solCard = (() => {
    if (!ai.pmSol) return null;
    const p = ai.pmSol.payload as SolutionPayloadM6;
    const ok = "badge b-green";
    const bad = "badge b-amber";
    const rows: Array<{ state: string; cls: string; text: string }> = [];
    let head = "Solution draft";
    if (para) {
      const items = p.children ?? [];
      const names = items.map((c) => `Q${kids.findIndex((k) => k.id === c.childId) + 1}`);
      head = items.length === 1 ? `Solution draft · ${names[0]}${kids.filter((k) => isBlankHtml(k.en.solution)).length === 1 ? " (the only one without a solution)" : ""}` : `Solution drafts · ${names.join(", ")}`;
      items.forEach((c, i) => {
        const kid = kids.find((k) => k.id === c.childId);
        const stated = c.statedAnswer?.value !== undefined ? String(c.statedAnswer.value) : (c.statedAnswer?.optionIds ?? []).map((id) => KEY(Math.max(0, kid?.options.findIndex((o) => o.id === id) ?? 0))).join(", ");
        const key = kid ? (kid.type === "integer" ? kid.from : kid.options.map((o, j) => (kid.correct.includes(o.id) ? KEY(j) : null)).filter(Boolean).join(", ")) : "";
        rows.push(
          c.keyAgreement === "disagrees"
            ? { state: "Differs", cls: bad, text: `${names[i]}: the draft gets ${stated || "another answer"}; your answer is ${key || "not set"}. Check the key before you accept.` }
            : { state: "Agrees", cls: ok, text: `${names[i]}: the draft gets ${stated || "the same answer"}, same as your answer.` }
        );
      });
    } else {
      head = "Solution draft · checked against your matches";
      const stated = (p.statedAnswer?.matches ?? {}) as Record<string, string[]>;
      const agree: string[] = [];
      const differ: string[] = [];
      for (const r of form.listI) {
        const mine = [...(form.matches[r.id] ?? [])].sort().join(",");
        const theirs = [...(stated[r.id] ?? [])].sort().join(",");
        if (mine && mine === theirs) agree.push(`${r.id}→${mine.replace(/,/g, "+")}`);
        else differ.push(!mine ? `Row ${r.id}: you ticked nothing yet; the draft says ${theirs.replace(/,/g, "+") || "nothing"}. Tick it in the grid or check the draft.` : `Row ${r.id}: you ticked ${mine.replace(/,/g, "+")}; the draft says ${theirs.replace(/,/g, "+") || "nothing"}.`);
      }
      if (agree.length) rows.push({ state: "Agrees", cls: ok, text: `Rows ${agree.map((x) => x.split("→")[0]).join(", ")} match what you ticked (${agree.join(", ")}).` });
      for (const d of differ) rows.push({ state: "Differs", cls: bad, text: d });
    }
    return (
      <div className="qe-draft pop">
        <span className="xs font-semibold">{head}</span>
        {rows.map((r, i) => (
          <span key={i} className="row items-start gap-2 text-[12px]">
            <span className={`${r.cls} shrink-0`}>{r.state}</span>
            <span className="grow">{r.text}</span>
          </span>
        ))}
        <span className="row gap-1.5">
          <Link href={`/questions/drafts?questionId=${encodeURIComponent(questionId ?? "")}`} className="btn btn-primary btn-sm">
            Review
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => ai.discardPm("sol")}>
            Discard
          </button>
        </span>
      </div>
    );
  })();

  return (
    <section className="ai pad-lg col gap-3" aria-label="AI assist">
      <span className="ai-mark">
        {I.spark()}AI assist
        {ai.sample && <span className="badge b-grey ml-2">Sample data</span>}
      </span>
      <span className="xs muted">Drafts only. Nothing is saved until you accept it.</span>
      {waiting.length > 0 && (
        <Note>
          {I.clock()}
          <span className="sm grow">
            {waiting.length === 1
              ? `A ${WAIT_NOUN[waiting[0].kind] ?? "draft"}${waiting[0].jobId ? (dayjs(waiting[0].createdAt).isSame(dayjs(), "day") ? " from today's bulk run" : ` from the bulk run on ${dayjs(waiting[0].createdAt).format("D MMM")}`) : ""} is waiting.`
              : `${waiting.length} AI drafts for this question are waiting.`}
          </span>
          <Link href={`/questions/drafts?questionId=${encodeURIComponent(questionId ?? "")}`} className="btn btn-ghost btn-sm">
            Review
          </Link>
        </Note>
      )}
      {ai.askSave && (
        <Note tone="warn" className="pop">
          {I.save()}
          <span className="col grow gap-2">
            <span className="sm">
              <b>Save first?</b> AI works from the saved question, and you have unsaved changes.
            </span>
            <span className="row gap-1.5">
              <button type="button" className="btn btn-primary btn-sm" onClick={ai.saveAndDraft}>
                Save and draft
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => ai.setAskSave(null)}>
                Cancel
              </button>
            </span>
          </span>
        </Note>
      )}
      {isNew && (
        <Note>
          {I.info()}
          <span className="sm">Write and save the question first. AI works from the saved question.</span>
        </Note>
      )}
      {(Object.entries(ai.limits) as [Kind, number][]).map(([k, n]) => (
        <Note key={k} tone="warn">
          {I.clock()}
          <span className="sm">{LIMIT_TEXT[k](n)}</span>
        </Note>
      ))}
      {(para || mx) && !isNew && (
        <Note>
          {I.lines()}
          <span className="sm">
            {para
              ? `Reads the passage and all ${kids.length === 1 ? "1 question" : `${kids.length} questions`}. Tags are one set for the whole passage; Hindi covers the passage and every question; solutions are written per question.`
              : "Reads the stem and every List I and List II row. Tags are one set; Hindi covers the stem, the solution and each row; the solution is checked against the matches you ticked."}
          </span>
        </Note>
      )}
      {ai.failed && (
        <Note tone="err" className="pop" role="alert">
          {I.err(16)}
          <span className="col grow gap-1">
            <span className="sm font-semibold">{ai.failed.title}</span>
            <span className="sm">{ai.failed.message}</span>
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => ai.run(ai.failed!.kind)} disabled={!!ai.running}>
            Try again
          </button>
        </Note>
      )}
      {btn("tags", tagLabel)}
      {tagBadges}
      {btn("translation", hiLabel)}
      {hiParts}
      {btn("solution", solLabel)}
      {para && !isNew && kids.length > 0 && (
        <div className="row wrap items-center gap-1.5">
          <span className="xs muted">Or one question:</span>
          {kids.map((c, i) => (
            <button key={c.id} type="button" className="qe-chip-btn" disabled={off} onClick={() => ai.run("solution", { childId: c.id })}>
              Q{i + 1}
              <span className="muted ml-1">· {isBlankHtml(c.en.solution) ? "no solution" : "has one"}</span>
            </button>
          ))}
        </div>
      )}
      {solCard}
      <div className="col gap-2">
        <button type="button" className="btn btn-secondary justify-start" onClick={ai.checkDuplicates} disabled={ai.dupBusy || isBlankHtml(para ? form.passage.en : form.en.question)}>
          {ai.dupBusy ? I.spin() : I.spark()}
          Check for duplicates
          {ai.dups && <span className={`badge ml-auto ${ai.dups.length ? "b-amber" : "b-grey"}`}>{ai.dups.length} similar</span>}
        </button>
        {ai.dups?.map((m) => (
          <div key={m.questionId} className="row gap-2.5 rounded-[10px] border border-brand-100 bg-surface py-2 pr-2 pl-3">
            <span className="mono xs muted max-w-[96px] shrink-0 truncate" title={m.questionId}>
              {m.questionId}
            </span>
            <MathText text={m.stemPreview} className="xs min-w-0 grow truncate" />
            <Link href={`/questions/${m.questionId}/edit?type=${editorKind(m.type)}`} className="btn btn-ghost btn-sm" target="_blank">
              Open
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Under the Hindi stem: a translation whose check failed ("an equation came back changed"). */
export function HiFailedNote({ ai }: { ai: AiAssist }) {
  const d = ai.hiFailed;
  if (!d) return null;
  const checks = (d.checks ?? {}) as { missingMath?: string[]; problems?: string[] };
  const missing = checks.missingMath ?? [];
  return (
    <Note tone="err" className="pop">
      {I.err(16)}
      <span className="col grow gap-1">
        <span className="sm font-semibold">{missing.length ? "Translation not used: an equation came back changed" : "Translation not used"}</span>
        <span className="sm">
          {missing.length ? (
            <>
              Missing from the Hindi: <MathText text={missing.map((m) => `$${m}$`).join(", ")} />. Try again, or type the Hindi yourself.
            </>
          ) : (
            (checks.problems?.join(" ") || (d.error as { message?: string } | null)?.message || "The draft didn't pass the checks.") + " Try again, or type the Hindi yourself."
          )}
        </span>
      </span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => ai.run("translation")}>
        Try again
      </button>
    </Note>
  );
}

/** Solution draft states under the solution field (single / multiple / numerical). */
export function SolutionDraftState({ ai, form }: { ai: AiAssist; form: Form }) {
  const s = ai.sol;
  if (!s) return null;
  if (s.state === "accepted") return <span className="badge b-green pop self-start">Solution accepted</span>;
  if (s.state === "streaming") return null;
  const agreement = (s.draft?.checks as { keyAgreement?: string } | null)?.keyAgreement;
  const p = s.draft?.payload as SolutionPayload | undefined;
  const stated = p?.statedAnswer?.optionIds?.length
    ? p.statedAnswer.optionIds.map((id) => KEY(Math.max(0, form.options.findIndex((o) => o.id === id)))).join(", ")
    : p?.statedAnswer?.value !== undefined
      ? String(p.statedAnswer.value)
      : "";
  const key =
    form.type === "integer"
      ? form.numMode === "exact"
        ? form.exact
        : `${form.from} to ${form.to}`
      : form.options.map((o, i) => (form.correct.includes(o.id) ? KEY(i) : null)).filter(Boolean).join(", ");
  return (
    <>
      {agreement === "agrees" && (
        <span className="badge b-green pop self-start">
          {I.tick(12)}Matches the answer key{key ? ` (${key})` : ""}
        </span>
      )}
      {agreement === "disagrees" && (
        <Note tone="warn" className="pop">
          {I.info()}
          <span className="col gap-0.5">
            <span className="sm font-semibold">
              Answer differs from the key: draft says {stated ? `(${stated})` : "something else"}, key says {key ? `(${key})` : "nothing yet"}
            </span>
            <span className="sm">Check the working and the key before you accept.</span>
          </span>
        </Note>
      )}
      <div className="row pop gap-2">
        <span className="badge b-navy">
          {I.spark()}AI draft · check before saving
        </span>
        <button type="button" className="btn btn-primary btn-sm" onClick={ai.acceptSolution}>
          Accept
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={ai.discardSolution}>
          Discard
        </button>
      </div>
    </>
  );
}

export { getField };
