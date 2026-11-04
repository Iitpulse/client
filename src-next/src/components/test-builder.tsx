"use client";

/*
  Admin-TestBuilder board: one component for /tests/new and /tests/[testId]/edit (they were two near-duplicate pages).
  Left: the pattern, then one card per section (questions, marks, difficulty mix, chapters, sub-sections with
  Add questions). Right: Settings (name, batches, window, results, exam controls) and "Ready to publish?".
  The board's "Describe the test" AI builder is M6 and is not drawn. Same API calls and payloads as before.
*/

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChevronDown, ChevronRight, Lock, Plus, Trash2 } from "lucide-react";
import { MathText } from "@iitpulse/ui";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuestionSelectionModal } from "@/components/question-selection-modal";
import { QuestionPreviewDialog } from "@/components/question-preview-dialog";
import { Topbar } from "@/components/admin/Topbar";
import { testState, type AdminTest, type TestState } from "@/lib/queries";
import type { IBatch, IExam, IPattern, IQuestion, ISection, ISubSection } from "@/types";

type PublishType = "immediately" | "atTheEndOfTest" | "autoAfterXDays" | "manual";
const RESULT_MODES: { value: PublishType; label: string }[] = [
  { value: "immediately", label: "Instant" },
  { value: "atTheEndOfTest", label: "At close" },
  { value: "autoAfterXDays", label: "After days" },
  { value: "manual", label: "Manual" },
];

interface TestSubSection extends ISubSection {
  questions?: IQuestion[];
}
interface TestSection extends ISection {
  subSections: TestSubSection[];
}
interface FullscreenPolicy {
  enabled: boolean;
  maxExits: number;
  action: "warn" | "submit";
}
interface FormState {
  name: string;
  description: string;
  exam: { id: string; name: string } | null;
  pattern: { id: string; name: string } | null;
  batches: Array<{ id: string; name: string }>;
  validityFrom: Date | undefined;
  validityTo: Date | undefined;
  publishType: PublishType;
  daysAfter: number;
  sections: TestSection[];
  durationInMinutes: number;
  fullscreenPolicy: FullscreenPolicy;
  autoSubmitGracePeriodMinutes: number;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  exam: null,
  pattern: null,
  batches: [],
  validityFrom: undefined,
  validityTo: undefined,
  publishType: "immediately",
  daysAfter: 1,
  sections: [],
  durationInMinutes: 180,
  fullscreenPolicy: { enabled: false, maxExits: 3, action: "warn" },
  autoSubmitGracePeriodMinutes: 2,
};

function list<T>(body: unknown, ...keys: string[]): T[] {
  if (Array.isArray(body)) return body as T[];
  const b = body as Record<string, unknown> | undefined;
  for (const k of ["data", ...keys]) if (Array.isArray(b?.[k])) return b![k] as T[];
  return [];
}

function errorText(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string } } };
  return ax?.response?.data?.message || (e instanceof Error ? e.message : fallback);
}

const questionText = (q: IQuestion) => q.en?.question || q.question || "";
const hasSolution = (q: IQuestion) => {
  const s = (q as { en?: { solution?: string } }).en?.solution || q.solution || "";
  return s.replace(/<[^>]*>/g, "").trim().length > 0;
};

/** Ensure Hindi options carry a value (copied from English), as both old pages did before saving. */
function normaliseSections(sections: TestSection[]) {
  return sections.map((section) => ({
    ...section,
    subSections: section.subSections.map((ss) => ({
      ...ss,
      questions: (ss.questions || []).map((question) => {
        const q = question as {
          options?: Array<{ id: string; en?: { value: string }; hi?: { value: string } }>;
          en?: { options?: Array<{ id: string; value: string }> };
          hi?: { options?: Array<{ id: string; value: string }> };
        };
        if (q.options)
          return {
            ...question,
            options: q.options.map((opt) => ({ ...opt, en: opt.en || { value: "" }, hi: opt.hi?.value ? opt.hi : { value: opt.en?.value || "" } })),
          };
        if (q.en?.options)
          return {
            ...question,
            hi: { ...q.hi, options: q.en.options.map((opt, i) => ({ id: opt.id, value: q.hi?.options?.[i]?.value || opt.value || "" })) },
          };
        return question;
      }),
    })),
  }));
}

function publishDate(f: FormState): string | null {
  if (f.publishType === "immediately") return new Date().toISOString();
  if (f.publishType === "atTheEndOfTest" && f.validityTo) return f.validityTo.toISOString();
  if (f.publishType === "autoAfterXDays" && f.validityTo) {
    const d = new Date(f.validityTo);
    d.setDate(d.getDate() + f.daysAfter);
    return d.toISOString();
  }
  return null;
}

const marksOf = (ss: TestSubSection) => (ss.toBeAttempted ?? ss.totalQuestions ?? 0) * (ss.markingScheme?.correct?.[0] ?? ss.marksPerQuestion ?? 0);

const STATE_BADGE: Record<TestState, [string, string]> = {
  draft: ["b-sky", "Draft"],
  scheduled: ["b-navy", "Scheduled"],
  live: ["b-live", "Live"],
  ended: ["b-grey", "Ended"],
};

export function TestBuilder({ testId }: { testId?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!testId;

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [original, setOriginal] = React.useState<FormState>(EMPTY);
  const [saved, setSaved] = React.useState<AdminTest | null>(null);
  const [locked, setLocked] = React.useState<string | null>(null);
  const [exams, setExams] = React.useState<IExam[]>([]);
  const [patterns, setPatterns] = React.useState<IPattern[]>([]);
  const [batches, setBatches] = React.useState<IBatch[]>([]);
  const [subjects, setSubjects] = React.useState<Record<string, string>>({});
  const [fetching, setFetching] = React.useState(isEdit);
  const [saving, setSaving] = React.useState<"draft" | "publish" | null>(null);
  const [modal, setModal] = React.useState<{ sectionId: string; subSectionId: string; subject: string; type: string; max: number; current: IQuestion[] } | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const dirty = React.useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);
  const { showDialog, confirmNavigation, cancelNavigation, navigateWithCheck } = useUnsavedChanges({
    isDirty: dirty && !saving,
    message: "You have unsaved changes to this test. Are you sure you want to leave?",
  });

  // Exams, batches, subject names; the test itself when editing.
  React.useEffect(() => {
    (async () => {
      try {
        const [examsRes, batchesRes, subjectsRes, testRes] = await Promise.all([
          isEdit ? Promise.resolve(null) : api.exams.getAll(),
          api.batches.getAll(),
          api.subjects.getAll(),
          isEdit ? api.tests.getById(testId!) : Promise.resolve(null),
        ]);
        if (examsRes) setExams(list<IExam>(examsRes.data, "exams"));
        setBatches(list<IBatch>(batchesRes.data, "batches"));
        const names: Record<string, string> = {};
        for (const s of list<{ _id: string; name: string }>(subjectsRes.data, "subjects")) if (s._id) names[s._id] = s.name;
        setSubjects(names);

        const t = testRes ? (testRes.data?.data ?? testRes.data) : null;
        if (t) {
          const ref = (r: unknown) => {
            if (!r || typeof r !== "object") return null;
            const o = r as { id?: string; _id?: string; name: string };
            return { id: o.id || o._id || "", name: o.name };
          };
          const loaded: FormState = {
            name: t.name || "",
            description: t.description || "",
            exam: ref(t.exam),
            pattern: ref(t.pattern),
            batches: (t.batches || []).map((b: { id?: string; _id?: string; name: string }) => ({ id: b.id || b._id || "", name: b.name })),
            validityFrom: t.validity?.from ? new Date(t.validity.from) : undefined,
            validityTo: t.validity?.to ? new Date(t.validity.to) : undefined,
            publishType: (t.result?.publishProps?.type as PublishType) || "immediately",
            daysAfter:
              t.result?.publishProps?.type === "autoAfterXDays" && t.result?.publishProps?.publishDate && t.validity?.to
                ? Math.max(1, dayjs(t.result.publishProps.publishDate).diff(dayjs(t.validity.to), "day"))
                : 1,
            sections: (t.sections || []).map((s: TestSection) => ({ ...s, subSections: (s.subSections || []).map((ss) => ({ ...ss, questions: ss.questions || [] })) })),
            durationInMinutes: t.durationInMinutes || 180,
            fullscreenPolicy: { ...EMPTY.fullscreenPolicy, ...(t.fullscreenPolicy || {}) },
            autoSubmitGracePeriodMinutes: t.autoSubmitGracePeriodMinutes ?? 2,
          };
          setForm(loaded);
          setOriginal(loaded);
          setSaved(t);
          const st = testState(t);
          if (st === "live") setLocked("This test is live. It can be edited again once it closes.");
          else if (st === "ended") {
            try {
              const r = await api.tests.getAdminResult(testId!);
              if ((r.data?.data?.submissions?.length ?? 0) > 0)
                setLocked("Students have submitted this test, so its questions, batches and window can no longer change. Result settings are on the Results page.");
            } catch {
              /* the server still refuses unsafe edits */
            }
          }
        }
      } catch (e) {
        console.error("Failed to load test builder data:", e);
        toast({ title: "Error", description: isEdit ? "Failed to load test data" : "Failed to load exams and batches", variant: "destructive" });
      } finally {
        setFetching(false);
      }
    })();
  }, [isEdit, testId, toast]);

  // Patterns for the chosen exam (create only: exam and pattern are fixed after creation).
  React.useEffect(() => {
    if (isEdit) return;
    if (!form.exam?.id) {
      setPatterns([]);
      return;
    }
    api.patterns
      .getByExam(form.exam.id)
      .then((r) => setPatterns(list<IPattern>(r.data, "patterns")))
      .catch(() => setPatterns([]));
  }, [isEdit, form.exam?.id]);

  const pickPattern = (patternId: string) => {
    const p = patterns.find((x) => x._id === patternId);
    setForm((prev) => ({
      ...prev,
      pattern: p ? { id: p._id, name: p.name } : null,
      durationInMinutes: p?.durationInMinutes || 180,
      sections: p ? p.sections.map((s) => ({ ...s, subSections: s.subSections.map((ss) => ({ ...ss, questions: [] })) })) : [],
    }));
  };

  const subjectName = (id: string) => (id.startsWith("SB_") ? subjects[id] || id : id);

  const updateSub = (sectionId: string, subId: string, fn: (q: IQuestion[]) => IQuestion[]) =>
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, subSections: s.subSections.map((ss) => (ss.id !== subId ? ss : { ...ss, questions: fn(ss.questions || []) })) }
      ),
    }));

  // ---- checks (mirror the server's publish checks) ----
  const allSubs = form.sections.flatMap((s) => s.subSections.map((ss) => ({ s, ss })));
  const needed = allSubs.reduce((n, { ss }) => n + (ss.totalQuestions || 0), 0);
  const filled = allSubs.reduce((n, { ss }) => n + (ss.questions?.length || 0), 0);
  const allQuestions = allSubs.flatMap(({ ss }) => ss.questions || []);
  const missingSolutions = allQuestions.filter((q) => !hasSolution(q)).length;
  const unsupported = allSubs.filter(({ ss }) => ss.type === "paragraph" || ss.type === "matrix");
  const datesOk =
    !!form.validityFrom && !!form.validityTo && form.validityTo > form.validityFrom && (form.validityTo.getTime() > Date.now() || !!locked);
  const checks: { ok: boolean; label: string; blocking: boolean }[] = [
    { ok: !!form.name.trim() && !!form.exam && !!form.pattern, blocking: true, label: form.pattern ? "Name, exam and pattern set" : "Pick an exam and a pattern, and name the test" },
    {
      ok: datesOk,
      blocking: true,
      label: !form.validityFrom || !form.validityTo ? "Set when it opens and closes" : datesOk ? "Closes after it opens, and in the future" : "Close must be after open, and in the future",
    },
    { ok: form.batches.length > 0, blocking: true, label: form.batches.length ? `${form.batches.length === 1 ? "1 batch" : `${form.batches.length} batches`} selected` : "Select at least one batch" },
    {
      ok: needed > 0 && filled >= needed,
      blocking: true,
      label: needed ? (filled >= needed ? `All ${needed} questions filled (pattern needs ${needed})` : `${filled} of ${needed} questions filled (pattern needs ${needed})`) : "Questions are checked once a pattern is picked",
    },
    {
      ok: filled > 0 && missingSolutions === 0,
      blocking: false,
      label: filled === 0 ? "Solutions are checked once questions are added" : missingSolutions ? `${missingSolutions} question${missingSolutions === 1 ? "" : "s"} without a solution` : "Every question has a solution",
    },
    { ok: unsupported.length === 0, blocking: true, label: unsupported.length ? `${unsupported.length} paragraph or matrix sub-section${unsupported.length === 1 ? "" : "s"} (students can't answer these yet)` : "No paragraph or matrix sections" },
  ];
  const blockingLeft = checks.filter((c) => c.blocking && !c.ok).length;

  const state = saved ? testState(saved) : "draft";
  const isPublished = !!saved && saved.status !== "draft";
  const primaryLabel = isPublished ? "Save changes" : "Publish test";

  const save = async (asDraft: boolean) => {
    if (asDraft) {
      const err = !form.name.trim()
        ? "Test name is required"
        : !form.exam
          ? "Please select an exam"
          : !form.pattern
            ? "Please select a pattern"
            : !form.batches.length
              ? "Please select at least one batch"
              : null;
      if (err) return toast({ title: "Validation Error", description: err, variant: "destructive" });
    } else if (blockingLeft) {
      return toast({ title: "Not ready to publish", description: checks.find((c) => c.blocking && !c.ok)?.label, variant: "destructive" });
    }

    setSaving(asDraft ? "draft" : "publish");
    const body = {
      name: form.name,
      description: form.description,
      exam: form.exam,
      pattern: form.pattern,
      sections: normaliseSections(form.sections),
      batches: form.batches.map((b) => ({ ...b, _id: b.id })),
      validity: { from: form.validityFrom?.toISOString() ?? null, to: form.validityTo?.toISOString() ?? null },
      durationInMinutes: form.durationInMinutes,
      result: {
        maxMarks: null,
        averageMarks: null,
        averageCompletionTime: null,
        publishProps: { type: form.publishType, publishDate: publishDate(form), isPublished: false },
        students: [],
      },
      status: asDraft ? "draft" : "published",
      fullscreenPolicy: form.fullscreenPolicy,
      autoSubmitGracePeriodMinutes: form.autoSubmitGracePeriodMinutes,
      modifiedAt: new Date().toISOString(),
    };
    try {
      if (isEdit) {
        await api.tests.update({ id: testId, ...body });
        toast({ title: asDraft ? "Draft saved" : isPublished ? "Test updated" : "Test published", description: asDraft ? "Test has been saved as draft" : "Test has been updated successfully" });
      } else {
        const created = await api.tests.create({ ...body, createdAt: new Date().toISOString() });
        // The API always creates drafts; publishing is a separate call.
        if (!asDraft) {
          const id = created.data?.data?._id || created.data?.data?.id;
          if (!id) throw new Error("Test was saved as a draft but its ID was not returned, so it could not be published");
          try {
            await api.tests.publish(id);
          } catch (e) {
            toast({
              title: "Saved as draft, not published",
              description: errorText(e, "The test was created but could not be published. Open it from the Tests list and publish it."),
              variant: "destructive",
            });
            qc.invalidateQueries({ queryKey: ["tests"] });
            setOriginal(form);
            router.push("/tests");
            return;
          }
        }
        toast({ title: asDraft ? "Draft saved" : "Test published", description: asDraft ? "Test has been saved as draft" : "Test has been created and published" });
      }
      qc.invalidateQueries({ queryKey: ["tests"] });
      setOriginal(form);
      router.push("/tests");
    } catch (e) {
      toast({ title: "Error", description: errorText(e, isEdit ? "Failed to update test" : "Failed to create test"), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const resultHint = (() => {
    const at = publishDate(form);
    switch (form.publishType) {
      case "immediately":
        return "Each student sees their result as soon as they submit";
      case "atTheEndOfTest":
        return at ? `Published when the test closes, ${dayjs(at).format("D MMM, h:mm A")}` : "Published when the test closes";
      case "autoAfterXDays":
        return at ? `Published ${dayjs(at).format("D MMM, h:mm A")}` : "Published a set number of days after the test closes";
      default:
        return "You publish results yourself from the Results page";
    }
  })();

  const [cls, label] = STATE_BADGE[state];
  const editingDisabled = !!locked;

  return (
    <>
      <Topbar
        title={isEdit ? form.name || "Edit test" : "New test"}
        back={{ href: "/tests", label: "Tests" }}
        badge={isEdit && saved ? <span className={`badge ${cls}`}>{state === "live" && <span className="live-dot" />}{label}</span> : <span className="badge b-sky">Draft</span>}
        actions={
          <>
            {isEdit && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigateWithCheck(`/tests/${testId}/preview`)}>
                Preview as student
              </button>
            )}
            {!isPublished && (
              <button type="button" className="btn btn-secondary btn-sm" disabled={!!saving || editingDisabled || fetching} onClick={() => save(true)}>
                {saving === "draft" ? "Saving…" : "Save as draft"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!!saving || editingDisabled || fetching || blockingLeft > 0}
              title={blockingLeft ? `${blockingLeft} check${blockingLeft === 1 ? "" : "s"} left` : `${primaryLabel}: ${form.name}`}
              onClick={() => save(false)}
            >
              {blockingLeft > 0 && <Lock className="size-3.5" aria-hidden />}
              {saving === "publish" ? (isPublished ? "Saving…" : "Publishing…") : primaryLabel}
            </button>
          </>
        }
      />

      <main className="flex flex-wrap items-start gap-[18px] px-7 pt-[22px] pb-10">
        <div className="col min-w-0 gap-3.5" style={{ flex: "999 1 560px" }}>
          {locked && (
            <div className="row gap-2.5 rounded-control bg-warning-50 p-3 text-warning" role="status">
              <Lock className="size-4 shrink-0" aria-hidden />
              <span className="sm">{locked}</span>
            </div>
          )}

          <section className="card pad-lg col gap-3">
            <span className="h3">Pattern</span>
            {isEdit ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="field">
                  <span className="label">Exam</span>
                  <span className="sm">{form.exam?.name || "—"}</span>
                </div>
                <div className="field">
                  <span className="label">Pattern</span>
                  <span className="sm">
                    {form.pattern?.name || "—"} · {form.durationInMinutes} min
                  </span>
                </div>
                <span className="hint sm:col-span-2">Exam and pattern are fixed once a test is created.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="field">
                  <span className="label">Exam</span>
                  <SearchableSelect
                    options={exams.map((e) => ({ value: e._id, label: e.name }))}
                    value={form.exam?.id || ""}
                    onValueChange={(id) => {
                      const e = exams.find((x) => x._id === id);
                      setForm((p) => ({ ...p, exam: e ? { id: e._id, name: e.name } : null, pattern: null, sections: [] }));
                    }}
                    placeholder="Select Exam"
                    searchPlaceholder="Search exams..."
                    emptyText="No exams found"
                    onCreateNew={() => navigateWithCheck("/exams")}
                    createNewLabel="Create new exam..."
                  />
                </div>
                <div className="field">
                  <span className="label">Pattern</span>
                  <SearchableSelect
                    options={patterns.map((p) => ({ value: p._id, label: p.name }))}
                    value={form.pattern?.id || ""}
                    onValueChange={pickPattern}
                    placeholder={!form.exam ? "Select exam first" : patterns.length === 0 ? "No patterns available" : "Select Pattern"}
                    searchPlaceholder="Search patterns..."
                    emptyText="No patterns found"
                    disabled={!form.exam || patterns.length === 0}
                    onCreateNew={() => navigateWithCheck("/patterns/new")}
                    createNewLabel="Create new pattern..."
                  />
                </div>
              </div>
            )}
          </section>

          {fetching && (
            <div className="col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skel h-[120px] rounded-[14px]" />
              ))}
            </div>
          )}
          {!fetching && form.sections.length === 0 && (
            <div className="card col items-center gap-1.5 p-12 text-center">
              <span className="h3">No sections yet</span>
              <span className="sm muted">Pick an exam and a pattern, then add questions to each section.</span>
            </div>
          )}
          {form.sections.map((section, i) => (
            <SectionCard
              key={section.id}
              index={i}
              section={section}
              subjectName={subjectName(section.subject || "")}
              disabled={editingDisabled}
              onAdd={(ss) =>
                setModal({
                  sectionId: section.id,
                  subSectionId: ss.id,
                  subject: section.subject || "",
                  type: ss.type,
                  max: ss.totalQuestions || 0,
                  current: ss.questions || [],
                })
              }
              onRemove={(ss, qid) => updateSub(section.id, ss.id, (qs) => qs.filter((q) => q._id !== qid))}
            />
          ))}
        </div>

        <aside className="col gap-3.5 xl:max-w-[380px]" style={{ flex: "1 1 320px" }}>
          <section className="card pad-lg col gap-3">
            <span className="h3">Settings</span>
            <div className="field">
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="input h-[38px] text-sm"
                placeholder="Title for test"
                value={form.name}
                disabled={editingDisabled}
                onChange={(e) => set("name", e.target.value.replace(/[^a-zA-Z0-9-_ ]/g, ""))}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="description">
                Description
              </label>
              <input
                id="description"
                className="input h-[38px] text-sm"
                placeholder="Small description for test"
                value={form.description}
                disabled={editingDisabled}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="field">
              <span className="label" id="batches-label">
                Batches
              </span>
              <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto" role="group" aria-labelledby="batches-label">
                {batches.length === 0 && <span className="hint">No batches yet</span>}
                {batches.map((b) => {
                  const on = form.batches.some((x) => x.id === b._id);
                  return (
                    <button
                      key={b._id}
                      type="button"
                      aria-pressed={on}
                      disabled={editingDisabled}
                      className={`chip h-[30px] ${on ? "on" : ""}`}
                      onClick={() =>
                        set("batches", on ? form.batches.filter((x) => x.id !== b._id) : [...form.batches, { id: b._id, name: b.name }])
                      }
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="field">
                <span className="label">Opens</span>
                <DateTimePicker value={form.validityFrom} onChange={(d) => set("validityFrom", d)} placeholder="Pick start date and time" />
              </div>
              <div className="field">
                <span className="label">Closes</span>
                <DateTimePicker value={form.validityTo} onChange={(d) => set("validityTo", d)} placeholder="Pick end date and time" />
              </div>
            </div>
            <div className="field">
              <span className="label" id="results-label">
                Results
              </span>
              <div className="seg flex w-full" role="radiogroup" aria-labelledby="results-label">
                {RESULT_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={form.publishType === m.value}
                    className={`tab flex-1 justify-center px-1.5 ${form.publishType === m.value ? "on" : ""}`}
                    onClick={() => set("publishType", m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {form.publishType === "autoAfterXDays" && (
                <div className="row mt-1 gap-2">
                  <label htmlFor="daysAfter" className="sm text-ink-2">
                    Days after close
                  </label>
                  <input
                    id="daysAfter"
                    type="number"
                    min={1}
                    className="input h-8 w-20 text-sm"
                    value={form.daysAfter}
                    onChange={(e) => set("daysAfter", parseInt(e.target.value) || 1)}
                  />
                </div>
              )}
              <span className="hint">{resultHint}</span>
            </div>
          </section>

          <section className="card pad-lg col gap-3">
            <span className="h3">Exam controls</span>
            <label className="row gap-2.5 text-sm" htmlFor="fullscreenEnabled">
              <Checkbox
                id="fullscreenEnabled"
                checked={form.fullscreenPolicy.enabled}
                disabled={editingDisabled}
                onCheckedChange={(c) => set("fullscreenPolicy", { ...form.fullscreenPolicy, enabled: c === true })}
              />
              Enforce fullscreen mode
            </label>
            {form.fullscreenPolicy.enabled && (
              <div className="grid grid-cols-2 gap-2.5 pl-8">
                <div className="field">
                  <label className="label" htmlFor="maxExits">
                    Exits allowed
                  </label>
                  <input
                    id="maxExits"
                    type="number"
                    min={1}
                    max={10}
                    className="input h-[38px] text-sm"
                    value={form.fullscreenPolicy.maxExits}
                    onChange={(e) => set("fullscreenPolicy", { ...form.fullscreenPolicy, maxExits: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="field">
                  <span className="label">Then</span>
                  <Select
                    value={form.fullscreenPolicy.action}
                    onValueChange={(v: "warn" | "submit") => set("fullscreenPolicy", { ...form.fullscreenPolicy, action: v })}
                  >
                    <SelectTrigger className="h-[38px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warn">Show warning only</SelectItem>
                      <SelectItem value="submit">Auto-submit test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="gracePeriod">
                Auto-submit grace period (minutes)
              </label>
              <input
                id="gracePeriod"
                type="number"
                min={0}
                max={30}
                className="input h-[38px] w-24 text-sm"
                value={form.autoSubmitGracePeriodMinutes}
                disabled={editingDisabled}
                onChange={(e) => set("autoSubmitGracePeriodMinutes", Number.isNaN(parseInt(e.target.value)) ? 2 : parseInt(e.target.value))}
              />
              <span className="hint">Time after the test closes before the server submits for disconnected students.</span>
            </div>
          </section>

          <section className="card pad-lg col gap-1">
            <span className="h3 mb-1.5">Ready to publish?</span>
            {checks.map((c) => (
              <div key={c.label} className="row gap-2.5 py-1.5 text-[13px]">
                <i
                  className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold not-italic ${
                    c.ok ? "bg-success text-white" : "border border-[#F1D29A] bg-warning-50 text-warning"
                  }`}
                  aria-hidden
                >
                  {c.ok ? "✓" : "!"}
                </i>
                <span>
                  {c.label}
                  {!c.ok && !c.blocking && <span className="muted"> (optional)</span>}
                </span>
              </div>
            ))}
          </section>
        </aside>
      </main>

      {modal && (
        <QuestionSelectionModal
          open
          onClose={() => setModal(null)}
          subject={modal.subject}
          type={modal.type}
          maxQuestions={modal.max}
          selectedQuestions={modal.current}
          onSave={(qs) => {
            updateSub(modal.sectionId, modal.subSectionId, () => qs);
            setModal(null);
          }}
        />
      )}
      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
        description="You have unsaved changes to this test. Are you sure you want to leave?"
      />
    </>
  );
}

const DIFF_COLORS: Record<string, string> = { easy: "var(--diff-easy)", medium: "var(--diff-med)", hard: "var(--diff-hard)" };

function SectionCard({
  index,
  section,
  subjectName,
  disabled,
  onAdd,
  onRemove,
}: {
  index: number;
  section: TestSection;
  subjectName: string;
  disabled: boolean;
  onAdd: (ss: TestSubSection) => void;
  onRemove: (ss: TestSubSection, questionId: string) => void;
}) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [preview, setPreview] = React.useState<IQuestion | null>(null);
  const questions = section.subSections.flatMap((ss) => ss.questions || []);
  const needed = section.subSections.reduce((n, ss) => n + (ss.totalQuestions || 0), 0);
  const marks = section.subSections.reduce((n, ss) => n + marksOf(ss), 0);
  const diff = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
  for (const q of questions) {
    const d = String(q.difficulty || "").toLowerCase();
    if (d in diff) diff[d]++;
  }
  const chapters = new Map<string, number>();
  for (const q of questions) for (const c of q.chapters || []) if (c?.name) chapters.set(c.name, (chapters.get(c.name) ?? 0) + 1);
  const topChapters = [...chapters.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <article className="card pad-lg col rise gap-3" style={{ ["--i" as string]: index }}>
      <div className="row between wrap gap-2">
        <div className="row wrap gap-2.5">
          <span className="h3">{section.name}</span>
          <span className="badge b-grey">
            {questions.length}
            {needed ? ` of ${needed}` : ""} questions{marks ? ` · ${marks} marks` : ""}
          </span>
          {subjectName && subjectName !== section.name && <span className="xs muted">{subjectName}</span>}
        </div>
      </div>

      {questions.length > 0 && (
        <div className="col gap-1.5">
          <div className="row between xs muted">
            <span>Difficulty</span>
            <span>
              {diff.easy} easy · {diff.medium} medium · {diff.hard} hard
            </span>
          </div>
          <div className="mix" role="img" aria-label={`${diff.easy} easy, ${diff.medium} medium, ${diff.hard} hard`}>
            {(["easy", "medium", "hard"] as const).map((d, i) =>
              diff[d] ? <span key={d} style={{ flex: diff[d], background: DIFF_COLORS[d], animationDelay: `${i * 0.1}s` }} /> : null
            )}
          </div>
        </div>
      )}
      {topChapters.length > 0 && (
        <div className="row wrap gap-1.5">
          {topChapters.slice(0, 3).map(([name, n], i) => (
            <span key={name} className={`badge ${i === 0 ? "b-navy" : "b-grey"}`}>
              {name} · {n}
            </span>
          ))}
          {topChapters.length > 3 && <span className="badge b-grey">+{topChapters.length - 3} chapters</span>}
        </div>
      )}

      <div className="col divide-y divide-line-2 rounded-control border border-line-2">
        {section.subSections.map((ss) => {
          const have = ss.questions?.length || 0;
          const need = ss.totalQuestions || 0;
          const isOpen = open[ss.id];
          return (
            <div key={ss.id} className="col">
              <div className="row gap-3 px-3 py-2.5">
                <button
                  type="button"
                  className="row grow gap-2 text-left"
                  aria-expanded={isOpen}
                  disabled={!have}
                  onClick={() => setOpen((p) => ({ ...p, [ss.id]: !p[ss.id] }))}
                >
                  {have ? (isOpen ? <ChevronDown className="size-4 text-muted" /> : <ChevronRight className="size-4 text-muted" />) : <span className="w-4" />}
                  <span className="col gap-0.5">
                    <span className="sm font-semibold">{ss.name}</span>
                    <span className="xs muted">
                      {ss.type}
                      {ss.toBeAttempted && ss.toBeAttempted !== need ? ` · attempt ${ss.toBeAttempted} of ${need}` : ""}
                      {ss.markingScheme ? ` · +${ss.markingScheme.correct?.[0] ?? 0} / ${ss.markingScheme.incorrect ?? 0}` : ""}
                    </span>
                  </span>
                </button>
                <span className={`badge ${have >= need && need ? "b-green" : "b-amber"}`}>
                  {have}/{need}
                </span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => onAdd(ss)}>
                  <Plus className="size-3.5" aria-hidden />
                  Add questions
                </button>
              </div>
              {isOpen && have > 0 && (
                <ol className="col border-t border-line-2">
                  {(ss.questions || []).map((q, qi) => (
                    <li key={q._id} className="row gap-3 px-3 py-2 hover:bg-ground">
                      <span className="mono xs muted w-6 shrink-0 text-right">{qi + 1}</span>
                      <button type="button" className="sm line-clamp-2 grow text-left" onClick={() => setPreview(q)} title="Preview question">
                        <MathText html text={questionText(q)} />
                      </button>
                      <span className="xs muted shrink-0 capitalize">{q.difficulty}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm danger-hover w-8 shrink-0 px-0"
                        aria-label={`Remove question ${qi + 1}`}
                        disabled={disabled}
                        onClick={() => onRemove(ss, q._id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
      <QuestionPreviewDialog open={!!preview} onClose={() => setPreview(null)} question={preview} />
    </article>
  );
}
