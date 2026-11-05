"use client";

/*
  The question editor (board: Admin-QuestionEditor), one component for /questions/new and /questions/[id]/edit
  (and /questions/new?from=<id> to duplicate). It replaces the two old pages:
  - one form state for every kind (objective single/multiple, numerical, paragraph, matrix), English + Hindi;
  - create and update send the same document the questions API stores: en/hi blocks with option ids,
    correctAnswers / correctAnswer, chapters with their topics, a paragraph as its passage HTML;
  - option ids are kept on edit, so tests and results that point at them stay valid.
  AI assist (M5, contract api-ai docs/m5-api.md): suggest tags (Apply fills the form), translate to Hindi and draft a
  solution (both stream), the key-agreement label, a failed translation's message, "Save first?" when the form has
  unsaved changes (AI reads the saved question), the daily limit, paragraph/matrix not supported, a link to waiting
  drafts, and the duplicate check. Apply / Accept only move a draft into the form; Save accepts each draft in the form
  (with the form's version of its fields when the teacher edited them), then sends the usual update for other changes.
*/
import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { z } from "zod";
import { MathText } from "@iitpulse/ui";
import { Topbar } from "@/components/admin/Topbar";
import { QuestionBody, MatrixGrid } from "@/components/question-body";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect, MultiSelectContent, MultiSelectItem, MultiSelectTrigger, MultiSelectValue } from "@/components/ui/multi-select";
import { MultiSelectCreatable, SingleSelectCreatable } from "@/components/ui/multi-select-creatable";
import { CreateTopicDrawer } from "@/components/create-topic-drawer";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth.store";
import { api } from "@/lib/api";
import {
  generateIntegerQuestion,
  generateMatrixQuestion,
  generateObjectiveQuestion,
  generateQuestionCore,
  parseZodErrors,
  questionIntegerSchema,
  questionMatrixSchema,
  questionObjectiveSchema,
  type FormErrors,
} from "@/lib/question-schemas";
import {
  fetchQuestion,
  kindFromParam,
  paragraphHtml,
  stripHtml,
  subjectName,
  useExamsList,
  useSources,
  useSubjects,
  type BankChild,
  type BankQuestion,
  type QuestionKind,
} from "@/lib/question-queries";
import type { ISubject } from "@/types";
import { AdminApiError, aiAdmin, apiError, editorKind, pollDraft, questionsAdmin, streamAssist } from "@/lib/ai-admin";
import type { AiDraft, DraftKind, DraftPayload, DuplicateCheckResponse, SolutionPayload, TagsPayload, TranslationPayload } from "@/lib/m5-contract";
import { AlertIcon, ClockIcon, CrossIcon, Note, Sparkle, TickIcon } from "@/components/questions-admin/parts";

import "react-quill-new/dist/quill.snow.css";

dayjs.extend(relativeTime);

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="skel h-[140px] rounded-none" />,
});

// Maths is typed as LaTeX between $…$ (rendered by KaTeX in the preview), so Quill's own formula blot is not offered.
const quillModules = {
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ script: "sub" }, { script: "super" }],
    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
    ["blockquote", "link", "image"],
    ["clean"],
  ],
  clipboard: { matchVisual: true },
};
const quillFormats = ["bold", "italic", "underline", "strike", "script", "list", "indent", "blockquote", "link", "image"];

type Lang = "en" | "hi";
type Mode = "single" | "multiple";

interface Opt {
  id: string;
  en: string;
  hi: string;
  correct: boolean;
}
interface Child {
  key: string;
  orig?: BankChild;
  type: "single" | "multiple" | "integer";
  en: { question: string; solution: string };
  hi: { question: string; solution: string };
  options: Opt[];
  from: string;
  to: string;
}
interface Form {
  kind: QuestionKind;
  mode: Mode;
  questionEn: string;
  questionHi: string;
  solutionEn: string;
  solutionHi: string;
  options: Opt[];
  answerFrom: string;
  answerTo: string;
  passage: string;
  children: Child[];
  matrix: boolean[][];
  subject: string; // subject name
  chapters: string[];
  topics: string[];
  exams: string[];
  sources: string[];
  difficulty: string;
  isProofRead: boolean;
}

const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
const blankOpts = (n = 4): Opt[] => Array.from({ length: n }, () => ({ id: uid("opt"), en: "", hi: "", correct: false }));
const grid = (r: number, c: number) => Array.from({ length: r }, () => Array<boolean>(c).fill(false));
const KEY = (i: number) => String.fromCharCode(65 + i);
const Spinner = () => (
  <svg className="spin shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
    <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
  </svg>
);

function emptyForm(kind: QuestionKind): Form {
  return {
    kind,
    mode: "single",
    questionEn: "",
    questionHi: "",
    solutionEn: "",
    solutionHi: "",
    options: blankOpts(),
    answerFrom: "",
    answerTo: "",
    passage: "",
    children: [],
    matrix: grid(4, 4),
    subject: "",
    chapters: [],
    topics: [],
    exams: [],
    sources: [],
    difficulty: "unset",
    isProofRead: false,
  };
}

/** "<p>42</p>" → "42": a lone paragraph of plain text is shown (and saved) as the plain text the editor types. */
function unwrapP(v: string): string {
  const m = /^\s*<p>([^<&]*)<\/p>\s*$/i.exec(v);
  return m ? m[1] : v;
}

function optsFrom(en: { id: string; value: string }[] | undefined, hi: { id: string; value: string }[] | undefined, correct: string[], fresh: boolean): Opt[] {
  return (en ?? []).map((o, i) => ({
    id: fresh ? uid("opt") : o.id,
    en: unwrapP(o.value ?? ""),
    hi: unwrapP((hi ?? []).find((h) => h.id === o.id)?.value ?? hi?.[i]?.value ?? ""),
    correct: correct.includes(o.id),
  }));
}

/** Loaded question → form. `copy` (duplicate) gives options and sub-questions new ids. */
function formFrom(q: BankQuestion, copy: boolean): Form {
  const f = emptyForm(q._kind);
  f.mode = q.type === "multiple" ? "multiple" : "single";
  f.questionEn = q.en?.question ?? "";
  f.questionHi = q.hi?.question ?? "";
  f.solutionEn = q.en?.solution ?? "";
  f.solutionHi = q.hi?.solution ?? "";
  f.subject = subjectName(q);
  f.chapters = (q.chapters ?? []).map((c) => c.name).filter(Boolean);
  f.topics = [...new Set((q.chapters ?? []).flatMap((c) => c.topics ?? []))];
  f.exams = q.exams ?? [];
  f.sources = q.sources ?? [];
  f.difficulty = (q.difficulty || "unset").toLowerCase();
  f.isProofRead = copy ? false : !!q.isProofRead;
  if (q._kind === "mcq") f.options = optsFrom(q.en?.options, q.hi?.options, q.correctAnswers ?? [], copy);
  if (q._kind === "numerical" && q.correctAnswer && !Array.isArray(q.correctAnswer)) {
    f.answerFrom = q.correctAnswer.from == null ? "" : String(q.correctAnswer.from);
    f.answerTo = q.correctAnswer.to == null ? "" : String(q.correctAnswer.to);
  }
  if (q._kind === "matrix" && Array.isArray(q.correctAnswer) && q.correctAnswer.length) f.matrix = q.correctAnswer.map((r) => [...r]);
  if (q._kind === "paragraph") {
    f.passage = paragraphHtml(q);
    f.children = (q.questions ?? []).map((c, i) => ({
      key: (!copy && (c._id || c.id)) || uid(`child${i}`),
      orig: copy ? undefined : c,
      type: c.type === "integer" ? "integer" : c.type === "multiple" ? "multiple" : "single",
      en: { question: c.en?.question ?? "", solution: c.en?.solution ?? "" },
      hi: { question: c.hi?.question ?? "", solution: c.hi?.solution ?? "" },
      options: optsFrom(c.en?.options, c.hi?.options, c.correctAnswers ?? [], copy),
      from: c.correctAnswer?.from == null ? "" : String(c.correctAnswer.from),
      to: c.correctAnswer?.to == null ? "" : String(c.correctAnswer.to),
    }));
  }
  return f;
}

/** Form → the BankQuestion shape the preview renders. */
function previewOf(f: Form): BankQuestion {
  const opt = (o: Opt[], lang: Lang) => o.map((x) => ({ id: x.id, value: lang === "en" ? x.en : x.hi }));
  return {
    _id: "preview",
    _kind: f.kind,
    type: f.kind === "mcq" ? f.mode : undefined,
    en: { question: f.questionEn, solution: f.solutionEn, options: opt(f.options, "en") },
    hi: { question: f.questionHi, solution: f.solutionHi, options: opt(f.options, "hi") },
    correctAnswers: f.options.filter((o) => o.correct).map((o) => o.id),
    correctAnswer: f.kind === "matrix" ? f.matrix : undefined,
    paragraph: f.passage,
    questions: f.children.map((c) => ({
      id: c.key,
      type: c.type,
      en: { question: c.en.question, options: opt(c.options, "en") },
      hi: { question: c.hi.question, options: opt(c.options, "hi") },
    })),
  };
}

/* ---------- AI drafts in the form ---------- */

/** A draft moved into the form, with the values it put there (to tell an edited version from the draft's own). */
interface Applied {
  draft: AiDraft;
  snap: { chapters?: string[]; topics?: string[]; difficulty?: string; questionHi?: string; optionsHi?: Record<string, string>; solutionHi?: string; solutionEn?: string };
}
type AppliedMap = Partial<Record<DraftKind, Applied>>;

const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** An AI solution (plain text with line breaks) as the editor's HTML: one paragraph per line. */
const solutionHtml = (t: string) =>
  t
    .split(/\n/)
    .map((l) => `<p>${l.trim() ? escHtml(l) : "<br>"}</p>`)
    .join("");

const sameList = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((x, i) => x === b[i]);

const LIMIT_TEXT: Record<DraftKind, (n: number) => string> = {
  tags: (n) => `Today's ${n.toLocaleString("en-IN")} tag suggestions are used up. Suggest again after midnight.`,
  translation: (n) => `Today's ${n.toLocaleString("en-IN")} Hindi translations are used up. Translate again after midnight.`,
  solution: (n) => `Today's ${n.toLocaleString("en-IN")} solution drafts are used up. Draft again after midnight.`,
};
const WAIT_NOUN: Record<DraftKind, string> = { tags: "tag suggestion", translation: "Hindi draft", solution: "solution draft" };

function RichField({ value, onChange, label, minH = 96 }: { value: string; onChange: (v: string) => void; label: string; minH?: number }) {
  return (
    <div
      className="overflow-hidden rounded-control border border-line bg-surface [&_.ql-container]:border-0 [&_.ql-container]:font-sans [&_.ql-container]:text-[14px] [&_.ql-editor]:leading-[1.6] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-line-2 [&_.ql-toolbar]:bg-[#FAFBFD]"
      style={{ ["--qmin" as string]: `${minH}px` }}
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={(v: string, _d: unknown, source: string) => {
          // Only edits by the person count: Quill re-normalises loaded HTML on mount (source "api").
          if (source === "user") onChange(v);
        }}
        modules={quillModules}
        formats={quillFormats}
        aria-label={label}
        className="[&_.ql-editor]:min-h-(--qmin)"
      />
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
  /** ?assist=tags|translation|solution: start that assist once the question is loaded (the bank's "Draft solution") */
  assist?: string | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuthStore();
  const subjectsQ = useSubjects();
  const examsQ = useExamsList();
  const sourcesQ = useSources();

  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [exams, setExams] = React.useState<{ name: string }[]>([]);
  const [sources, setSources] = React.useState<{ _id: string; name: string }[]>([]);
  React.useEffect(() => { if (subjectsQ.data) setSubjects(subjectsQ.data); }, [subjectsQ.data]);
  React.useEffect(() => { if (examsQ.data) setExams(examsQ.data); }, [examsQ.data]);
  React.useEffect(() => { if (sourcesQ.data) setSources(sourcesQ.data); }, [sourcesQ.data]);

  const initialKind = kindFromParam(typeParam) ?? "mcq";
  const [initial] = React.useState<Form>(() => emptyForm(initialKind));
  const [form, setForm] = React.useState<Form>(initial);
  const [saved, setSaved] = React.useState<string>(() => JSON.stringify(initial));
  const [loaded, setLoaded] = React.useState<BankQuestion | null>(null);
  const [loading, setLoading] = React.useState(mode === "edit" || !!fromId);
  const [notFound, setNotFound] = React.useState(false);
  const [lang, setLang] = React.useState<Lang>("en");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);
  const [topicDrawer, setTopicDrawer] = React.useState(false);

  // AI assist
  const [applied, setApplied] = React.useState<AppliedMap>({});
  const [running, setRunning] = React.useState<DraftKind | null>(null);
  const [hiStream, setHiStream] = React.useState<string | null>(null);
  const [hiFailed, setHiFailed] = React.useState<AiDraft | null>(null);
  const [sol, setSol] = React.useState<{ draft: AiDraft | null; text: string; state: "streaming" | "ready" | "accepted" } | null>(null);
  const [tagsDraft, setTagsDraft] = React.useState<AiDraft | null>(null);
  const [aiFailed, setAiFailed] = React.useState<{ kind: DraftKind; title: string; message: string } | null>(null);
  const [askSave, setAskSave] = React.useState<DraftKind | null>(null);
  const [limits, setLimits] = React.useState<Partial<Record<DraftKind, number>>>({});
  const [unsupportedByApi, setUnsupportedByApi] = React.useState(false);
  const [waiting, setWaiting] = React.useState<AiDraft[]>([]);
  const [dups, setDups] = React.useState<DuplicateCheckResponse["results"][number]["matches"] | null>(null);
  const [dupBusy, setDupBusy] = React.useState(false);
  const assistAbort = React.useRef<AbortController | null>(null);
  const autoAssisted = React.useRef(false);
  React.useEffect(() => () => assistAbort.current?.abort(), []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = !loading && JSON.stringify(form) !== saved;
  const { showDialog, confirmNavigation, cancelNavigation, navigateWithCheck } = useUnsavedChanges({ isDirty: dirty && !saving });

  // Load the question (edit) or the one being duplicated (create ?from=)
  const sourceId = mode === "edit" ? id : fromId;
  React.useEffect(() => {
    if (!sourceId) return;
    let live = true;
    (async () => {
      const q = await fetchQuestion(sourceId, kindFromParam(typeParam));
      if (!live) return;
      if (!q) {
        setNotFound(true);
      } else {
        const f = formFrom(q, mode === "create");
        setForm(f);
        setLoaded(q);
        // A duplicate starts dirty: it is a new question until saved.
        setSaved(mode === "edit" ? JSON.stringify(f) : JSON.stringify(emptyForm(q._kind)));
        setSavedAt(q.modifiedAt ?? null);
      }
      setLoading(false);
    })();
    return () => { live = false; };
  }, [sourceId, typeParam, mode]);

  // Drafts already waiting for this question (a bulk run, or an assist the teacher left)
  React.useEffect(() => {
    if (mode !== "edit" || !id) return;
    let live = true;
    aiAdmin
      .drafts({ questionId: id, status: "ready" })
      .then((r) => {
        if (live) setWaiting(r.items);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [mode, id]);

  // Chapters and topics of the chosen subject
  const subjectData = subjects.find((s) => s.name.toLowerCase() === form.subject.toLowerCase()) ?? null;
  const chapterList = React.useMemo(() => {
    const list = [...(subjectData?.chapters ?? [])].filter((c) => c.name);
    for (const name of form.chapters) if (!list.some((c) => c.name === name)) list.push({ _id: name, name, topics: [] });
    return list;
  }, [subjectData, form.chapters]);
  const topicOptions = React.useMemo(() => {
    const t = new Set<string>();
    for (const name of form.chapters) for (const x of chapterList.find((c) => c.name === name)?.topics ?? []) t.add(x);
    for (const c of loaded?.chapters ?? []) if (form.chapters.includes(c.name)) for (const x of c.topics ?? []) t.add(x);
    for (const x of form.topics) t.add(x);
    return [...t];
  }, [form.chapters, form.topics, chapterList, loaded]);

  /* ---------- creatable metadata ---------- */
  const addSubject = async (name: string) => {
    const res = await api.subjects.create({ name });
    const s = (res.data?.data || res.data) as ISubject;
    setSubjects((p) => [...p, s]);
    setForm((f) => ({ ...f, subject: s.name, chapters: [], topics: [] }));
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };
  const addChapter = async (name: string) => {
    if (!subjectData?._id) return;
    const res = await api.subjects.createChapter({ subjectId: subjectData._id, name });
    const s = (res.data?.data || res.data) as ISubject;
    setSubjects((p) => p.map((x) => (x._id === s._id ? s : x)));
    const last = s.chapters?.[s.chapters.length - 1];
    if (last) setForm((f) => ({ ...f, chapters: [...f.chapters, last.name] }));
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };
  const addTopic = async (data: { chapter: string; topic: string }) => {
    const ch = chapterList.find((c) => c.name === data.chapter);
    const chapterId = ch?.id || ch?._id;
    if (!subjectData?._id || !chapterId) return;
    const res = await api.subjects.createTopic({ subjectId: subjectData._id, chapterId, topic: data.topic });
    const s = (res.data?.data || res.data) as ISubject;
    setSubjects((p) => p.map((x) => (x._id === s._id ? s : x)));
    setForm((f) => ({ ...f, topics: [...f.topics, data.topic] }));
    setTopicDrawer(false);
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };
  const addExam = async (name: string) => {
    const res = await api.exams.create({ name, fullName: name });
    const e = (res.data?.data || res.data) as { name: string };
    setExams((p) => [...p, e]);
    setForm((f) => ({ ...f, exams: [...f.exams, e.name] }));
  };
  const addSource = async (name: string) => {
    const res = await api.sources.create({ name });
    const s = (res.data?.data || res.data) as { _id: string; name: string };
    setSources((p) => [...p, s]);
    setForm((f) => ({ ...f, sources: [...f.sources, s.name] }));
  };

  /* ---------- options ---------- */
  const setOpt = (oid: string, patch: Partial<Opt>) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o) => {
        if (patch.correct !== undefined && f.mode === "single" && f.kind === "mcq") {
          return o.id === oid ? { ...o, correct: true } : { ...o, correct: false };
        }
        return o.id === oid ? { ...o, ...patch } : o;
      }),
    }));
  const setMode = (m: Mode) =>
    setForm((f) => {
      if (m === "single") {
        let seen = false;
        return { ...f, mode: m, options: f.options.map((o) => (o.correct && !seen ? ((seen = true), o) : { ...o, correct: false })) };
      }
      return { ...f, mode: m };
    });

  /* ---------- paragraph sub-questions ---------- */
  const setChild = (key: string, fn: (c: Child) => Child) => setForm((f) => ({ ...f, children: f.children.map((c) => (c.key === key ? fn(c) : c)) }));
  const addChild = (type: Child["type"]) =>
    setForm((f) => ({
      ...f,
      children: [
        ...f.children,
        { key: uid("q"), type, en: { question: "", solution: "" }, hi: { question: "", solution: "" }, options: type === "integer" ? [] : blankOpts(), from: "", to: "" },
      ],
    }));

  /* ---------- save ---------- */
  const errorList = (e: FormErrors): string[] =>
    Object.entries(e).flatMap(([, v]) => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v as Record<string, string>) : []));

  const save = async (opts: { assistAfter?: DraftKind } = {}): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: "Not signed in", description: "Sign in again to save questions.", variant: "destructive" });
      return false;
    }
    const f = form;
    const errs: FormErrors = {};
    if (!f.subject) errs.subject = "Choose a subject";
    if (!f.chapters.length) errs.chapters = "Choose at least one chapter";
    if (f.difficulty === "unset") errs.difficulty = "Choose a difficulty";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return false;
    }

    const chapters = f.chapters.map((name) => {
      const known = new Set([
        ...(chapterList.find((c) => c.name === name)?.topics ?? []),
        ...((loaded?.chapters ?? []).find((c) => c.name === name)?.topics ?? []),
      ]);
      return { name, topics: f.topics.filter((t) => known.has(t)) };
    });
    const objectiveType: Mode = f.mode;
    const core = generateQuestionCore(
      {
        type: f.kind === "mcq" ? objectiveType : f.kind === "numerical" ? "integer" : f.kind,
        subject: f.subject,
        chapters,
        topics: f.topics,
        difficulty: f.difficulty,
        exams: f.exams,
        sources: f.sources,
        isProofRead: f.isProofRead,
      },
      { userType: currentUser.userType as "operator" | "teacher" | "admin", id: currentUser.id }
    );
    if (loaded && mode === "edit") core.id = loaded._id;

    let doc: Record<string, unknown>;
    try {
      if (f.kind === "mcq") {
        doc = generateObjectiveQuestion(core, {
          en: { question: f.questionEn, solution: f.solutionEn, options: f.options.map((o) => ({ id: o.id, value: o.en, isCorrectAnswer: o.correct })) },
          hi: { question: f.questionHi, solution: f.solutionHi, options: f.options.map((o) => ({ id: o.id, value: o.hi })) },
          type: objectiveType,
        });
        questionObjectiveSchema.parse(doc);
      } else if (f.kind === "numerical") {
        const from = parseFloat(f.answerFrom);
        const to = f.answerTo.trim() === "" ? from : parseFloat(f.answerTo);
        if (Number.isNaN(from) || Number.isNaN(to)) {
          setErrors({ correctAnswer: "Enter the answer (From, and To for a range)" });
          return false;
        }
        doc = generateIntegerQuestion(core, {
          en: { question: f.questionEn, solution: f.solutionEn },
          hi: { question: f.questionHi, solution: f.solutionHi },
          correctAnswer: { from, to },
        });
        questionIntegerSchema.parse(doc);
      } else if (f.kind === "matrix") {
        doc = generateMatrixQuestion(core, {
          en: { question: f.questionEn, options: [], solution: f.solutionEn },
          hi: { question: f.questionHi, options: [], solution: f.solutionHi },
          correctAnswer: f.matrix,
        });
        questionMatrixSchema.parse(doc);
      } else {
        // The questions API stores a paragraph's passage as one HTML string (as the existing bank does).
        const pe: FormErrors = {};
        if (!stripHtml(f.passage) && !/<img/i.test(f.passage)) pe.paragraph = "Write the passage";
        if (!f.children.length) pe.questions = "Add at least one question to the passage";
        f.children.forEach((c, i) => {
          if (!stripHtml(c.en.question)) pe[`q${i}`] = `Question ${i + 1} needs its English text`;
          if (c.type !== "integer" && !c.options.some((o) => o.correct)) pe[`a${i}`] = `Question ${i + 1} needs a correct option`;
        });
        if (Object.keys(pe).length) {
          setErrors(pe);
          return false;
        }
        doc = {
          ...core,
          type: "paragraph",
          paragraph: f.passage,
          questions: f.children.map((c) => {
            const { _id, ...rest } = c.orig ?? {};
            const base = c.orig ? { ...rest, ...(_id ? { _id } : {}) } : { id: c.key };
            const ans =
              c.type === "integer"
                ? { correctAnswer: { from: parseFloat(c.from) || 0, to: parseFloat(c.to) || parseFloat(c.from) || 0 } }
                : { correctAnswers: c.options.filter((o) => o.correct).map((o) => o.id) };
            return {
              ...base,
              type: c.type,
              en: { ...c.en, ...(c.type === "integer" ? {} : { options: c.options.map((o) => ({ id: o.id, value: o.en })) }) },
              hi: { ...c.hi, ...(c.type === "integer" ? {} : { options: c.options.map((o) => ({ id: o.id, value: o.hi })) }) },
              ...ans,
            };
          }),
        };
      }
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(parseZodErrors(e));
        return false;
      }
      throw e;
    }

    setErrors({});
    setSaving(true);
    try {
      if (mode === "edit" && loaded) {
        // AI drafts in the form first: accept writes their fields (and the audit row) through questions
        const kinds = Object.keys(applied) as DraftKind[];
        for (const k of kinds) {
          const a = applied[k]!;
          const payload = editedPayload(k, a, f);
          try {
            await aiAdmin.accept(a.draft.id, payload ? { payload } : {});
          } catch (e) {
            const err = apiError(e);
            if (err.code === "DRAFT_ALREADY_DECIDED") continue;
            toast({
              title: "Could not save the AI draft",
              description:
                err.code === "DRAFT_STALE"
                  ? "Someone changed this question after the draft was made. Reload the page to see the latest version."
                  : err.code === "DRAFT_CHECK_FAILED"
                    ? ((err.details?.checks as { problems?: string[] } | undefined)?.problems?.join(" ") ?? err.message)
                    : err.message,
              variant: "destructive",
            });
            return false;
          }
        }
        if (!kinds.length || otherChanges(kinds, f)) await api.questions.update(loaded._kind, loaded._id, doc);
        setApplied({});
        setSol((x) => (x?.state === "accepted" ? null : x));
        setWaiting((w) => w.filter((d) => !kinds.some((k) => applied[k]?.draft.id === d.id)));
        setSaved(JSON.stringify(f));
        setSavedAt(new Date().toISOString());
        toast({ title: "Question saved" });
      } else {
        const res = await api.questions.create(f.kind, doc);
        setSaved(JSON.stringify(f));
        toast({ title: "Question created", description: "The question was added to the bank." });
        const created = (res.data as { data?: { _id?: string; id?: string } })?.data;
        const newId = created?._id || created?.id;
        if (opts.assistAfter && newId) router.push(`/questions/${newId}/edit?type=${f.kind}&assist=${opts.assistAfter}`);
        else router.push("/questions");
      }
      qc.invalidateQueries({ queryKey: ["questions"] });
      return true;
    } catch (error: unknown) {
      const ax = error as { response?: { data?: { message?: string; error?: { message?: string } } } };
      toast({
        title: mode === "edit" ? "Could not save the question" : "Could not create the question",
        description: ax?.response?.data?.message || ax?.response?.data?.error?.message || (error instanceof Error ? error.message : "Please try again."),
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    // Drafts the form had taken in are discarded too (the API marks them; nothing in the bank changes)
    for (const a of Object.values(applied)) if (a) aiAdmin.discard(a.draft.id).catch(() => {});
    if (sol?.draft && sol.state !== "accepted" && !applied.solution) aiAdmin.discard(sol.draft.id).catch(() => {});
    setApplied({});
    setSol(null);
    setTagsDraft(null);
    setHiFailed(null);
    setForm(JSON.parse(saved) as Form);
    setErrors({});
  };

  /* ---------- AI assist ---------- */

  /** The form's version of a draft's fields when the teacher changed what the draft put in; null = the draft as is. */
  function editedPayload(kind: DraftKind, a: Applied, f: Form): DraftPayload | null {
    const s = a.snap;
    if (kind === "tags") {
      if (sameList(f.chapters, s.chapters) && sameList(f.topics, s.topics) && f.difficulty === s.difficulty) return null;
      const p = a.draft.payload as TagsPayload;
      const chapters = f.chapters
        .map((name) => {
          const c = chapterList.find((x) => x.name === name) as { id?: string; _id?: string; name: string } | undefined;
          const known = p.chapters.find((x) => x.name === name);
          return { id: known?.id || c?.id || c?._id || "", name };
        })
        .filter((c) => c.id);
      const topics = p.topics.filter((t) => f.topics.includes(t.name) && chapters.some((c) => c.id === t.chapterId));
      return { subject: null, chapters, topics, difficulty: (f.difficulty === "unset" ? p.difficulty : f.difficulty) as TagsPayload["difficulty"] };
    }
    if (kind === "translation") {
      const optsSame = f.options.every((o) => s.optionsHi?.[o.id] === undefined || s.optionsHi[o.id] === o.hi);
      if (f.questionHi === s.questionHi && optsSame && (s.solutionHi === undefined || f.solutionHi === s.solutionHi)) return null;
      const p = (a.draft.payload as TranslationPayload).hi;
      return {
        hi: {
          question: f.questionHi,
          ...(p.options ? { options: f.options.map((o) => ({ id: o.id, value: o.hi })) } : {}),
          ...(p.solution !== undefined ? { solution: f.solutionHi } : {}),
        },
      };
    }
    if (f.solutionEn === s.solutionEn) return null;
    return { solution: f.solutionEn, statedAnswer: (a.draft.payload as SolutionPayload).statedAnswer };
  }

  /** Whether the form changes anything besides the fields of the drafts it holds (then the usual update runs too). */
  function otherChanges(kinds: DraftKind[], f: Form): boolean {
    const base = JSON.parse(saved) as Form;
    const merged: Form = { ...base };
    if (kinds.includes("tags")) Object.assign(merged, { chapters: f.chapters, topics: f.topics, difficulty: f.difficulty });
    if (kinds.includes("translation"))
      Object.assign(merged, { questionHi: f.questionHi, solutionHi: f.solutionHi, options: base.options.map((o) => ({ ...o, hi: f.options.find((x) => x.id === o.id)?.hi ?? o.hi })) });
    if (kinds.includes("solution")) merged.solutionEn = f.solutionEn;
    return JSON.stringify(merged) !== JSON.stringify(f);
  }

  const applyTranslation = (d: AiDraft) => {
    const hi = (d.payload as TranslationPayload).hi;
    const optionsHi: Record<string, string> = {};
    for (const o of hi.options ?? []) optionsHi[o.id] = unwrapP(o.value ?? "");
    setForm((f) => ({
      ...f,
      questionHi: hi.question,
      options: f.options.map((o) => (optionsHi[o.id] === undefined ? o : { ...o, hi: optionsHi[o.id] })),
      solutionHi: hi.solution ?? f.solutionHi,
    }));
    setApplied((m) => ({ ...m, translation: { draft: d, snap: { questionHi: hi.question, optionsHi, ...(hi.solution !== undefined ? { solutionHi: hi.solution } : {}) } } }));
  };

  const applyTags = () => {
    if (!tagsDraft) return;
    const p = tagsDraft.payload as TagsPayload;
    const snap = { chapters: p.chapters.map((c) => c.name), topics: p.topics.map((t) => t.name), difficulty: p.difficulty };
    setForm((f) => ({ ...f, ...snap }));
    setApplied((m) => ({ ...m, tags: { draft: tagsDraft, snap } }));
    setTagsDraft(null);
  };

  const acceptSolution = () => {
    if (!sol?.draft) return;
    const html = solutionHtml((sol.draft.payload as SolutionPayload).solution);
    setForm((f) => ({ ...f, solutionEn: html }));
    setApplied((m) => ({ ...m, solution: { draft: sol.draft!, snap: { solutionEn: html } } }));
    setSol({ ...sol, state: "accepted" });
    setLang("en");
  };

  const discardSolution = () => {
    if (sol?.draft) aiAdmin.discard(sol.draft.id).catch(() => {});
    setSol(null);
  };

  const finishDraft = (kind: DraftKind, d: AiDraft) => {
    setWaiting((w) => w.filter((x) => !(x.kind === kind && x.status === "ready")));
    if (d.status !== "ready") {
      const message = d.error?.message || "The AI could not make this draft. Try again.";
      if (kind === "translation") {
        setHiStream(null);
        setHiFailed(d);
      } else {
        if (kind === "solution") setSol(null);
        setAiFailed({
          kind,
          title: kind === "tags" ? (d.error?.code === "NO_VALID_TAGS" ? "No tags suggested from your chapter list" : "Couldn't suggest tags") : "Couldn't draft a solution",
          message,
        });
      }
      return;
    }
    if (kind === "translation") {
      setHiStream(null);
      applyTranslation(d);
    } else if (kind === "solution") setSol({ draft: d, text: (d.payload as SolutionPayload).solution, state: "ready" });
    else setTagsDraft(d);
  };

  const runAssist = async (kind: DraftKind, opts: { saved?: boolean } = {}) => {
    if (mode !== "edit" || !loaded || (dirty && !opts.saved)) {
      setAskSave(kind);
      return;
    }
    setAskSave(null);
    setAiFailed(null);
    if (kind === "translation") {
      setHiFailed(null);
      setHiStream("");
      setLang("hi");
    }
    if (kind === "solution") {
      setSol({ draft: null, text: "", state: "streaming" });
      setLang("en");
    }
    if (kind === "tags") setTagsDraft(null);
    setRunning(kind);
    assistAbort.current?.abort();
    const ac = new AbortController();
    assistAbort.current = ac;
    const got: { start?: AiDraft; done?: AiDraft } = {};
    try {
      await streamAssist(
        loaded._id,
        kind,
        (e) => {
          if (e.event === "start") got.start = e.data.draft;
          else if (e.event === "delta") {
            const text = e.data.text;
            if (e.data.part === "stem" && kind === "translation") setHiStream((x) => (x ?? "") + text);
            if (e.data.part === "solution" && kind === "solution") setSol((x) => (x ? { ...x, text: x.text + text } : x));
          } else if (e.event === "done") got.done = e.data.draft;
        },
        ac.signal
      );
      if (!got.done && got.start) got.done = await pollDraft(got.start.id, ac.signal);
      if (!got.done) throw new AdminApiError(0, "AI_UNAVAILABLE", "The AI did not answer. Try again in a minute.");
      finishDraft(kind, got.done);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const err = apiError(e);
      if (kind === "translation") setHiStream(null);
      if (kind === "solution") setSol(null);
      if (err.code === "UNSUPPORTED_TYPE") setUnsupportedByApi(true);
      else if (err.code === "ADMIN_AI_DAILY_LIMIT") setLimits((l) => ({ ...l, [kind]: Number(err.details?.perDay ?? 0) }));
      else
        toast({
          title: "AI assist is not available",
          description:
            err.code === "AI_RATE_LIMITED"
              ? `Too many AI requests this hour. Try again in ${Math.max(1, Math.ceil(Number(err.details?.retryAfterSeconds ?? 60) / 60))} min.`
              : err.code === "AI_PAUSED"
                ? "AI is switched off for now. Try again later."
                : err.message,
          variant: "destructive",
        });
    } finally {
      setRunning((r) => (r === kind ? null : r));
    }
  };

  const saveAndDraft = async () => {
    const kind = askSave;
    if (!kind) return;
    setAskSave(null);
    const ok = await save({ assistAfter: kind });
    if (ok && mode === "edit") runAssist(kind, { saved: true });
  };

  const checkDuplicates = async () => {
    const text = form.kind === "paragraph" ? form.passage : form.questionEn;
    setDupBusy(true);
    try {
      const r = await questionsAdmin.duplicates({
        items: [{ key: "q", text, ...(mode === "edit" && loaded ? { excludeId: loaded._id } : {}), ...(subjectData?._id ? { subjectId: subjectData._id } : {}) }],
      });
      setDups(r.results[0]?.matches ?? []);
    } catch (e) {
      toast({ title: "Could not check for duplicates", description: apiError(e).message, variant: "destructive" });
    } finally {
      setDupBusy(false);
    }
  };

  // The bank's "Draft solution" opens the editor with ?assist=solution
  React.useEffect(() => {
    if (autoAssisted.current || loading || !loaded || mode !== "edit") return;
    if (assist !== "tags" && assist !== "translation" && assist !== "solution") return;
    autoAssisted.current = true;
    runAssist(assist, { saved: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assist, loading, loaded, mode]);

  const errs = errorList(errors);
  const kindLocked = mode === "edit";
  const segTypes: { label: string; kind: QuestionKind; mode?: Mode }[] = [
    { label: "Single", kind: "mcq", mode: "single" },
    { label: "Multiple", kind: "mcq", mode: "multiple" },
    { label: "Numerical", kind: "numerical" },
    { label: "Paragraph", kind: "paragraph" },
    { label: "Matrix", kind: "matrix" },
  ];
  const q = (l: Lang) => (l === "en" ? form.questionEn : form.questionHi);
  const s = (l: Lang) => (l === "en" ? form.solutionEn : form.solutionHi);

  /* ---------- AI assist: derived ---------- */
  const aiUnsupported = form.kind === "paragraph" || form.kind === "matrix" || unsupportedByApi;
  const offAll = aiUnsupported || !!askSave || !!running || loading;
  const keyLabel = () =>
    form.kind === "mcq"
      ? form.options.map((o, i) => (o.correct ? KEY(i) : null)).filter(Boolean).join(", ")
      : form.kind === "numerical"
        ? form.answerTo && form.answerTo !== form.answerFrom
          ? `${form.answerFrom} to ${form.answerTo}`
          : form.answerFrom
        : "";
  const statedLabel = (p: SolutionPayload) =>
    p.statedAnswer?.optionIds?.length
      ? p.statedAnswer.optionIds.map((oid) => {
          const i = form.options.findIndex((o) => o.id === oid);
          return i >= 0 ? KEY(i) : oid;
        }).join(", ")
      : p.statedAnswer?.value !== undefined
        ? String(p.statedAnswer.value)
        : "";

  const waitingNote = (() => {
    const w = waiting.filter((d) => d.status === "ready" && d.kind !== running && !applied[d.kind] && !(d.kind === "tags" && tagsDraft) && !(d.kind === "solution" && sol));
    if (!w.length) return null;
    const d = w[0];
    const when = d.jobId ? (dayjs(d.createdAt).isSame(dayjs(), "day") ? " from today's bulk run" : ` from the bulk run on ${dayjs(d.createdAt).format("D MMM")}`) : "";
    return (
      <Note>
        <ClockIcon color="#00007E" />
        <span className="sm grow">{w.length === 1 ? `A ${WAIT_NOUN[d.kind]}${when} is waiting.` : `${w.length} AI drafts for this question are waiting.`}</span>
        <Link href={`/questions/drafts?questionId=${encodeURIComponent(id ?? "")}`} className="btn btn-ghost btn-sm">
          Review
        </Link>
      </Note>
    );
  })();

  const tagBadges = (() => {
    if (!tagsDraft) return null;
    const p = tagsDraft.payload as TagsPayload;
    const ch = p.chapters.map((c) => c.name);
    const tp = p.topics.map((t) => t.name);
    const chDiff = !sameList(ch, form.chapters);
    const tpDiff = !sameList(tp, form.topics);
    const dfDiff = p.difficulty !== form.difficulty;
    const none = !chDiff && !tpDiff && !dfDiff;
    const lvCls = { easy: "b-green", medium: "b-amber", hard: "b-live" }[p.difficulty] ?? "b-grey";
    const cap = p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1);
    return (
      <div className="row wrap gap-1.5">
        {(chDiff || none) && ch.length > 0 && <span className="badge b-navy pop max-w-full truncate">Chapter: {ch.join(", ")}</span>}
        {(tpDiff || none) && tp.length > 0 && <span className="badge b-navy pop max-w-full truncate">Topic: {tp.join(", ")}</span>}
        {(dfDiff || none) && <span className={`badge ${lvCls} pop`}>{cap}{dfDiff ? "?" : ""}</span>}
        <button type="button" className="btn btn-primary btn-sm pop" onClick={applyTags}>
          Apply
        </button>
      </div>
    );
  })();

  if (notFound) {
    return (
      <>
        <Topbar title="Edit question" back={{ href: "/questions", label: "Bank" }} />
        <main className="col items-center gap-2 px-7 py-16 text-center">
          <span className="h3">Question not found</span>
          <span className="sm muted">It may have been deleted. Go back to the bank to pick another one.</span>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="topbar row between h-16 shrink-0 gap-3 px-7">
        <div className="row min-w-0 gap-2.5">
          <a
            href="/questions"
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.preventDefault();
              navigateWithCheck("/questions");
            }}
          >
            ← Bank
          </a>
          <h1 className="h3 shrink-0">{mode === "edit" ? "Edit question" : "New question"}</h1>
          {mode === "edit" && loaded && <span className="mono xs muted hidden truncate xl:inline">{loaded._id}</span>}
          {mode === "create" && fromId && <span className="xs muted hidden truncate xl:inline">Copy of {fromId}</span>}
          {dirty ? (
            <span className="badge b-amber pop shrink-0">Unsaved changes</span>
          ) : (
            mode === "edit" && savedAt && <span className="xs muted hidden whitespace-nowrap lg:inline">Saved {dayjs(savedAt).fromNow()}</span>
          )}
        </div>
        <div className="row shrink-0 gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={discard} disabled={(!dirty && !sol) || saving}>
            Discard
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => save()} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <main className="flex flex-wrap items-start gap-[18px] px-7 pt-5 pb-10">
        <div className="col min-w-0 gap-3.5" style={{ flex: "999 1 520px" }}>
          {errs.length > 0 && (
            <div className="row items-start gap-2.5 rounded-control border border-[#F2B1B1] bg-danger-50 p-3 text-danger" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="col gap-1">
                <span className="sm font-semibold">Fix these before saving</span>
                <ul className="sm m-0 list-disc pl-4">
                  {errs.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {loading ? (
            <div className="col gap-3">
              <div className="skel h-[320px] rounded-xl" />
              <div className="skel h-[120px] rounded-xl" />
            </div>
          ) : (
            <>
              <section className="card pad-lg col gap-3.5">
                <div className="row between wrap gap-2.5">
                  <div className="seg" role="radiogroup" aria-label="Question type">
                    {segTypes.map((t) => {
                      const on = form.kind === t.kind && (!t.mode || form.mode === t.mode);
                      const locked = kindLocked && t.kind !== form.kind;
                      return (
                        <button
                          key={t.label}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          className={`tab ${on ? "on" : ""} disabled:cursor-not-allowed disabled:opacity-50`}
                          disabled={locked}
                          title={locked ? "A question's type can't change after it is created" : undefined}
                          onClick={() => {
                            if (t.kind !== form.kind) set("kind", t.kind);
                            if (t.mode) setMode(t.mode);
                          }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="seg" role="radiogroup" aria-label="Language">
                    <button type="button" role="radio" aria-checked={lang === "en"} className={`tab ${lang === "en" ? "on" : ""}`} onClick={() => setLang("en")}>
                      English
                    </button>
                    <button type="button" role="radio" aria-checked={lang === "hi"} className={`tab ${lang === "hi" ? "on" : ""}`} onClick={() => setLang("hi")}>
                      हिन्दी
                    </button>
                  </div>
                </div>

                {form.kind === "paragraph" && (
                  <div className="field">
                    <span className="label">Passage · LaTeX between $…$ {lang === "hi" && <span className="xs muted font-normal">(one passage for both languages)</span>}</span>
                    <RichField label="Passage" value={form.passage} onChange={(v) => set("passage", v)} minH={150} />
                  </div>
                )}

                {form.kind !== "paragraph" && (
                  <div className="field">
                    <span className="label">
                      Question · LaTeX between $…$
                      {lang === "hi" && <span className="xs muted font-normal"> · Hindi</span>}
                    </span>
                    {lang === "en" ? (
                      <RichField key="q-en" label="Question" value={form.questionEn} onChange={(v) => set("questionEn", v)} />
                    ) : hiStream !== null ? (
                      <div className="fade min-h-[96px] rounded-control border border-line bg-surface px-3.5 py-3 text-[14px] leading-[1.6]" aria-live="polite" aria-busy="true">
                        {hiStream ? <MathText html as="span" className="[&_p]:inline" text={hiStream} /> : <span className="muted">Translating…</span>}
                        <span className="caret" />
                      </div>
                    ) : (
                      <RichField key="q-hi" label="Question in Hindi" value={form.questionHi} onChange={(v) => set("questionHi", v)} />
                    )}
                    {lang === "hi" && hiFailed && (
                      <Note tone="err" className="pop" role="alert">
                        <CrossIcon />
                        <span className="col grow gap-1">
                          <span className="sm font-semibold">
                            {(hiFailed.checks.missingMath?.length || hiFailed.checks.extraMath?.length || hiFailed.checks.latexIntact === false)
                              ? "Translation not used: an equation came back changed"
                              : "Translation not used"}
                          </span>
                          {hiFailed.checks.missingMath?.length ? (
                            <span className="sm">
                              Missing from the Hindi:{" "}
                              {hiFailed.checks.missingMath.map((m, i) => (
                                <MathText key={i} text={m} className="mx-0.5 font-serif text-[15px]" />
                              ))}
                              . Try again, or type the Hindi yourself.
                            </span>
                          ) : (
                            <span className="sm">
                              {(hiFailed.checks.problems?.length ? hiFailed.checks.problems.join(" ") : hiFailed.error?.message) || "The Hindi did not pass the checks."} Try again, or type the Hindi yourself.
                            </span>
                          )}
                        </span>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => runAssist("translation")} disabled={!!running}>
                          Try again
                        </button>
                      </Note>
                    )}
                  </div>
                )}

                {form.kind === "mcq" && (
                  <div className="col gap-2">
                    <span className="label">
                      Options · {form.mode === "single" ? "pick the correct one" : "pick every correct one"}
                      {lang === "hi" && <span className="xs muted font-normal"> · Hindi text</span>}
                    </span>
                    {form.options.map((o, i) => (
                      <div key={o.id} className={`opt items-start px-3 py-2 [&>.key]:mt-1.5 [&>input:first-child]:mt-2.5 ${o.correct ? "correct" : ""}`}>
                        <input
                          type={form.mode === "single" ? "radio" : "checkbox"}
                          name="correct-option"
                          data-correct-toggle=""
                          className={form.mode === "single" ? "size-[18px] accent-[var(--green)]" : "check size-[18px]"}
                          checked={o.correct}
                          aria-label={`Option ${KEY(i)} is correct`}
                          onChange={(e) => setOpt(o.id, { correct: form.mode === "single" ? true : e.target.checked })}
                        />
                        <span className="key">{KEY(i)}</span>
                        <div className="col min-w-0 grow gap-1">
                          <Input
                            placeholder={`Option ${KEY(i)}`}
                            value={lang === "en" ? o.en : o.hi}
                            onChange={(e) => setOpt(o.id, lang === "en" ? { en: e.target.value } : { hi: e.target.value })}
                            className="font-mono text-[13px]"
                          />
                          {/\$|\\\(|\\\[|<img/.test(lang === "en" ? o.en : o.hi) && (
                            <MathText html as="div" className={`rounded-md px-2 py-1 ${o.correct ? "bg-surface" : "bg-ground"} font-serif text-[15px] [&_img]:max-w-full [&_p]:m-0`} text={lang === "en" ? o.en : o.hi} />
                          )}
                        </div>
                        {o.correct && <span className="badge b-green mt-1.5">Correct</span>}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon danger-hover mt-0.5 w-8 shrink-0"
                          aria-label={`Remove option ${KEY(i)}`}
                          disabled={form.options.length <= 2}
                          onClick={() => set("options", form.options.filter((x) => x.id !== o.id))}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary btn-sm self-start" onClick={() => set("options", [...form.options, ...blankOpts(1)])}>
                      <Plus className="size-4" aria-hidden />
                      Add option
                    </button>
                  </div>
                )}

                {form.kind === "numerical" && (
                  <div className="col gap-2">
                    <span className="label">Answer · a single value, or a range From–To</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="field">
                        <label className="xs muted" htmlFor="ans-from">
                          From
                        </label>
                        <Input id="ans-from" type="number" step="any" value={form.answerFrom} onChange={(e) => set("answerFrom", e.target.value)} placeholder="e.g. 4" />
                      </div>
                      <div className="field">
                        <label className="xs muted" htmlFor="ans-to">
                          To
                        </label>
                        <Input id="ans-to" type="number" step="any" value={form.answerTo} onChange={(e) => set("answerTo", e.target.value)} placeholder="same as From" />
                      </div>
                    </div>
                  </div>
                )}

                {form.kind === "matrix" && (
                  <div className="col gap-2">
                    <span className="label">Matches · rows A, B, C… against columns P, Q, R…</span>
                    <div className="row gap-3">
                      <label className="row xs muted gap-1.5">
                        Rows
                        <Input type="number" min={2} max={6} className="w-16" value={form.matrix.length}
                          onChange={(e) => {
                            const r = Math.min(6, Math.max(2, parseInt(e.target.value) || 2));
                            const c = form.matrix[0]?.length ?? 4;
                            set("matrix", Array.from({ length: r }, (_, i) => form.matrix[i] ?? Array<boolean>(c).fill(false)));
                          }}
                        />
                      </label>
                      <label className="row xs muted gap-1.5">
                        Columns
                        <Input type="number" min={2} max={6} className="w-16" value={form.matrix[0]?.length ?? 4}
                          onChange={(e) => {
                            const c = Math.min(6, Math.max(2, parseInt(e.target.value) || 2));
                            set("matrix", form.matrix.map((row) => Array.from({ length: c }, (_, j) => row[j] ?? false)));
                          }}
                        />
                      </label>
                    </div>
                    <MatrixGrid
                      matrix={form.matrix}
                      onToggle={(r, c) => set("matrix", form.matrix.map((row, i) => row.map((v, j) => (i === r && j === c ? !v : v))))}
                    />
                  </div>
                )}

                {form.kind === "paragraph" && (
                  <div className="col gap-2.5">
                    <div className="row between">
                      <span className="label">Questions on the passage</span>
                      <div className="row gap-1.5">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => addChild("single")}>
                          <Plus className="size-4" aria-hidden />
                          Objective
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => addChild("integer")}>
                          <Plus className="size-4" aria-hidden />
                          Numerical
                        </button>
                      </div>
                    </div>
                    {!form.children.length && <p className="sm muted m-0 rounded-control border border-dashed border-line p-4 text-center">No questions yet. Add one above.</p>}
                    {form.children.map((c, ci) => (
                      <div key={c.key} className="col gap-2 rounded-xl border border-line p-3">
                        <div className="row between">
                          <div className="row gap-2">
                            <span className="badge b-navy">Q{ci + 1}</span>
                            {c.type !== "integer" ? (
                              <div className="seg">
                                {(["single", "multiple"] as const).map((m) => (
                                  <button key={m} type="button" className={`tab h-7 text-xs ${c.type === m ? "on" : ""}`}
                                    onClick={() => setChild(c.key, (x) => ({ ...x, type: m, options: m === "single" ? x.options.map((o, k) => ({ ...o, correct: o.correct && x.options.findIndex((y) => y.correct) === k })) : x.options }))}>
                                    {m === "single" ? "Single" : "Multiple"}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="badge b-grey">Numerical</span>
                            )}
                          </div>
                          <button type="button" className="btn btn-ghost btn-sm btn-icon danger-hover w-8" aria-label={`Remove question ${ci + 1}`}
                            onClick={() => set("children", form.children.filter((x) => x.key !== c.key))}>
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                        <Textarea
                          rows={2}
                          placeholder={lang === "en" ? "Question text (LaTeX between $…$)" : "Question text in Hindi"}
                          value={c[lang].question}
                          onChange={(e) => setChild(c.key, (x) => ({ ...x, [lang]: { ...x[lang], question: e.target.value } }))}
                        />
                        {c.type !== "integer" ? (
                          <div className="col gap-1.5 pl-3">
                            {c.options.map((o, oi) => (
                              <div key={o.id} className="row gap-2">
                                <input
                                  type={c.type === "single" ? "radio" : "checkbox"}
                                  name={`correct-${c.key}`}
                                  className={c.type === "single" ? "size-4 accent-[var(--green)]" : "check size-[18px]"}
                                  checked={o.correct}
                                  aria-label={`Question ${ci + 1} option ${KEY(oi)} is correct`}
                                  onChange={(e) =>
                                    setChild(c.key, (x) => ({
                                      ...x,
                                      options: x.options.map((y) => (x.type === "single" ? { ...y, correct: y.id === o.id } : y.id === o.id ? { ...y, correct: e.target.checked } : y)),
                                    }))
                                  }
                                />
                                <span className="xs muted w-4">{KEY(oi)}</span>
                                <Input
                                  placeholder={`Option ${KEY(oi)}`}
                                  value={lang === "en" ? o.en : o.hi}
                                  onChange={(e) => setChild(c.key, (x) => ({ ...x, options: x.options.map((y) => (y.id === o.id ? { ...y, [lang]: e.target.value } : y)) }))}
                                  className="font-mono text-[13px]"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 pl-3">
                            <Input type="number" step="any" placeholder="From" value={c.from} onChange={(e) => setChild(c.key, (x) => ({ ...x, from: e.target.value }))} />
                            <Input type="number" step="any" placeholder="To" value={c.to} onChange={(e) => setChild(c.key, (x) => ({ ...x, to: e.target.value }))} />
                          </div>
                        )}
                        <Input
                          placeholder={lang === "en" ? "Solution (optional)" : "Solution in Hindi (optional)"}
                          value={c[lang].solution}
                          onChange={(e) => setChild(c.key, (x) => ({ ...x, [lang]: { ...x[lang], solution: e.target.value } }))}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {form.kind !== "paragraph" && (
                  <div className="field">
                    <span className="label">Solution{lang === "hi" && <span className="xs muted font-normal"> · Hindi</span>}</span>
                    {lang === "en" && sol && sol.state !== "accepted" ? (
                      <div className="min-h-[90px] rounded-control border border-line bg-surface px-3.5 py-3 text-[14px] leading-[1.6]" aria-live="polite" aria-busy={sol.state === "streaming"}>
                        {sol.text ? <MathText as="span" className="whitespace-pre-line" text={sol.text} /> : <span className="muted">Drafting a solution…</span>}
                        {sol.state === "streaming" && <span className="caret" />}
                      </div>
                    ) : lang === "en" ? (
                      <RichField key="s-en" label="Solution" value={form.solutionEn} onChange={(v) => set("solutionEn", v)} minH={90} />
                    ) : (
                      <RichField key="s-hi" label="Solution in Hindi" value={form.solutionHi} onChange={(v) => set("solutionHi", v)} minH={90} />
                    )}
                    {!(lang === "en" && sol) && !stripHtml(s(lang)) && !/<img/i.test(s(lang)) && (
                      <span className="hint">No solution. Students won&apos;t get an AI review for this question until one exists.</span>
                    )}
                    {lang === "en" && sol?.state === "ready" && sol.draft && (() => {
                      const p = sol.draft.payload as SolutionPayload;
                      const agree = sol.draft.checks.keyAgreement;
                      const key = keyLabel();
                      const said = statedLabel(p);
                      return (
                        <>
                          {agree === "agrees" && (
                            <span className="badge b-green pop self-start">
                              <TickIcon size={12} />
                              Matches the answer key{key ? ` (${key})` : ""}
                            </span>
                          )}
                          {agree === "disagrees" && (
                            <Note tone="warn" className="pop">
                              <AlertIcon color="#9A5800" />
                              <span className="col gap-0.5">
                                <span className="sm font-semibold">
                                  Answer differs from the key{said && key ? `: draft says (${said}), key says (${key})` : ""}
                                </span>
                                <span className="sm">Check the working and the key before you accept.</span>
                              </span>
                            </Note>
                          )}
                          <div className="row pop gap-2">
                            <span className="badge b-navy">
                              <Sparkle />
                              AI draft · check before saving
                            </span>
                            <button type="button" className="btn btn-primary btn-sm" onClick={acceptSolution}>
                              Accept
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={discardSolution}>
                              Discard
                            </button>
                          </div>
                        </>
                      );
                    })()}
                    {lang === "en" && sol?.state === "accepted" && <span className="badge b-green pop self-start">Solution accepted</span>}
                  </div>
                )}
              </section>

              <section className="card pad-lg col gap-3">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                  <div className="field">
                    <span className="label">Subject</span>
                    <SingleSelectCreatable
                      options={subjects.map((x) => ({ value: x.name, label: x.name }))}
                      value={form.subject}
                      onValueChange={(v) => setForm((f) => ({ ...f, subject: v, chapters: v === f.subject ? f.chapters : [], topics: v === f.subject ? f.topics : [] }))}
                      placeholder="Select subject"
                      onCreateNew={addSubject}
                      createNewLabel="Add new subject"
                      createNewPlaceholder="Enter subject name"
                    />
                    {errors.subject && <span className="xs text-danger">{errors.subject}</span>}
                  </div>
                  <div className="field">
                    <span className="label">Chapter</span>
                    {form.subject ? (
                      <MultiSelectCreatable
                        options={chapterList.map((c) => ({ value: c.name, label: c.name }))}
                        values={form.chapters}
                        onValuesChange={(v) => setForm((f) => ({ ...f, chapters: v }))}
                        placeholder={chapterList.length ? "Select chapters" : "Add a chapter"}
                        onCreateNew={subjectData ? addChapter : undefined}
                        createNewLabel="Add new chapter"
                        createNewPlaceholder="Enter chapter name"
                      />
                    ) : (
                      <span className="sm muted flex h-9 items-center rounded-control border border-line px-3">Select a subject first</span>
                    )}
                    {errors.chapters && <span className="xs text-danger">{errors.chapters}</span>}
                  </div>
                  <div className="field">
                    <span className="label row between">
                      Topic
                      {form.chapters.length > 0 && subjectData && (
                        <button type="button" className="xs font-semibold text-brand" onClick={() => setTopicDrawer(true)}>
                          + Add
                        </button>
                      )}
                    </span>
                    {topicOptions.length ? (
                      <MultiSelect values={form.topics} onValuesChange={(v) => set("topics", v)}>
                        <MultiSelectTrigger>
                          <MultiSelectValue placeholder="Select topics" />
                        </MultiSelectTrigger>
                        <MultiSelectContent search={{ placeholder: "Search topics...", emptyMessage: "No topics found" }}>
                          {topicOptions.map((t) => (
                            <MultiSelectItem key={t} value={t}>
                              {t}
                            </MultiSelectItem>
                          ))}
                        </MultiSelectContent>
                      </MultiSelect>
                    ) : (
                      <span className="sm muted flex h-9 items-center rounded-control border border-line px-3">
                        {form.chapters.length ? "No topics yet" : "Select a chapter first"}
                      </span>
                    )}
                  </div>
                  <div className="field">
                    <span className="label">Difficulty</span>
                    <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v)}>
                      <SelectTrigger aria-label="Difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {form.difficulty === "unset" && <SelectItem value="unset">Select difficulty</SelectItem>}
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.difficulty && <span className="xs text-danger">{errors.difficulty}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                  <div className="field">
                    <span className="label">Exams</span>
                    <MultiSelectCreatable
                      options={exams.map((e) => ({ value: e.name, label: e.name }))}
                      values={form.exams}
                      onValuesChange={(v) => set("exams", v)}
                      placeholder="Select exams"
                      onCreateNew={addExam}
                      createNewLabel="Add new exam"
                      createNewPlaceholder="Enter exam name"
                    />
                  </div>
                  <div className="field">
                    <span className="label">Sources</span>
                    <MultiSelectCreatable
                      options={sources.map((x) => ({ value: x.name, label: x.name }))}
                      values={form.sources}
                      onValuesChange={(v) => set("sources", v)}
                      placeholder="Select sources"
                      onCreateNew={addSource}
                      createNewLabel="Add new source"
                      createNewPlaceholder="Enter source name"
                    />
                  </div>
                </div>
                <label className="row sm gap-2.5 font-medium" htmlFor="proofread">
                  <Checkbox id="proofread" checked={form.isProofRead} onCheckedChange={(v) => set("isProofRead", v === true)} />
                  Proofread
                  <span className="xs muted font-normal">checked by a teacher</span>
                </label>
              </section>
            </>
          )}
        </div>

        <aside className="col w-full gap-3.5" style={{ flex: "1 1 340px", maxWidth: 420 }}>
          <section className="ai pad-lg col gap-3" aria-label="AI assist">
            <span className="ai-mark">
              <Sparkle />
              AI assist
            </span>
            <span className="xs muted">Drafts only. Nothing is saved until you accept it.</span>
            {waitingNote}
            {askSave && (
              <Note tone="warn" className="pop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A5800" strokeWidth="2" strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0">
                  <path d="M5 4h11l3 3v13H5z" />
                  <path d="M8 4v5h7V4M8 20v-6h8v6" />
                </svg>
                <span className="col grow gap-2">
                  <span className="sm">
                    <b>Save first?</b> AI works from the saved question, and you have unsaved changes.
                  </span>
                  <span className="row gap-1.5">
                    <button type="button" className="btn btn-primary btn-sm" onClick={saveAndDraft} disabled={saving}>
                      {saving ? "Saving…" : "Save and draft"}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAskSave(null)}>
                      Cancel
                    </button>
                  </span>
                </span>
              </Note>
            )}
            {(Object.entries(limits) as [DraftKind, number][]).map(([k, n]) => (
              <Note key={k} tone="warn">
                <ClockIcon color="#9A5800" />
                <span className="sm">{LIMIT_TEXT[k](n)}</span>
              </Note>
            ))}
            {aiUnsupported && (
              <Note>
                <AlertIcon color="#575C75" />
                <span className="sm">AI assist works on single, multiple and numerical questions. Paragraph and matrix come later.</span>
              </Note>
            )}
            {aiFailed && (
              <Note tone="err" className="pop" role="alert">
                <CrossIcon />
                <span className="col grow gap-1">
                  <span className="sm font-semibold">{aiFailed.title}</span>
                  <span className="sm">{aiFailed.message}</span>
                </span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => runAssist(aiFailed.kind)} disabled={!!running}>
                  Try again
                </button>
              </Note>
            )}
            <button type="button" className="btn btn-secondary justify-start" disabled={offAll || !!limits.tags} onClick={() => runAssist("tags")}>
              {running === "tags" ? <Spinner /> : <Sparkle />}
              Suggest chapter, topic, difficulty
            </button>
            {tagsDraft && tagBadges}
            <button type="button" className="btn btn-secondary justify-start" disabled={offAll || !!limits.translation} onClick={() => runAssist("translation")}>
              {running === "translation" ? <Spinner /> : <Sparkle />}
              Translate to Hindi
            </button>
            <button type="button" className="btn btn-secondary justify-start" disabled={offAll || !!limits.solution} onClick={() => runAssist("solution")}>
              {running === "solution" ? <Spinner /> : <Sparkle />}
              Draft a solution
            </button>
            <div className="col gap-2">
              <button type="button" className="btn btn-secondary justify-start" onClick={checkDuplicates} disabled={dupBusy || loading}>
                {dupBusy ? <Spinner /> : <Sparkle />}
                Check for duplicates
                {dups && <span className={`badge ml-auto ${dups.length ? "b-amber" : "b-grey"}`}>{dups.length} similar</span>}
              </button>
              {dups?.map((m) => (
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
          <section className="card col overflow-hidden">
            <div className="row between pad border-b border-line-2">
              <span className="h3">Student preview</span>
              <span className="xs muted">as rendered in tests{lang === "hi" ? " · Hindi" : ""}</span>
            </div>
            <div className="col pad gap-2.5">
              {loading ? (
                <div className="skel h-32" />
              ) : stripHtml(form.kind === "paragraph" ? form.passage : q(lang)) || form.options.some((o) => o.en) ? (
                <QuestionBody q={previewOf(form)} lang={lang} />
              ) : (
                <span className="sm muted">The question appears here as you type.</span>
              )}
            </div>
          </section>
        </aside>
      </main>

      <CreateTopicDrawer open={topicDrawer} onClose={() => setTopicDrawer(false)} chapterOptions={chapterList.filter((c) => form.chapters.includes(c.name))} onAddTopic={addTopic} />
      <UnsavedChangesDialog open={showDialog} onConfirm={confirmNavigation} onCancel={cancelNavigation} />
    </>
  );
}
