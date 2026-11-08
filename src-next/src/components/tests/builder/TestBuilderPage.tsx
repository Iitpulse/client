"use client";

/*
  Admin-TestBuilder board (canvas v166), every state: new-empty, pattern-pick, built, checks-failing, publish-failed,
  unsaved (leave dialog), AI not enough / paused / daily limit, rebuild confirm, scheduled edit (re-notify), locked
  after submissions, key corrected. Desktop: settings column on the right; 1024px: settings below in two columns.

  Saving: a draft's settings save on their own a moment after each change ("Draft · autosaved"); a scheduled test
  saves with "Save changes" (students are told about a new time or batches). The paper is saved by the picker and the
  AI builder (each write is a revision; Undo restores one). Exam and pattern are fixed once the test exists.
  Contract: api-ai docs/m6-api.md "Admin tests list, builder settings, publish", "Paper, picker", "AI test builder".
*/
import { HistoryButton } from "@/components/history/HistoryPanel";
import "./builder.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Lock, TriangleAlert } from "lucide-react";
import type { FullscreenPolicy, PaperView, ReentrySetting, ResultMode, TestBuild, TestSettings, TestSettingsPatch } from "@/lib/m6-contract";
import { apiError, errCode, fieldErrors, useM6Source } from "@/lib/m6/client";
import { builderKeys, createTest, patchTest, publishTest, RESULT_MODES, useExamPatterns, useExamTemplates, usePatternFull, useReadiness, useTestSettings } from "@/lib/m6/builder";
import { paperKey, restorePaper, usePaper } from "@/lib/m6/paper";
import { useAdminTests } from "@/lib/m6/tests";
import { istDate, istDateTime, useM6Batches, useM6Exams } from "@/lib/m6/shared";
import { sampleAiSlots } from "@/lib/m6/fixtures/builder-paper";
import {
  AffixInput,
  Banner,
  Checkbox,
  Combobox,
  DateTimeField,
  Field,
  MultiSelect,
  NoAccess,
  NotFoundState,
  notify,
  NumberStepper,
  PageError,
  ReadOnlyValue,
  Segmented,
  StateBox,
  TextInput,
  UnsavedChangesDialog,
} from "@/components/kit";
import { SampleDataPill } from "@/components/tests-m6/parts";
import { AiCard, type AiBlock } from "./AiCard";
import { Checks, checksLeft, type CheckFix } from "./Checks";
import { openStudentPreview } from "@/lib/student-preview";
import { PublishConfirmDialog } from "@/components/tests/publish-confirm";
import { Sections } from "./Sections";
import { ReEntryExplainer, ReEntrySetting, reentryMinutesError, reentryOf } from "./ReEntrySetting";

type BuilderTest = TestSettings & { publishFailed?: { at: string; code: string } | null };

interface Form {
  name: string;
  noteForStudents: string;
  batchIds: string[];
  opensAt: string | null;
  closesAt: string | null;
  graceMinutes: number;
  templateId: string | null;
  resultMode: ResultMode;
  resultAfterDays: number;
  fullscreen: FullscreenPolicy;
  reentry: ReentrySetting;
}

function formOf(t: TestSettings): Form {
  return {
    name: t.name,
    noteForStudents: t.noteForStudents ?? "",
    batchIds: t.batches.map((b) => b.id),
    opensAt: t.opensAt,
    closesAt: t.closesAt,
    graceMinutes: t.graceMinutes,
    templateId: t.template?.id ?? null,
    resultMode: t.resultMode,
    resultAfterDays: t.resultAfterDays ?? 2,
    fullscreen: t.fullscreenPolicy,
    reentry: reentryOf(t.reentry),
  };
}

function diff(f: Form, t: TestSettings, names?: Map<string, string>): TestSettingsPatch & { batches?: Array<{ id: string; name: string }> } {
  const p: TestSettingsPatch & { batches?: Array<{ id: string; name: string }> } = {};
  const base = formOf(t);
  if (f.name.trim() !== base.name) p.name = f.name.trim();
  if (f.noteForStudents.trim() !== base.noteForStudents) p.noteForStudents = f.noteForStudents.trim() || null;
  if (f.batchIds.join() !== base.batchIds.join()) {
    p.batchIds = f.batchIds;
    // tests can't read batch names: send them along (contract "tests core")
    if (names) p.batches = f.batchIds.map((id) => ({ id, name: names.get(id) ?? t.batches.find((b) => b.id === id)?.name ?? id }));
  }
  if (f.opensAt !== base.opensAt && f.opensAt) p.opensAt = f.opensAt;
  if (f.closesAt !== base.closesAt && f.closesAt) p.closesAt = f.closesAt;
  if (f.graceMinutes !== base.graceMinutes) p.graceMinutes = f.graceMinutes;
  if (f.templateId && f.templateId !== base.templateId) p.templateId = f.templateId;
  if (f.resultMode !== base.resultMode) p.resultMode = f.resultMode;
  if (f.resultMode === "autoAfterXDays" && (f.resultAfterDays !== (t.resultAfterDays ?? 2) || p.resultMode)) p.resultAfterDays = f.resultAfterDays;
  if (JSON.stringify(f.fullscreen) !== JSON.stringify(base.fullscreen)) p.fullscreenPolicy = f.fullscreen;
  if (f.reentry.policy !== base.reentry.policy || (f.reentry.policy === "crash" && f.reentry.minutes !== base.reentry.minutes)) p.reentry = f.reentry.policy === "crash" ? f.reentry : { policy: f.reentry.policy, minutes: base.reentry.minutes };
  return p;
}

/** "You changed the closing time and added a batch to Mock 14." */
function changeSummary(p: TestSettingsPatch, t: TestSettings): string {
  const parts: string[] = [];
  if (p.name !== undefined) parts.push("renamed it");
  if (p.opensAt) parts.push("changed the opening time");
  if (p.closesAt) parts.push("changed the closing time");
  if (p.batchIds) {
    const added = p.batchIds.filter((id) => !t.batches.some((b) => b.id === id)).length;
    const removed = t.batches.filter((b) => !p.batchIds!.includes(b.id)).length;
    if (added) parts.push(added === 1 ? "added a batch" : `added ${added} batches`);
    if (removed) parts.push(removed === 1 ? "removed a batch" : `removed ${removed} batches`);
  }
  if (p.noteForStudents !== undefined) parts.push("edited the note");
  if (p.graceMinutes !== undefined) parts.push("changed the grace");
  if (p.templateId) parts.push("picked another exam screen");
  if (p.resultMode || p.resultAfterDays !== undefined) parts.push("changed when results come out");
  if (p.fullscreenPolicy) parts.push("changed the exam controls");
  if (p.reentry) parts.push("changed re-entry");
  if (!parts.length) return "";
  const last = parts.pop();
  return `You ${parts.length ? `${parts.join(", ")} and ${last}` : last} to ${t.name}.`;
}

const ord = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

const MODE_KEY: Record<ResultMode, string> = { immediately: "instant", atTheEndOfTest: "atClose", autoAfterXDays: "afterDays", manual: "manual" };

function modeHint(m: ResultMode, closesAt: string | null, days: number): string {
  if (m === "immediately") return "Each student sees the result as soon as they submit.";
  if (m === "manual") return "You publish results yourself from the Results page.";
  if (m === "atTheEndOfTest") return closesAt ? `Published when the test closes, ${istDateTime(closesAt)}. AI review unlocks then.` : "Published when the test closes. AI review unlocks then.";
  if (!closesAt) return `Published ${days} day${days === 1 ? "" : "s"} after the test closes. AI review unlocks then.`;
  return `Published ${istDateTime(new Date(Date.parse(closesAt) + days * 86_400_000).toISOString())}. AI review unlocks then.`;
}

/* ─────────────────────────────── page ─────────────────────────────── */

export function TestBuilderPage({ testId, initialExamId }: { testId?: string; initialExamId?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const isNew = !testId;
  const settings = useTestSettings(testId);
  const test = settings.data as BuilderTest | undefined;
  // the paper and checks load after the test itself (its 404 / 403 decide the page state first)
  const paper = usePaper(testId, !!settings.data);
  const readiness = useReadiness(testId, !!settings.data);
  const exams = useM6Exams();
  const batches = useM6Batches();
  const sample = useM6Source("tests", "paper") === "sample";
  const errorToast = (title: string, e: unknown) => notify.error(title, { description: apiError(e).message });

  /* new test: exam → pattern → create */
  const [examId, setExamId] = useState<string | null>(initialExamId ?? null);
  const [patternId, setPatternId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const effExam = test?.exam.id ?? examId ?? undefined;
  const patterns = useExamPatterns(effExam);
  const pattern = usePatternFull(test?.pattern.id ?? patternId ?? undefined);
  const templates = useExamTemplates(effExam);
  const ended = useAdminTests({ state: "ended", examId: effExam, page: 1, pageSize: 5 }, !!effExam && !isNew);

  /* settings form */
  const [form, setForm] = useState<Form | null>(null);
  const [newName, setNewName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishFailed, setPublishFailed] = useState(false);
  const [leave, setLeave] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiBlock, setAiBlock] = useState<AiBlock>(null);
  const baseRef = useRef<string | null>(null);

  useEffect(() => {
    if (!test) return;
    const key = `${test.id}:${test.updatedAt}`;
    if (baseRef.current === key) return;
    // keep the person's edits when a refetch lands mid-edit
    if (form && baseRef.current && Object.keys(diff(form, test)).length && baseRef.current.startsWith(test.id + ":")) {
      baseRef.current = key;
      return;
    }
    baseRef.current = key;
    setForm(formOf(test));
  }, [test, form]);

  useEffect(() => {
    setPublishFailed(!!test?.publishFailed);
  }, [test?.publishFailed]);

  // the exam's default template is preselected
  useEffect(() => {
    if (!form || form.templateId || !templates.data) return;
    const d = templates.data.defaults.find((x) => x.exam.id === effExam)?.template.id ?? templates.data.items.find((x) => x.isDefault)?.id;
    if (d) setForm({ ...form, templateId: d });
  }, [form, templates.data, effExam]);

  const state = test?.state ?? "draft";
  const live = state === "live";
  const ended_ = state === "ended";
  const locked = !!test && (test.lockedBySubmissions || live || ended_);
  const scheduled = state === "scheduled";
  const batchNames = useMemo(() => new Map((batches.data ?? []).map((b) => [b.id, b.name])), [batches.data]);
  const patch = useMemo(() => (form && test ? diff(form, test, batchNames) : {}), [form, test, batchNames]);
  const dirty = Object.keys(patch).length > 0;
  const windowBad = !!form?.opensAt && !!form?.closesAt && Date.parse(form.closesAt) <= Date.parse(form.opensAt);
  // re-entry stays editable while live (and after submissions) until the test ends
  const reentryBad = !!form && !!reentryMinutesError(form.reentry);
  const [explainReentry, setExplainReentry] = useState(false);

  const invalidate = useCallback(() => {
    if (!testId) return;
    qc.invalidateQueries({ queryKey: builderKeys.test(testId) });
    qc.invalidateQueries({ queryKey: builderKeys.readiness(testId) });
    qc.invalidateQueries({ queryKey: ["m6", "tests"] });
    qc.invalidateQueries({ queryKey: ["m6", "calendar"] });
  }, [qc, testId]);

  const save = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!testId || !test || !form || !dirty) return true;
      if (windowBad || reentryBad) {
        setShowErrors(true);
        return false;
      }
      setSaving(true);
      try {
        const r = await patchTest(testId, patch);
        setErrors({});
        qc.setQueryData(builderKeys.test(testId), r.test);
        baseRef.current = `${r.test.id}:${r.test.updatedAt}`;
        setForm(formOf(r.test));
        qc.invalidateQueries({ queryKey: builderKeys.readiness(testId) });
        qc.invalidateQueries({ queryKey: ["m6", "tests"] });
        qc.invalidateQueries({ queryKey: ["m6", "calendar"] });
        if (!opts?.quiet) notify.success("Changes saved", r.notified > 0 ? { description: `${r.notified.toLocaleString("en-IN")} students were told` } : undefined);
        return true;
      } catch (e) {
        const f = fieldErrors(e);
        if (Object.keys(f).length) {
          setErrors(f);
          setShowErrors(true);
        } else if (errCode(e) === "TEST_LOCKED") {
          errorToast("Test is locked now", e);
          invalidate();
        } else errorToast("Changes not saved", e);
        return false;
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [testId, test, form, dirty, patch, windowBad, reentryBad, qc, invalidate]
  );

  // drafts save on their own a moment after each change
  useEffect(() => {
    if (!dirty || state !== "draft" || locked || windowBad || reentryBad || saving || Object.keys(errors).length) return;
    const t = setTimeout(() => void save({ quiet: true }), 1200);
    return () => clearTimeout(t);
  }, [dirty, state, locked, windowBad, reentryBad, saving, errors, save, form]);

  /* leave guard: browser close and in-app links */
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setLeave(url.pathname + url.search);
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);

  /* create on pattern pick */
  const create = async (pid: string) => {
    if (!examId) return;
    setPatternId(pid);
    setCreating(true);
    try {
      const t = await createTest({ name: newName.trim() || "Untitled test", examId, patternId: pid });
      qc.setQueryData(builderKeys.test(t.id), t);
      qc.invalidateQueries({ queryKey: ["m6", "tests"] });
      router.replace(`/tests/${t.id}/edit`);
    } catch (e) {
      const f = fieldErrors(e);
      if (Object.keys(f).length) setErrors(f);
      else errorToast("Test not created", e);
      setCreating(false);
    }
  };

  // Batch 7: Publish opens the confirm (Admin-PublishConfirm); confirming runs doPublish.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const publish = async () => {
    if (!testId) return;
    if (dirty && !(await save({ quiet: true }))) return;
    setConfirmOpen(true);
  };
  const doPublish = async () => {
    if (!testId) return;
    setPublishing(true);
    try {
      const r = await publishTest(testId);
      setPublishFailed(false);
      notify.success(`Published ${r.test.name}`, r.notified > 0 ? { description: `${r.notified.toLocaleString("en-IN")} students were told` } : undefined);
      invalidate();
      router.push("/tests");
    } catch (e) {
      const code = errCode(e);
      if (code === "NOT_READY") {
        setShowErrors(true);
        qc.invalidateQueries({ queryKey: builderKeys.readiness(testId) });
        notify.error("Not ready to publish", { description: "Fix the checks marked ! under Ready to publish?" });
      } else if (code === "TEST_LOCKED" || code === "NOT_DRAFT") {
        errorToast(code === "NOT_DRAFT" ? "Already published" : "Test is locked", e);
        invalidate();
      } else {
        setPublishFailed(true);
        invalidate();
        throw new Error("Not published. The server didn't answer, so nothing was sent to students and the test is still a draft. Try again in a moment.");
      }
    } finally {
      setPublishing(false);
    }
  };

  /* paper facts */
  const p: PaperView | undefined = paper.data;
  const aiIds = testId && sample ? sampleAiSlots(testId) : new Set<string>();
  let manualCount = 0;
  let aiCount = 0;
  for (const s of p?.sections ?? [])
    for (const x of s.subsections)
      for (const sl of x.slots) (sl.source === "ai" || aiIds.has(sl.questionId) ? (aiCount += sl.count) : (manualCount += sl.count));
  const latexSlot = p?.sections.flatMap((s) => s.subsections.flatMap((x) => x.slots)).find((sl) => sl.flags.needsLatex > 0) ?? null;
  const firstOpenSub = p?.sections.flatMap((s) => s.subsections).find((x) => x.have < x.need)?.id ?? p?.sections[0]?.subsections[0]?.id ?? null;

  /** The question picker page for one sub-section (saves pending settings first). */
  const setPicker = (sub: string | null) => {
    if (!testId || !sub) return;
    void (async () => {
      if (dirty && !(await save({ quiet: true }))) return;
      router.push(pickerHref(testId, sub));
    })();
  };

  const onFix = (f: CheckFix) => {
    setShowErrors(true);
    if (f.pick && firstOpenSub) setPicker(firstOpenSub);
    else if (f.questionHref) router.push(f.questionHref);
    else if (f.field) {
      const el = document.getElementById(f.field);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus();
    }
  };

  const onBuilt = (b: TestBuild) => {
    if (!testId) return;
    qc.invalidateQueries({ queryKey: paperKey(testId) });
    qc.invalidateQueries({ queryKey: builderKeys.readiness(testId) });
    qc.invalidateQueries({ queryKey: ["m6", "tests"] });
    if (b.status === "done") setAiBlock(null);
  };
  const onUndoBuild = async (rev: number) => {
    if (!testId) return;
    const r = await restorePaper(testId, rev, "Test builder · AI build");
    qc.setQueryData(paperKey(testId), r.paper);
    qc.invalidateQueries({ queryKey: builderKeys.readiness(testId) });
    notify.success("Build undone", { description: "The questions are as before." });
  };

  /* ───── page states (Kit-States) ───── */
  if (!isNew && settings.isError) {
    const e = apiError(settings.error);
    return (
      <Shell title="Test">
        {e.status === 403 || e.code === "FORBIDDEN" || e.code === "STAFF_ONLY" ? (
          <NoAccess what="this test" />
        ) : e.code === "TEST_NOT_FOUND" || e.status === 404 ? (
          <NotFoundState deleted="This test doesn't exist or was deleted" />
        ) : (
          <PageError what="this test" onRetry={() => settings.refetch()} />
        )}
      </Shell>
    );
  }

  const loading = !isNew && (!test || !form);
  const f = form;
  const examOptions = (exams.data ?? []).filter((e) => e.status !== "deleted").map((e) => ({ value: e.id, label: e.shortName, sub: e.fullName ?? undefined }));
  const patternItems = patterns.data ?? [];
  const patternOptions = patternItems.map((x) => ({
    value: x.id,
    label: x.name,
    sub: `${x.totals.questions} questions · ${x.totals.marks} marks · ${x.durationMinutes} min`,
    end: x.usedBy ? `${x.usedBy} test${x.usedBy === 1 ? "" : "s"}` : undefined,
  }));
  const examName = test?.exam.name ?? exams.data?.find((e) => e.id === examId)?.shortName ?? "";
  const batchOptions = (batches.data ?? []).filter((b) => !b.archivedAt).map((b) => ({ value: b.id, label: b.name, end: b.students ? `${b.students.toLocaleString("en-IN")} student${b.students === 1 ? "" : "s"}` : undefined }));
  const pickedStudents = f ? f.batchIds.reduce((a, id) => a + ((batches.data ?? []).find((b) => b.id === id)?.students ?? 0), 0) : 0;
  const studentsHint =
    f && f.batchIds.length
      ? `${f.batchIds.length} batch${f.batchIds.length === 1 ? "" : "es"} · ${(test && f.batchIds.join() === test.batches.map((b) => b.id).join() && test.assignedStudents != null ? test.assignedStudents : pickedStudents).toLocaleString("en-IN")} students`
      : "Students in these batches see the test.";
  const templateItems = templates.data?.items ?? [];
  const defaultTpl = templates.data?.defaults.find((x) => x.exam.id === effExam)?.template.id ?? templateItems.find((x) => x.isDefault)?.id;
  const templateOptions = templateItems.map((x) => ({ value: x.id, label: x.id === defaultTpl ? `${x.name} · ${examName} default` : x.name, sub: x.summary || undefined }));
  const left = isNew ? 4 : checksLeft(readiness.data);
  const hasQuestions = (p?.filled ?? 0) > 0;
  const weakFrom = ended.data?.items?.[0] ? { testId: ended.data.items[0].testId, name: ended.data.items[0].name, shortName: ended.data.items[0].shortName } : null;
  const correction = test?.keyCorrections?.find((k) => k.status === "done") ?? null;

  const status: [string, string] = isNew
    ? ["b-sky", "New · not saved"]
    : live
      ? ["b-live", "Live"]
      : ended_
        ? ["b-grey", correction ? "Ended · key corrected" : "Ended · locked"]
        : scheduled
          ? ["b-navy", "Scheduled"]
          : publishFailed
            ? ["b-sky", "Draft · not published"]
            : ["b-sky", saving ? "Draft · saving…" : "Draft · autosaved"];

  const cantPublish = isNew || left > 0 || locked || aiBusy || loading || publishing;
  const primaryLabel = scheduled || locked ? "Save changes" : "Publish";
  const set = (u: Partial<Form>) => f && setForm({ ...f, ...u });
  const fe = (k: string) => errors[k] ?? null;

  const headerActions = (
    <>
      <SampleDataPill areas={["tests", "paper", "aiBuild", "patterns", "templates"]} />
      {!isNew && testId && <HistoryButton type="test" id={testId} label={test?.name ?? testId} />}
      {!isNew && (
        <button type="button" className="btn btn-ghost btn-sm" disabled={loading || !hasQuestions} onClick={() => testId && openStudentPreview(testId)}>
          Preview as student
        </button>
      )}
      {!locked && !scheduled && (
        <button type="button" className="btn btn-secondary btn-sm" disabled={isNew || loading || saving || (!dirty && !isNew)} onClick={() => void save()}>
          Save as draft
        </button>
      )}
      {scheduled || locked ? (
        <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || saving || windowBad || reentryBad} onClick={() => void save()}>
          Save changes
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-sm tb-locked"
          disabled={cantPublish}
          title={locked ? "Locked after submissions" : left ? `${left} check${left === 1 ? "" : "s"} left` : `Publish ${test?.name ?? ""}`}
          onClick={() => void publish()}
          aria-busy={publishing}
        >
          {cantPublish && !publishing && <Lock className="size-[13px]" aria-hidden />}
          {publishing ? "Publishing…" : primaryLabel}
        </button>
      )}
    </>
  );

  return (
    <>
      {testId && <PublishConfirmDialog testId={testId} open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={doPublish} fixHref={`/tests/${testId}/edit`} />}
      <header className="topbar row between wrap" style={{ minHeight: 64, height: "auto", padding: "10px 28px", gap: 10, position: "sticky", top: 0, zIndex: 5 }}>
        <div className="row wrap min-w-0" style={{ gap: 10 }}>
          <Link href="/tests" className="btn btn-ghost btn-sm">
            ← Tests
          </Link>
          <h1 className="h3 truncate">{isNew ? "New test" : test?.name ?? "Test"}</h1>
          {!loading && <span className={`badge ${status[0]}`}>{status[1]}</span>}
          {dirty && (scheduled || locked || windowBad || Object.keys(errors).length > 0) && <span className="badge b-amber">Unsaved changes</span>}
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {headerActions}
        </div>
      </header>

      <main className="tb-main">
        {test && locked && !correction && (
          <Banner
            tone="warn"
            className="tb-wide"
            title={live ? "This test is live." : "Students have submitted this test."}
            action={
              <Link href={live ? `/tests/${test.id}/monitor` : `/tests/${test.id}/result`} className="btn btn-secondary">
                {live ? "Open monitor" : "Open results"}
              </Link>
            }
          >
            {live
              ? `You can still change re-entry. It applies the next time a student comes back${test.reentryWaiting ? `; the ${test.reentryWaiting === 1 ? "student" : `${test.reentryWaiting} students`} waiting in the Monitor now keep${test.reentryWaiting === 1 ? "s" : ""} their request` : ""}. Name and note can change too; the rest is locked.`
              : "Its questions, batches and window can't change now. Results settings live on the Results page."}
          </Banner>
        )}
        {test && correction && (
          <Banner
            tone="info"
            className="tb-wide"
            title={`Key corrected on ${istDate(correction.at)} by ${correction.by.name}: Q${correction.n} ${
              correction.mode === "drop" ? "dropped (everyone gets its marks)" : correction.mode === "acceptAlso" ? "now accepts more than one answer" : `changed from (${keyText(correction.oldKey)}) to (${keyText(correction.newKey)})`
            }.`}
            action={
              <Link href={`/tests/${test.id}/detailed-analysis`} className="btn btn-secondary">
                See in Analysis
              </Link>
            }
          >
            {correction.rescored.toLocaleString("en-IN")} scores and ranks were recalculated. {correction.studentsNotified.toLocaleString("en-IN")} students see a &quot;key corrected&quot; note on their result.
          </Banner>
        )}
        {test && scheduled && !locked && test.opensAt && (
          <Banner tone="info" className="tb-wide" title={`Scheduled for ${istDateTime(test.opensAt)}.${test.assignedStudents ? ` ${test.assignedStudents.toLocaleString("en-IN")} students were told.` : ""}`}>
            If you move the time or change batches, they get a new notice when you save.
          </Banner>
        )}
        {test && publishFailed && state === "draft" && (
          <div className="k-srv" style={{ flex: "1 1 100%" }} role="alert">
            <TriangleAlert className="size-4" style={{ color: "#9A5800" }} aria-hidden />
            <span className="col grow" style={{ gap: 2 }}>
              <span className="sm" style={{ fontWeight: 600 }}>
                Saved as a draft, not published.
              </span>
              <span className="xs">The server didn&apos;t confirm publishing. Students can&apos;t see it yet. Your test is safe.</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={publishing || left > 0} onClick={() => void publish()}>
              Try publishing again
            </button>
          </div>
        )}

        {form && explainReentry && <ReEntryExplainer value={form.reentry} onHide={() => setExplainReentry(false)} />}
        <div className="tb-left">
          {/* exam and pattern */}
          <section className="card pad-lg col" style={{ gap: 12 }} aria-labelledby="tb-ep">
            <div className="row between wrap" style={{ gap: 8 }}>
              <h2 id="tb-ep" className="h3">
                Exam and pattern
              </h2>
              <span className="xs muted">Fixed once the test is saved</span>
            </div>
            {loading ? (
              <div className="skel" style={{ height: 60 }} />
            ) : (
              <>
                <div className="tb-g2">
                  <Field label="Exam" htmlFor="tb-exam">
                    {isNew ? (
                      <Combobox
                        id="tb-exam"
                        value={examId}
                        onChange={(v) => {
                          setExamId(v);
                          setPatternId(null);
                        }}
                        options={examOptions}
                        placeholder="Pick an exam"
                        noun="exam"
                        loading={exams.isLoading}
                        loadError={exams.isError ? "Couldn't load exams" : null}
                        onRetry={() => exams.refetch()}
                      />
                    ) : (
                      <ReadOnlyValue>{test?.exam.name}</ReadOnlyValue>
                    )}
                  </Field>
                  <Field
                    label="Pattern"
                    htmlFor="tb-pattern"
                    error={fe("patternId")}
                    hint={
                      isNew ? (
                        !examId ? (
                          "Patterns load once an exam is picked."
                        ) : (
                          <>
                            Not listed? <Link href={`/patterns/new?examId=${encodeURIComponent(examId)}`}>New pattern for {examName}</Link>
                          </>
                        )
                      ) : undefined
                    }
                  >
                    {isNew ? (
                      <Combobox
                        id="tb-pattern"
                        value={patternId}
                        onChange={(v) => v && void create(v)}
                        options={patternOptions}
                        placeholder={examId ? "Pick a pattern" : "Pick an exam first"}
                        disabled={!examId || creating}
                        disabledText={creating ? "Creating the test…" : "Pick an exam first"}
                        noun="pattern"
                        loading={patterns.isLoading}
                        loadError={patterns.isError ? "Couldn't load patterns" : null}
                        onRetry={() => patterns.refetch()}
                      />
                    ) : (
                      <ReadOnlyValue>{test?.pattern.name}</ReadOnlyValue>
                    )}
                  </Field>
                </div>
                {pattern.data && (!isNew || patternId) && <PatternCard p={pattern.data} templateName={templateItems.find((x) => x.id === defaultTpl)?.name ?? null} />}
              </>
            )}
          </section>

          <AiCard
            testId={testId ?? null}
            revision={p?.revision ?? null}
            hasQuestions={hasQuestions}
            manualCount={manualCount}
            aiCount={aiCount}
            disabled={isNew || locked || loading}
            block={aiBlock}
            onBlock={setAiBlock}
            weakFrom={weakFrom}
            onBusy={setAiBusy}
            onBuilt={onBuilt}
            onUndo={onUndoBuild}
            onPickShort={(sub) => setPicker(sub ?? firstOpenSub)}
          />

          {isNew ? (
            <div className="card col" style={{ alignItems: "center", padding: 44, gap: 6, textAlign: "center" }}>
              <span className="h3">{creating ? "Creating the test…" : "Pick a pattern to see its sections"}</span>
              <span className="sm muted" style={{ maxWidth: 420 }}>
                The pattern sets the sections, question types and marks. Then build with AI or pick questions yourself.
              </span>
            </div>
          ) : aiBusy || paper.isLoading || loading ? (
            <div className="col" style={{ gap: 12 }} aria-busy="true" aria-label="Loading sections">
              <div className="skel" style={{ height: 150, borderRadius: 14 }} />
              <div className="skel" style={{ height: 150, borderRadius: 14 }} />
              <div className="skel" style={{ height: 150, borderRadius: 14 }} />
            </div>
          ) : paper.isError ? (
            <section className="card">
              <StateBox tone="error" title="Couldn't load the questions" body="Something went wrong on our side. Try again in a moment." action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => paper.refetch()}>Try again</button>} />
            </section>
          ) : p ? (
            <>
              {!hasQuestions && (
                <div className="card col" style={{ alignItems: "center", padding: 44, gap: 6, textAlign: "center" }}>
                  <span className="h3">No questions yet</span>
                  <span className="sm muted" style={{ maxWidth: 420 }}>
                    Build a draft with AI above, or pick questions section by section: {p.sections.map((s) => s.name).join(", ")}
                    {p.sections.length && p.sections.every((s) => s.subsections.reduce((a, x) => a + x.need, 0) === p.sections[0].subsections.reduce((a, x) => a + x.need, 0))
                      ? ` need ${p.sections[0].subsections.reduce((a, x) => a + x.need, 0)} each.`
                      : "."}
                  </span>
                </div>
              )}
              <Sections paper={p} locked={locked} onPick={setPicker} />
            </>
          ) : null}
        </div>

        {/* settings + checks */}
        <aside className="tb-side" aria-label="Settings and checks">
          <section className="card pad-lg col" style={{ gap: 14 }} aria-labelledby="tb-set">
            <h2 id="tb-set" className="h3">
              Settings
            </h2>
            {loading ? (
              Array.from({ length: 6 }, (_, i) => <div key={i} className="skel" style={{ height: 52 }} />)
            ) : (
              <>
                <Field label="Name" htmlFor="tb-name" error={fe("name")}>
                  <TextInput
                    id="tb-name"
                    value={isNew ? newName : f!.name}
                    maxLength={120}
                    placeholder="e.g. Full mock 14"
                    invalid={!!fe("name")}
                    onChange={(e) => (isNew ? setNewName(e.target.value) : set({ name: e.target.value }))}
                  />
                </Field>
                <Field label="Note for students" optional htmlFor="tb-note" error={fe("noteForStudents")}>
                  <TextInput id="tb-note" value={isNew ? "" : f!.noteForStudents} disabled={isNew} maxLength={300} placeholder="Shown on their Tests page" onChange={(e) => set({ noteForStudents: e.target.value })} />
                </Field>
                <Field
                  label="Batches"
                  htmlFor="tb-batches"
                  error={fe("batchIds") ?? (!isNew && !locked && showErrors && f!.batchIds.length === 0 ? "Pick at least one batch" : null)}
                  hint={isNew ? "Students in these batches see the test." : studentsHint}
                >
                  {locked ? (
                    <ReadOnlyValue>{test!.batches.map((b) => b.name).join(", ") || "No batch"}</ReadOnlyValue>
                  ) : (
                    <MultiSelect
                      id="tb-batches"
                      value={isNew ? [] : f!.batchIds}
                      onChange={(v) => set({ batchIds: v })}
                      options={batchOptions}
                      placeholder="Pick batches"
                      noun="batch"
                      disabled={isNew}
                      invalid={!isNew && showErrors && f!.batchIds.length === 0}
                      loading={batches.isLoading}
                      loadError={batches.isError ? "Couldn't load batches" : null}
                      onRetry={() => batches.refetch()}
                    />
                  )}
                </Field>
                <div className="tb-g2 tight">
                  <Field label="Opens" htmlFor="tb-opens" error={fe("opensAt")}>
                    {locked ? (
                      <ReadOnlyValue>
                        <span className="num">{istDateTime(test!.opensAt)}</span>
                      </ReadOnlyValue>
                    ) : (
                      isNew ? <PendingDate id="tb-opens" /> : <DateTimeField id="tb-opens" value={f!.opensAt} onChange={(v) => set({ opensAt: v })} dialogLabel="When the test opens" />
                    )}
                  </Field>
                  <Field label="Closes" htmlFor="tb-closes" error={fe("closesAt")}>
                    {locked ? (
                      <ReadOnlyValue>
                        <span className="num">{istDateTime(test!.closesAt)}</span>
                      </ReadOnlyValue>
                    ) : (
                      isNew ? <PendingDate id="tb-closes" /> : <DateTimeField id="tb-closes" value={f!.closesAt} onChange={(v) => set({ closesAt: v })} invalid={windowBad} dialogLabel="When the test closes" />
                    )}
                  </Field>
                </div>
                {windowBad && (
                  <span className="k-err" role="alert">
                    Closes must be after Opens ({istDateTime(f!.opensAt).replace(/^.*, /, "")})
                  </span>
                )}
                <div className="tb-g2 tight">
                  <Field label="Time to write" htmlFor="tb-dur" hint="From the pattern.">
                    <AffixInput id="tb-dur" value={test?.durationMinutes ?? pattern.data?.durationMinutes ?? ""} readOnly disabled suffix="min" />
                  </Field>
                  <Field label="Late-save grace" htmlFor="tb-grace" hint="Answers sent this late still count." error={fe("graceMinutes")}>
                    <AffixInput
                      id="tb-grace"
                      inputMode="numeric"
                      value={isNew ? 2 : f!.graceMinutes}
                      disabled={isNew || locked}
                      suffix="min"
                      invalid={!!fe("graceMinutes")}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(15, Number(e.target.value.replace(/\D/g, "")) || 0));
                        set({ graceMinutes: v });
                      }}
                    />
                  </Field>
                </div>
                <Field
                  label="Exam screen"
                  htmlFor="tb-template"
                  error={fe("templateId")}
                  hint={
                    <>
                      Wording, instructions and tools students see. <Link href="/templates" className="underline">Manage templates</Link>
                    </>
                  }
                >
                  <Combobox
                    id="tb-template"
                    value={isNew ? defaultTpl ?? null : f!.templateId}
                    onChange={(v) => v && set({ templateId: v })}
                    options={templateOptions}
                    placeholder={effExam ? "Pick an exam screen" : "Pick an exam first"}
                    disabled={isNew || locked || !effExam}
                    disabledText={!effExam ? "Pick an exam first" : undefined}
                    valueLabel={test?.template?.name}
                    noun="template"
                    loading={templates.isLoading}
                    loadError={templates.isError ? "Couldn't load templates" : null}
                    onRetry={() => templates.refetch()}
                  />
                </Field>
                <Field label="Results" group hint={modeHint(isNew ? "atTheEndOfTest" : f!.resultMode, isNew ? null : f!.closesAt, isNew ? 2 : f!.resultAfterDays)}>
                  <Segmented
                    full
                    ariaLabel="When results come out"
                    value={MODE_KEY[isNew ? "atTheEndOfTest" : f!.resultMode] ? (isNew ? "atTheEndOfTest" : f!.resultMode) : null}
                    onChange={(v) => set({ resultMode: v as ResultMode })}
                    options={RESULT_MODES.map((m) => ({ value: m.key, label: m.label, disabled: isNew || locked }))}
                  />
                  {!isNew && f!.resultMode === "autoAfterXDays" && (
                    <div className="row" style={{ gap: 8, marginTop: 4 }}>
                      <NumberStepper aria-label="Days after close" value={f!.resultAfterDays} min={1} max={30} width={130} onChange={(v) => set({ resultAfterDays: v ?? 1 })} />
                      <span className="xs muted">days after it closes</span>
                    </div>
                  )}
                </Field>
                <div className="col" style={{ gap: 10, paddingTop: 12, borderTop: "1px solid var(--line-2)" }}>
                  <span className="sm" style={{ fontWeight: 600 }}>
                    Exam controls
                  </span>
                  <Checkbox checked={isNew ? true : f!.fullscreen.enabled} disabled={isNew || locked} onChange={(v) => set({ fullscreen: { ...f!.fullscreen, enabled: v } })}>
                    Keep students in fullscreen
                  </Checkbox>
                  {(isNew || f!.fullscreen.enabled) && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)", gap: 10, paddingLeft: 28 }}>
                        <Field label="Exits allowed" htmlFor="tb-exits" error={fe("fullscreenPolicy.maxExits")}>
                          <NumberStepper
                            id="tb-exits"
                            value={isNew ? 3 : f!.fullscreen.maxExits}
                            min={1}
                            max={10}
                            width={112}
                            onChange={(v) => set({ fullscreen: { ...f!.fullscreen, maxExits: Math.max(1, Math.min(10, v ?? 1)) } })}
                          />
                        </Field>
                        <Field label="After the last exit" group>
                          <Segmented
                            size="sm"
                            ariaLabel="After the last exit"
                            value={isNew ? "warn" : f!.fullscreen.action}
                            onChange={(v) => set({ fullscreen: { ...f!.fullscreen, action: v } })}
                            options={[
                              { value: "warn", label: "Warn only", disabled: isNew || locked },
                              { value: "submit", label: "Submit test", disabled: isNew || locked },
                            ]}
                          />
                        </Field>
                      </div>
                      <span className="hint" style={{ paddingLeft: 28 }}>
                        {(isNew ? "warn" : f!.fullscreen.action) === "warn"
                          ? "Each exit shows a warning and is listed in Monitor and Results."
                          : `The ${ord((isNew ? 3 : f!.fullscreen.maxExits) + 1)} exit submits the test with the answers so far.`}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ paddingTop: 12, borderTop: "1px solid var(--line-2)" }}>
                  <ReEntrySetting
                    value={isNew ? reentryOf(null) : f!.reentry}
                    onChange={(v) => set({ reentry: v })}
                    disabled={isNew || ended_}
                    closesAt={isNew || !f!.closesAt ? null : istDateTime(f!.closesAt)}
                    serverError={fe("reentry.minutes") ?? fe("reentry.policy")}
                    explain={explainReentry}
                    onToggleExplain={() => setExplainReentry((x) => !x)}
                  />
                </div>
              </>
            )}
          </section>
          <Checks readiness={readiness.data} isNew={isNew} loading={readiness.isLoading || readiness.isFetching} locked={locked} latexHref={latexSlot ? `/questions/${latexSlot.questionId}/edit` : null} onFix={onFix} />
        </aside>
      </main>

      {test && (
        <UnsavedChangesDialog
          open={!!leave}
          onOpenChange={(o) => !o && setLeave(null)}
          what={changeSummary(patch, test) || "Your changes to this test aren't saved yet."}
          onDiscard={() => {
            const to = leave!;
            setForm(formOf(test));
            setLeave(null);
            setTimeout(() => router.push(to), 0);
          }}
          onSave={async () => {
            const to = leave!;
            const ok = await save({ quiet: true });
            setLeave(null);
            if (ok) router.push(to);
          }}
        />
      )}
    </>
  );
}

/** Admin-QuestionPicker page for one sub-section (same address as question-picker's pickerHref). */
const pickerHref = (testId: string, sub: string) => `/tests/${encodeURIComponent(testId)}/pick?sub=${encodeURIComponent(sub)}`;

/** A date field before the test exists (board new-empty: "Pick a date and time", IST). */
function PendingDate({ id }: { id: string }) {
  return (
    <button id={id} type="button" className="k-cb dis" disabled title="Pick a pattern first">
      <CalendarDays className="size-[15px]" aria-hidden />
      <span className="v ph">Pick a date and time</span>
      <span className="k-ist">IST</span>
    </button>
  );
}

function keyText(k: { optionIds?: string[]; range?: { from: number; to: number } }): string {
  if (k.optionIds?.length) return k.optionIds.join(", ");
  if (k.range) return k.range.from === k.range.to ? String(k.range.from) : `${k.range.from} to ${k.range.to}`;
  return "…";
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="topbar row between h-16 shrink-0 gap-3 px-7">
        <div className="row min-w-0 gap-2.5">
          <Link href="/tests" className="btn btn-ghost btn-sm">
            ← Tests
          </Link>
          <h1 className="h3 truncate">{title}</h1>
        </div>
      </header>
      <main className="col gap-3.5 px-7 pt-5 pb-10">{children}</main>
    </>
  );
}

/** "JEE Main · 2026 · 3 sections · 75 questions · 300 marks · 180 min" + sub-section badges. */
function PatternCard({ p, templateName }: { p: import("@/lib/m6-contract").Pattern; templateName: string | null }) {
  const sig = (s: (typeof p.sections)[number]) => s.subsections.map((x) => `${x.type}:${x.totalQuestions}:${x.marking.correct}:${x.marking.incorrect}`).join("|");
  const same = p.sections.length > 1 && p.sections.every((s) => sig(s) === sig(p.sections[0]));
  const subs = same ? p.sections[0].subsections : p.sections.flatMap((s) => s.subsections);
  const label = (x: (typeof subs)[number]) => {
    const t = { single: "single correct", multiple: "more than one correct", integer: "numerical", paragraph: "paragraph", matrix: "matrix match" }[x.type];
    const neg = x.marking.incorrect < 0 ? `−${Math.abs(x.marking.incorrect)}` : "0";
    const part = x.marking.partial.length ? ", partial" : "";
    const opt = x.toAttempt < x.totalQuestions ? `, attempt ${x.toAttempt}` : "";
    return `${x.totalQuestions} ${t} (+${x.marking.correct} / ${neg}${part}${opt})`;
  };
  const shown = subs.slice(0, 5);
  return (
    <div className="tb-pat">
      <div className="row between wrap" style={{ gap: 8 }}>
        <span className="sm" style={{ fontWeight: 600 }}>
          {p.name}
        </span>
        <span className="xs muted num">
          {p.totals.sections} section{p.totals.sections === 1 ? "" : "s"} · {p.totals.questions} questions · {p.totals.marks} marks · {p.durationMinutes} min
        </span>
      </div>
      <div className="row wrap" style={{ gap: 6 }}>
        {shown.map((x, i) => (
          <span key={x.id} className="badge b-grey">
            {same && i === 0 ? "Each: " : ""}
            {label(x)}
          </span>
        ))}
        {subs.length > shown.length && <span className="badge b-grey">+{subs.length - shown.length} more</span>}
        {templateName && <span className="badge b-grey">Default screen: {templateName}</span>}
      </div>
    </div>
  );
}
