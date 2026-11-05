"use client";
/*
  The question editor (board Admin-QuestionEditor, canvas v166), one component for /questions/new,
  /questions/[id]/edit and /questions/new?from=<id> (Duplicate as new). Sections live next to this file:
  form.ts (model, conversions, checks), options / numerical / paragraph / matrix (the type's body), classify
  ("Where it belongs" + New topic), ai-assist (AI panel, Hindi/solution drafts, Convert with AI), preview (Student
  preview). Every text field is the kit LaTeX field (components/kit/math-field): maths between $…$ with a live
  KaTeX preview, pictures with alt text and size, equation pictures flagged "needs LaTeX" (never blocked).

  Lifecycle (contract api-ai docs/m6-api.md "questions"): new → Save (or Save and add another) → edit; Unsaved
  changes; Saving…; "Couldn't save. The server didn't answer." with Try again; field errors with the top summary
  (server VALIDATION_ERROR fields too); a likely duplicate asks before saving a new question; in a live test the
  question is locked (409 QUESTION_IN_LIVE_TEST) and in a scheduled one a note says students will see the change;
  Delete is soft with Undo (no "Are you sure?"), blocked while a test using it is live; Deleted + Restore.
*/
import "./editor.css";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { MathField } from "@/components/kit/math-field";
import { Segmented } from "@/components/kit/Segmented";
import { ErrorSummary, ServerErrorBanner } from "@/components/kit/Field";
import { Banner } from "@/components/kit/Banner";
import { BlockedDialog, UnsavedChangesDialog } from "@/components/kit/Confirm";
import { KitDialog } from "@/components/kit/Overlay";
import { notify } from "@/components/kit/Toast";
import { NotFoundState } from "@/components/kit/PageState";
import { fmtDateTime, fmtRelative, fmtTime } from "@/components/kit/utils";
import { MathText } from "@iitpulse/ui";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";
import { apiError, questionsAdmin } from "@/lib/ai-admin";
import { fieldErrors } from "@/lib/m6/client";
import { fetchQuestion, kindFromParam, useSources, useSubjects, type BankQuestion } from "@/lib/question-queries";
import {
  deleteQuestion,
  liveTestDetails,
  m6Questions,
  questionUsage,
  restoreQuestion,
  source,
  taxonomy,
  undoDelete,
  uploadMedia,
} from "@/lib/m6/questions";
import type { QuestionUsageM6, SoftDeleteResponse } from "@/lib/m6-contract";
import { isBlankHtml } from "@/lib/latex-source";
import {
  TYPE_HINT,
  TYPE_TABS,
  emptyForm,
  formFrom,
  hindiMissing,
  kindOf,
  serverIssues,
  switchType,
  typeFromParam,
  validate,
  writeBody,
  type ChildF,
  type FieldIssue,
  type Form,
  type Lang,
} from "./form";
import { EditorProvider, useFieldProps, type EditorCtx } from "./context";
import { OptionsEditor } from "./options";
import { NumericalAnswer } from "./numerical";
import { ParagraphChildren } from "./paragraph";
import { MatrixEditor } from "./matrix";
import { Classification } from "./classify";
import { AiAssistPanel, HiFailedNote, SolutionDraftState, useAiAssist } from "./ai-assist";
import { StudentPreview } from "./preview";
import { HindiMissing, I } from "./ui";

type Live = { test: { testId: string; name: string; shortName: string | null; closesAt: string }; writing: number | null };
type Deleted = { at: string; by: string; undo: SoftDeleteResponse["undo"] };
type Dup = { questionId: string; similarity: number; stemPreview: string; chapter: string | null };

const dupKey = (f: Form) => JSON.stringify(f);

function StemField({ form, setForm, lang, error }: { form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; lang: Lang; error?: string }) {
  const para = form.type === "paragraph";
  const field = para ? `passage.${lang}` : `${lang}.question`;
  const fp = useFieldProps(field);
  const value = para ? form.passage[lang] : form[lang].question;
  const hm = hindiMissing(form);
  return (
    <div className="field" id="f-stem" tabIndex={-1}>
      <div className="row between gap-2">
        <span className="label">
          {para ? "Passage" : "Question"}
          {lang === "hi" ? " · Hindi" : ""} · maths between $…$
        </span>
        {lang === "hi" && hm.stem && <HindiMissing />}
      </div>
      <MathField
        {...fp}
        id="q-stem"
        value={value}
        onChange={(v) => setForm((f) => (para ? { ...f, passage: { ...f.passage, [lang]: v } } : { ...f, [lang]: { ...f[lang], question: v } }))}
        label={`${para ? "Passage" : "Question"}${lang === "hi" ? " in Hindi" : ""}`}
        placeholder={
          lang === "hi"
            ? "No Hindi version yet. Type it here, or use Translate to Hindi on the right."
            : para
              ? "Type the passage. Maths between $…$, e.g. $\\mu = 0.5$."
              : "Type the question. Maths between $…$, e.g. $\\dfrac{a}{b}$."
        }
        error={error}
        showError
        minHeight={96}
      />
      {lang === "en" && isBlankHtml(value) && <span className="hint">Words as text, maths between $…$. Diagrams go in with the picture button; an equation is never a picture.</span>}
    </div>
  );
}

function SolutionField({ form, setForm, lang, ai, streaming }: { form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; lang: Lang; ai: ReturnType<typeof useAiAssist>; streaming: boolean }) {
  const fp = useFieldProps(`${lang}.solution`);
  const hm = hindiMissing(form);
  const draft = ai.sol && ai.sol.state !== "accepted" && lang === "en" ? ai.sol : null;
  return (
    <div className="field" id="f-sol" tabIndex={-1}>
      <div className="row between gap-2">
        <span className="label">Solution{lang === "hi" ? " · Hindi" : ""}</span>
        {lang === "hi" && hm.solution && <HindiMissing />}
      </div>
      {draft ? (
        <div className="k-mf">
          <div className="k-mf-src" style={{ minHeight: 72 }}>
            <span style={{ whiteSpace: "pre-line" }}>{draft.text}</span>
            {streaming && <span className="caret" />}
          </div>
          {draft.text && (
            <div className="k-mf-pv">
              <span className="k-mf-pv-l">
                Preview <span>· as students see it</span>
              </span>
              <MathText text={draft.text} streaming={streaming} as="div" className="k-mf-body" />
            </div>
          )}
        </div>
      ) : (
        <MathField
          {...fp}
          value={form[lang].solution}
          onChange={(v) => setForm((f) => ({ ...f, [lang]: { ...f[lang], solution: v } }))}
          label={`Solution${lang === "hi" ? " in Hindi" : ""}`}
          placeholder={lang === "hi" ? "हल हिन्दी में लिखें, या दाईं ओर Translate to Hindi चुनें।" : "No solution. Students won't get an AI review for this question until one exists."}
          minHeight={72}
        />
      )}
      {lang === "en" && <SolutionDraftState ai={ai} form={form} />}
    </div>
  );
}

export function QuestionEditor({
  mode,
  id,
  typeParam,
  fromId,
  assist,
}: {
  mode: "create" | "edit";
  id?: string;
  typeParam?: string | null;
  fromId?: string | null;
  /** ?assist=tags|translation|solution: start that assist once loaded (the bank's "Draft solution") */
  assist?: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { currentUser } = useAuthStore();
  const subjectsQ = useSubjects();
  const sourcesQ = useSources();
  const subjects = React.useMemo(() => subjectsQ.data ?? [], [subjectsQ.data]);

  const initialType = typeFromParam(typeParam);
  const [initial] = React.useState<Form>(() => emptyForm(initialType));
  const [form, setForm] = React.useState<Form>(initial);
  const [saved, setSaved] = React.useState<Form>(initial);
  const [loaded, setLoaded] = React.useState<BankQuestion | null>(null);
  const [loading, setLoading] = React.useState(mode === "edit" || !!fromId);
  const [notFound, setNotFound] = React.useState(false);
  const [lang, setLang] = React.useState<Lang>("en");
  const [showErrors, setShowErrors] = React.useState(false);
  const [srvIssues, setSrvIssues] = React.useState<FieldIssue[]>([]);
  const [srvErr, setSrvErr] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [justSaved, setJustSaved] = React.useState(false);
  const [usage, setUsage] = React.useState<QuestionUsageM6 | null>(null);
  const [live, setLive] = React.useState<Live | null>(null);
  const [deleted, setDeleted] = React.useState<Deleted | null>(null);
  const [blocked, setBlocked] = React.useState<Live | null>(null);
  const [dup, setDup] = React.useState<{ match: Dup; key: string; tests: number | null } | null>(null);
  const [dupOk, setDupOk] = React.useState<string | null>(null);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [extraSources, setExtraSources] = React.useState<string[]>([]);
  const savedRef = React.useRef(saved);
  savedRef.current = saved;

  const isNew = mode === "create";
  const questionId = !isNew && loaded ? loaded._id : null;
  const dirty = !loading && JSON.stringify(form) !== JSON.stringify(saved);
  const ro = !!deleted || !!live;
  const unsaved = useUnsavedChanges({ isDirty: dirty && !saving });

  /* ---------- load ---------- */
  const sourceId = mode === "edit" ? id : fromId;
  React.useEffect(() => {
    if (!sourceId) return;
    let alive = true;
    (async () => {
      const q = await fetchQuestion(sourceId, kindFromParam(typeParam));
      if (!alive) return;
      if (!q) setNotFound(true);
      else {
        const f = formFrom(q, mode === "create");
        setForm(f);
        setLoaded(q);
        setSaved(mode === "edit" ? f : emptyForm(f.type));
        setSavedAt(q.modifiedAt ?? null);
        if (q.isDeleted) setDeleted({ at: q.deletedAt ?? q.modifiedAt ?? new Date().toISOString(), by: q.deletedBy?.name ?? "", undo: null });
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [sourceId, typeParam, mode]);

  // tests that use it: "In 2 tests", live lock, scheduled note
  const refreshUsage = React.useCallback(async () => {
    if (!questionId) return;
    try {
      const u = (await questionUsage([questionId]))[questionId];
      setUsage(u ?? null);
      const l = u?.live?.[0];
      setLive(l ? { test: l, writing: null } : null);
    } catch {
      /* the badge is optional */
    }
  }, [questionId]);
  React.useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // chapter counts for the chapter picker ("12 Qs")
  React.useEffect(() => {
    taxonomy()
      .then((t) => {
        const c: Record<string, number> = {};
        for (const s of t.subjects) for (const ch of s.chapters) if (ch.questions) c[ch.id] = ch.questions;
        setCounts(c);
      })
      .catch(() => {});
  }, []);

  const subject = subjects.find((s) => s.name.toLowerCase() === form.subject.toLowerCase()) ?? null;
  const chapterIdOf = React.useCallback((name: string) => {
    const c = subject?.chapters.find((x) => x.name === name);
    return c ? c.id || c._id : null;
  }, [subject]);
  const topicsOf = React.useCallback((name: string) => {
    const c = subject?.chapters.find((x) => x.name === name);
    return c ? c.topics ?? [] : null;
  }, [subject]);

  /* ---------- checks ---------- */
  const issues = React.useMemo(() => validate(form), [form]);
  const latexBlocked = issues.some((i) => i.message.startsWith("Line "));
  const shown = showErrors ? [...issues, ...srvIssues.filter((s) => !issues.some((i) => i.id === s.id))] : issues.filter((i) => i.message.startsWith("Line "));
  const errOf = (fid: string) => shown.find((i) => i.id === fid)?.message;
  const errMap = Object.fromEntries(shown.map((i) => [i.id, i.message]));
  const hm = hindiMissing(form);

  /* ---------- save ---------- */
  const save = async (opts: { another?: boolean; skipDup?: boolean } = {}): Promise<boolean> => {
    if (!currentUser) {
      notify.error("Not signed in", { description: "Sign in again to save questions." });
      return false;
    }
    const f = form;
    const found = validate(f);
    setSrvIssues([]);
    if (found.length) {
      setShowErrors(true);
      return false;
    }
    setShowErrors(false);
    setSrvErr(false);
    const kind = kindOf(f.type);
    const key = dupKey(f);
    // a new question that looks like one in the bank asks first
    if (isNew && !opts.skipDup && dupOk !== key) {
      try {
        const r = await questionsAdmin.duplicates({ items: [{ key: "q", text: f.type === "paragraph" ? f.passage.en : f.en.question, ...(subject?._id ? { subjectId: subject._id } : {}) }] });
        const m = r.results[0]?.matches?.[0];
        if (m && m.similarity >= 0.85) {
          setDup({ match: m, key, tests: null });
          questionUsage([m.questionId])
            .then((u) => setDup((d) => (d && d.match.questionId === m.questionId ? { ...d, tests: u[m.questionId]?.tests ?? null } : d)))
            .catch(() => {});
          return false;
        }
      } catch {
        /* the check is a help, never a gate */
      }
    }
    setSaving(true);
    try {
      const body = writeBody(f, topicsOf);
      if (!isNew && loaded) {
        if (!(await ai.acceptAll(f))) return false;
        await m6Questions.put(`/${kind}/update/${encodeURIComponent(loaded._id)}`, body, source("Question editor"));
        ai.afterSave();
        setSaved(f);
        setSavedAt(new Date().toISOString());
        setJustSaved(true);
        notify.success("Question saved", { action: { label: "Add another", href: `/questions/new?type=${f.type}` } });
        refreshUsage();
      } else {
        const r = await m6Questions.post(`/${kind}/new`, body, source("Question editor"));
        const created = (r.data as { data?: { _id?: string; id?: string } })?.data;
        const newId = created?._id || created?.id;
        setSaved(f);
        if (opts.another) {
          notify.success("Question saved", newId ? { action: { label: "Open", href: `/questions/${newId}/edit?type=${kind}` } } : undefined);
          // the next question keeps where it belongs
          const next = { ...emptyForm(f.type), subject: f.subject, chapters: f.chapters, topics: f.topics, sources: f.sources, difficulty: f.difficulty };
          setForm(next);
          setSaved(next);
          setDupOk(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          notify.success("Question saved", { action: { label: "Add another", href: `/questions/new?type=${f.type}` } });
          if (newId) router.push(`/questions/${encodeURIComponent(newId)}/edit?type=${kind}`);
          else router.push("/questions");
        }
      }
      qc.invalidateQueries({ queryKey: ["questions"] });
      return true;
    } catch (e) {
      const err = apiError(e);
      const lt = liveTestDetails(err);
      if (lt) {
        setLive({ test: lt.test, writing: lt.writing });
      } else if (err.code === "VALIDATION_ERROR") {
        const fields = fieldErrors(err);
        setSrvIssues(Object.keys(fields).length ? serverIssues(fields, f) : [{ id: "f-stem", label: "Question", message: err.message }]);
        setShowErrors(true);
      } else if (err.status === 0 || err.status >= 500) {
        setSrvErr(true);
      } else {
        notify.error(isNew ? "Couldn't create the question" : "Couldn't save the question", { description: err.message });
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    ai.discardAll();
    setForm(savedRef.current);
    setShowErrors(false);
    setSrvIssues([]);
    setSrvErr(false);
  };

  /* ---------- delete / restore ---------- */
  const me = currentUser?.name ?? "you";
  const doDelete = async () => {
    if (!loaded) return;
    const kind = kindOf(form.type);
    try {
      const r = await deleteQuestion(kind, loaded._id);
      setDeleted({ at: r.now, by: me, undo: r.undo });
      qc.invalidateQueries({ queryKey: ["questions"] });
      notify.undo("Question deleted", async () => {
        if (r.undo) await undoDelete(r.undo.path);
        else await restoreQuestion(kind, loaded._id);
        setDeleted(null);
        qc.invalidateQueries({ queryKey: ["questions"] });
      });
    } catch (e) {
      const lt = liveTestDetails(e);
      if (lt) setBlocked({ test: lt.test, writing: lt.writing });
      else notify.error("Couldn't delete the question", { description: apiError(e).message });
    }
  };
  const restore = async () => {
    if (!loaded) return;
    try {
      await restoreQuestion(kindOf(form.type), loaded._id);
      setDeleted(null);
      notify.success("Question restored");
      qc.invalidateQueries({ queryKey: ["questions"] });
    } catch (e) {
      notify.error("Couldn't restore the question", { description: apiError(e).message });
    }
  };

  /* ---------- AI ---------- */
  const ai = useAiAssist({
    questionId,
    form,
    setForm,
    saved,
    dirty,
    loading,
    ro,
    setLang,
    save: () => save(),
    chapterIdOf,
    subjectId: subject?._id ?? null,
    notifyError: (title, description) => notify.error(title, { description }),
  });
  const autoAssisted = React.useRef(false);
  React.useEffect(() => {
    if (autoAssisted.current || loading || !questionId) return;
    if (assist !== "tags" && assist !== "translation" && assist !== "solution") return;
    autoAssisted.current = true;
    ai.run(assist, { saved: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assist, loading, questionId]);

  /* ---------- creatable taxonomy ---------- */
  const onCreateChapter = async (subjectId: string, name: string) => {
    try {
      await api.subjects.createChapter({ subjectId, name });
      await qc.invalidateQueries({ queryKey: ["subjects"] });
      setForm((f) => ({ ...f, chapters: [...f.chapters.filter((c) => c !== name), name] }));
      notify.success(`Chapter "${name}" created`);
    } catch (e) {
      notify.error("Couldn't create the chapter", { description: apiError(e).message });
    }
  };
  const onCreateTopic = async (subjectId: string, chapterId: string, name: string) => {
    await api.subjects.createTopic({ subjectId, chapterId, topic: name }).catch((e) => {
      throw new Error(apiError(e).message);
    });
    await qc.invalidateQueries({ queryKey: ["subjects"] });
    notify.success(`Topic "${name}" created`);
  };
  const onCreateSource = async (name: string) => {
    try {
      await api.sources.create({ name });
      setExtraSources((s) => [...s, name]);
      qc.invalidateQueries({ queryKey: ["sources"] });
      setForm((f) => ({ ...f, sources: [...f.sources.filter((x) => x !== name), name] }));
    } catch (e) {
      notify.error("Couldn't add the source", { description: apiError(e).message });
    }
  };

  const ctx: EditorCtx = {
    lang,
    ro: ro || saving,
    upload: (file, onProgress, signal) => uploadMedia(file, onProgress, signal),
    convert: (field) => (questionId && !ro ? ai.convert(field) : undefined),
    extra: (field) => ai.latexExtra(field),
  };

  /* ---------- render ---------- */
  if (notFound) {
    return (
      <>
        <header className="topbar row h-16 shrink-0 gap-2.5 px-7">
          <Link href="/questions" className="btn btn-ghost btn-sm">
            ← Bank
          </Link>
          <h1 className="h3">Edit question</h1>
        </header>
        <main className="px-7 py-10">
          <NotFoundState />
        </main>
      </>
    );
  }

  const recent = savedAt ? Date.now() - new Date(savedAt).getTime() < 90_000 : false;
  const status = saving
    ? "Saving…"
    : deleted
      ? "Deleted"
      : isNew
        ? "Not saved yet"
        : justSaved || recent
          ? "Saved just now"
          : savedAt
            ? `Saved ${fmtRelative(savedAt).replace(/^Today, /, "today, ")}`
            : "";
  const typeLocked = (t: string) => !isNew && kindOf(t as Form["type"]) !== kindOf(form.type);
  const sched = usage?.scheduled ?? [];
  const usedIn = usage?.tests ?? 0;

  return (
    <EditorProvider value={ctx}>
      <header className="topbar row between wrap shrink-0 gap-2.5 px-7" style={{ minHeight: 64, paddingTop: 10, paddingBottom: 10 }}>
        <div className="row wrap min-w-0 gap-2.5">
          <a
            href="/questions"
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.preventDefault();
              unsaved.navigateWithCheck("/questions");
            }}
          >
            ← Bank
          </a>
          <h1 className="h3 shrink-0">{isNew ? "New question" : "Edit question"}</h1>
          {!isNew && loaded && <span className="mono xs muted">{loaded._id}</span>}
          {isNew && fromId && <span className="badge b-sky">Copy of {fromId}</span>}
          {!isNew && !deleted && usedIn > 0 && (
            <Link href="/tests" className="badge b-grey no-underline">
              In {usedIn === 1 ? "1 test" : `${usedIn} tests`}
            </Link>
          )}
          {dirty && !saving && !ro && !isNew ? <span className="badge b-amber pop">Unsaved changes</span> : status && <span className="xs muted" role="status">{status}</span>}
        </div>
        <div className="row gap-2">
          {deleted ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={restore}>
              Restore question
            </button>
          ) : (
            <>
              {!isNew && !ro && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => unsaved.navigateWithCheck(`/questions/new?from=${encodeURIComponent(loaded?._id ?? "")}&type=${kindOf(form.type)}`)}>
                    Duplicate as new
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm danger-hover" onClick={doDelete}>
                    Delete
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => (isNew ? unsaved.navigateWithCheck("/questions") : discard())}
                disabled={saving || (!isNew && !dirty && !ai.sol)}
              >
                {isNew ? "Cancel" : "Discard"}
              </button>
              {isNew && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => save({ another: true })} disabled={saving || loading || latexBlocked}>
                  Save and add another
                </button>
              )}
              {saving ? (
                <button type="button" className="btn btn-primary btn-sm" disabled aria-busy="true" style={{ opacity: 1, cursor: "progress" }}>
                  {I.spin()}Saving…
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => save()} disabled={loading || ro || latexBlocked} title={latexBlocked ? "Fix the maths first" : undefined}>
                  Save
                </button>
              )}
            </>
          )}
        </div>
      </header>

      <main className="qe-main flex flex-wrap items-start gap-[18px] px-7 pt-5 pb-12">
        <div className="col min-w-0 gap-3.5" style={{ flex: "999 1 520px" }}>
          {showErrors && shown.length > 0 && <ErrorSummary fields={dedupe(shown).map((i) => ({ id: i.id, label: i.label }))} />}
          {srvErr && <ServerErrorBanner detail="Your changes are still here. Nothing was lost." onRetry={() => save()} />}
          {live && (
            <Banner
              tone="warn"
              title={`In ${live.test.name}, live now.`}
              action={
                <Link href={`/tests/${encodeURIComponent(live.test.testId)}/monitor`} className="btn btn-secondary btn-sm">
                  Open the test
                </Link>
              }
            >
              You can&apos;t change this question until the test closes at {fmtTime(live.test.closesAt)}. To fix a wrong key after that, use Fix key in Analysis.
            </Banner>
          )}
          {!live && !deleted && sched.length > 0 && (
            <Banner tone="info" title={`In ${sched[0].name}${sched.length > 1 ? ` and ${sched.length - 1} more` : ""}, which opens ${fmtDateTime(sched[0].opensAt, "short")}.`}>
              Students will see your changes in that test too.
            </Banner>
          )}
          {deleted && (
            <Banner
              tone="mode"
              title={`Deleted ${fmtDateTime(deleted.at, "short")}${deleted.by ? ` by ${deleted.by}` : ""}.`}
              action={
                <button type="button" className="btn btn-primary btn-sm" onClick={restore}>
                  Restore
                </button>
              }
            >
              It&apos;s hidden from the bank and can&apos;t go into new tests. Tests that already used it keep it.
            </Banner>
          )}

          {loading ? (
            <div className="col gap-3">
              <div className="skel h-[320px] rounded-xl" />
              <div className="skel h-[120px] rounded-xl" />
            </div>
          ) : (
            <>
              <section className={`card pad-lg col gap-3.5 ${ro ? "qe-lock" : ""}`} style={saving ? { pointerEvents: "none" } : undefined}>
                <div className="row between wrap gap-2.5">
                  <Segmented<Form["type"]>
                    ariaLabel="Question type"
                    value={form.type}
                    onChange={(t) => {
                      if (typeLocked(t)) return;
                      setForm((f) => switchType(f, t));
                    }}
                    options={TYPE_TABS.map((t) => ({ value: t.key, label: t.label, disabled: typeLocked(t.key) }))}
                  />
                  <Segmented<Lang>
                    ariaLabel="Language"
                    value={lang}
                    onChange={setLang}
                    options={[
                      { value: "en", label: "English" },
                      {
                        value: "hi",
                        label: (
                          <>
                            हिन्दी
                            {hm.count > 0 && (
                              <span className="qe-hmc" aria-label={`${hm.count} Hindi fields missing`}>
                                {hm.count}
                              </span>
                            )}
                          </>
                        ),
                      },
                    ]}
                  />
                </div>
                <span className="xs muted">
                  {TYPE_HINT[form.type]}
                  {!isNew && form.type !== "single" && form.type !== "multiple" ? " The type can't change after the question is saved." : ""}
                </span>

                <StemField form={form} setForm={setForm} lang={lang} error={errOf("f-stem")} />
                {lang === "hi" && <HiFailedNote ai={ai} />}
                {lang === "hi" && ai.hiStream !== null && (
                  <div className="k-mf">
                    <div className="k-mf-src qe-hi" style={{ minHeight: 72 }} role="status">
                      {ai.hiStream}
                      <span className="caret" />
                    </div>
                  </div>
                )}

                {(form.type === "single" || form.type === "multiple") && (
                  <OptionsEditor
                    options={form.options}
                    correct={form.correct}
                    multi={form.type === "multiple"}
                    onChange={(options, correct) => setForm((f) => ({ ...f, options, correct }))}
                    hiMissing={hm.options}
                    errors={Object.fromEntries(form.options.map((o) => [o.id, errMap[`f-opt-${o.id}`]]).filter(([, m]) => m))}
                    keyError={errOf("f-key")}
                    name="correct"
                  />
                )}
                {form.type === "integer" && (
                  <NumericalAnswer
                    mode={form.numMode}
                    exact={form.exact}
                    from={form.from}
                    to={form.to}
                    onChange={(p) => setForm((f) => ({ ...f, ...p }))}
                    error={errOf("f-num")}
                  />
                )}
                {form.type === "paragraph" && (
                  <ParagraphChildren
                    items={form.children}
                    onChange={(children) => setForm((f) => ({ ...f, children }))}
                    onRemoved={(c: ChildF, i: number) =>
                      notify.undo("Removed a question from the passage", () =>
                        setForm((f) => {
                          const a = [...f.children];
                          a.splice(Math.min(i, a.length), 0, c);
                          return { ...f, children: a };
                        })
                      )
                    }
                    errors={childErrors(form, shown)}
                    hiMissing={hm.children}
                  />
                )}
                {form.type === "matrix" && (
                  <MatrixEditor
                    listI={form.listI}
                    listII={form.listII}
                    matches={form.matches}
                    onChange={(p) => setForm((f) => ({ ...f, ...p }))}
                    hiMissing={hm.rows}
                    rowError={errOf("f-mxr")}
                    listError={errOf("f-mx")}
                  />
                )}
                {form.type !== "paragraph" && <SolutionField form={form} setForm={setForm} lang={lang} ai={ai} streaming={ai.sol?.state === "streaming"} />}
              </section>

              <Classification
                form={form}
                set={(p) => setForm((f) => ({ ...f, ...p }))}
                subjects={subjects}
                sources={[...(sourcesQ.data ?? []).map((s) => s.name), ...extraSources]}
                counts={counts}
                errors={errMap}
                onCreateChapter={onCreateChapter}
                onCreateTopic={onCreateTopic}
                onCreateSource={onCreateSource}
              />
            </>
          )}
        </div>

        <div className="qe-side col gap-3.5">
          <AiAssistPanel ai={ai} form={form} isNew={isNew} questionId={questionId} ro={ro} />
          <StudentPreview form={form} loading={loading} />
        </div>
      </main>

      <KitDialog
        open={!!dup}
        onOpenChange={(o) => !o && setDup(null)}
        alert
        width="wide"
        icon={I.copy()}
        iconTone="amber"
        title="This looks like a question already in the bank"
        description={dup ? `${Math.round(dup.match.similarity * 100)}% the same as ${dup.match.questionId}. Save anyway only if it's really different.` : undefined}
        splitFooter
        footer={
          dup && (
            <>
              <Link href={`/questions/${encodeURIComponent(dup.match.questionId)}/edit`} target="_blank" className="btn btn-secondary btn-sm">
                Open {dup.match.questionId}
              </Link>
              <span className="row gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDup(null)}>
                  Keep editing
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const k = dup.key;
                    setDup(null);
                    setDupOk(k);
                    save({ skipDup: true });
                  }}
                >
                  Save anyway
                </button>
              </span>
            </>
          )
        }
      >
        {dup && (
          <>
            <div className="qe-cmp">
              <span className="xs font-semibold">Yours</span>
              <MathText html text={form.type === "paragraph" ? form.passage.en : form.en.question} as="div" className="font-serif text-[15px] line-clamp-3" />
            </div>
            <div className="qe-cmp">
              <span className="row between xs">
                <span className="font-semibold">
                  {dup.match.questionId}
                  {dup.match.chapter ? ` · ${form.subject ? `${form.subject} · ` : ""}${dup.match.chapter}` : ""}
                </span>
                {dup.tests !== null && <span className="muted">in {dup.tests === 1 ? "1 test" : `${dup.tests} tests`}</span>}
              </span>
              <MathText text={dup.match.stemPreview} as="div" className="font-serif text-[15px]" />
            </div>
          </>
        )}
      </KitDialog>

      <BlockedDialog
        open={!!blocked}
        onOpenChange={(o) => !o && setBlocked(null)}
        title={`Can't delete ${loaded?._id ?? "this question"} yet`}
        description={
          blocked
            ? `It's in ${blocked.test.name}, which ${blocked.writing != null ? `${blocked.writing.toLocaleString("en-IN")} students are` : "students are"} writing now. You can delete it after the test closes at ${fmtTime(blocked.test.closesAt)}.`
            : ""
        }
        action={
          blocked && (
            <Link href={`/tests/${encodeURIComponent(blocked.test.testId)}/monitor`} className="btn btn-secondary btn-sm">
              Watch it live
            </Link>
          )
        }
      />
      <UnsavedChangesDialog
        open={unsaved.showDialog}
        onOpenChange={(o) => !o && unsaved.cancelNavigation()}
        onDiscard={() => {
          ai.discardAll();
          unsaved.confirmNavigation();
        }}
      />
    </EditorProvider>
  );
}

/** One summary entry per field id (a field with two problems links once). */
function dedupe(list: FieldIssue[]): FieldIssue[] {
  const seen = new Set<string>();
  return list.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/** Child errors for ParagraphChildren: "kid-<id>" → {stem, answer, opt-<optionId>}, "kids" → {list}. */
function childErrors(f: Form, shown: FieldIssue[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const i of shown) {
    if (i.id === "f-kids") (out.kids ??= {}).list = i.message;
    for (const c of f.children) {
      const k = `kid-${c.id}`;
      if (i.id === `f-kid-${c.id}`) (out[k] ??= {}).stem ??= i.message;
      if (i.id === `f-kid-${c.id}-ans`) (out[k] ??= {}).answer = i.message;
      for (const o of c.options) if (i.id === `f-opt-${o.id}`) (out[k] ??= {})[`opt-${o.id}`] = i.message;
    }
  }
  return out;
}
