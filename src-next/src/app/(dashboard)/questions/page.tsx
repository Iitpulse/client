"use client";

/*
  Question bank (board: Admin-Questions, canvas v166). Server-side search, filters, tab and chip counts and paging
  (GET /questions/admin/search), "used in N tests" (POST /tests/admin/question-usage), a preview pane, and the bulk bar:
  AI runs with a cost preview (Auto-tag, Translate to Hindi, Draft solutions → /ai/admin/bulk/*), Add to test (with an
  optional section, up to 100 at a time), Delete. "Select all N" selects every question matching the filters.
  M6: the "Needs LaTeX · N" chip (`needsLatex=1`, rows "· needs LaTeX"), the chapter combobox with counts (taxonomy),
  paragraph / matrix previews, the page states (loading, empty bank, no match, search error), soft delete with Undo
  (6 s) and "Delete 2 of 3 questions?" when some are in a live test. Filters and the page live in the URL.
  M10 (boards Admin-Library, Library-Branding, Admin-LibraryPublish; lib/m10-library.ts): source tabs
  "All sources · My bank · IIT-PULSE library" (`source`, `hideCopied` in the URL), source badges, the read-only
  library preview (no Edit, "Add to a test", "Copy to my bank"), the copy dialog, the not-entitled upsell, the
  add-on-ended banner, licence-ended copies, and for IIT-PULSE staff the Library column and "Publish to library…".
  Library rows never get Edit, Delete, AI bulk actions or the CSV. Without the M10 fields the page is as before.
  Also: the "Exam: …" chip (own exams with `counts.byExam`, `exam` in the URL; exam names on rows and the preview) and,
  for IIT-PULSE staff, "All · In the library · Can be published" (`counts.publish`, `lib=in|can`; no count when
  canPublish is null, an inline note on 503 EMBARGO_CHECK_UNAVAILABLE).
*/
import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Download, Plus, Search } from "lucide-react";
import { MathText } from "@/components/math-text";
import { Topbar } from "@/components/admin/Topbar";
import { QuestionBody } from "@/components/question-body";
import { Switch } from "@/components/ui/switch";
import { AddToTest } from "@/components/questions-admin/add-to-test";
import { BulkJobStatus, BulkPreviewDialog, useBulkJob, type Selection } from "@/components/questions-admin/bulk-ai";
import { FilterChip as KitFilterChip, notify, ToggleChip, useFillHeight, type ComboOption } from "@/components/kit";
import { DeleteBlockedDialog, EmptyBank, NoMatch, SearchError } from "@/components/questions-admin/bank-states";
import { Sparkle } from "@/components/questions-admin/parts";
import {
  AddOnEndedBanner,
  LIBRARY_EDIT_TIP,
  LibraryNoMatch,
  LibraryReadOnlyBanner,
  LICENCE_ENDED_TIP,
  LockedEdit,
  NoPublishBanner,
  NotEntitledCard,
  PublishCell,
  SourceBadge,
  SourceTabs,
} from "@/components/questions-admin/library-parts";
import { LibraryCopyDialog, type OwnSubject } from "@/components/questions-admin/library-copy";
import { LibraryPublishDialog } from "@/components/questions-admin/library-publish";
import { Segmented } from "@/components/kit";
import { useOwner } from "@/components/m7b/invites";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { apiError, editorKind, questionsAdmin, TYPE_LABEL, useQuestionSearch, useQuestionUsage, useReadyDraftCount, type SearchParams } from "@/lib/ai-admin";
import { fetchQuestion, hasHindi, LEVEL, useExamsList, useSubjects } from "@/lib/question-queries";
import { deleteQuestion, kindOfType, liveTestDetails, markSample, questionUsage, taxonomy, undoDelete, useQuestionsSource } from "@/lib/m6/questions";
import { useCan, useMe } from "@/lib/m6/people";
import {
  fmtDay,
  isLibraryRow,
  libraryLabel,
  licenceEnded,
  solutionBy,
  useLibraryStatus,
  usePublishCheck,
  type LibraryRow,
  type SearchLibrary,
  type SearchResponseM10,
  type SourceTab,
} from "@/lib/m10-library";
import type { BankListItem, DraftKind, QuestionFilter, QuestionType } from "@/lib/m5-contract";
import type { QuestionInLiveTestDetails, SoftDeleteResponse } from "@/lib/m6-contract";

/** M6 search: the needsLatex filter and count (rows carry `needsLatex` / `flags.needsLatex`). */
type FilterM6 = QuestionFilter & { needsLatex?: boolean };
/** M10 search additions (sent only when the backend has the library). */
type FilterM10 = FilterM6 & { source?: "mine" | "library"; hideCopied?: boolean; examId?: string; published?: "in" | "can" };
type RowM6 = LibraryRow & { needsLatex?: number; flags?: { needsLatex?: number } };
const needsLatexOf = (r: RowM6) => r.flags?.needsLatex ?? r.needsLatex ?? 0;

const TABS: { key: "all" | QuestionType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "single", label: "Single" },
  { key: "multiple", label: "Multiple" },
  { key: "integer", label: "Numerical" },
  { key: "paragraph", label: "Paragraph" },
  { key: "matrix", label: "Matrix" },
];
const PAGE = 25;
const GRID = "grid grid-cols-[36px_minmax(0,1fr)_140px_92px_84px] items-center gap-x-3 px-4 py-2.5 border-b border-line-2";
/** + Source column (institutes with the library) / + Library column (IIT-PULSE staff) */
const GRID_SRC = "grid grid-cols-[36px_minmax(0,1fr)_140px_92px_84px_180px] items-center gap-x-3 px-4 py-2.5 border-b border-line-2";
const GRID_PUB = "grid grid-cols-[36px_minmax(0,1fr)_140px_92px_84px_190px] items-center gap-x-3 px-4 py-2.5 border-b border-line-2";
const IITP_TENANT = "tnt_iitpulse";
const fmt = (n: number) => n.toLocaleString("en-IN");
const level = (d: string | null) => LEVEL[d ?? ""] ?? { label: "Unset", cls: "b-grey" };
const testsLabel = (n: number) => (n === 1 ? "1 test" : `${fmt(n)} tests`);

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function useDebounced<T>(v: T, ms: number): T {
  const [d, setD] = React.useState(v);
  React.useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

const TYPE_KEYS = new Set<string>(["single", "multiple", "integer", "paragraph", "matrix"]);

/**
 * Filters, tab and page in the URL (kit rule): ?type=&q=&subject=&chapter=&level=&missing=1&untagged=1&nohindi=1&latex=1&page=
 * M10: &source=mine|library&hideCopied=1&exam=&lib=in|can (IIT-PULSE publish tabs)&locked=1 (from a LIB- editor link)
 */
function useUrlState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const get = (k: string) => sp.get(k) || null;
  // replace() lands a moment later: changes made before it lands build on the pending address, not the old one
  const pending = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (pending.current !== null && sp.toString() === pending.current) pending.current = null;
  }, [sp]);
  const set = React.useCallback(
    (patch: Record<string, string | number | boolean | null | undefined>) => {
      const n = new URLSearchParams(pending.current ?? window.location.search);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === false || v === "" || (k === "page" && v === 1)) n.delete(k);
        else n.set(k, v === true ? "1" : String(v));
      }
      const qs = n.toString();
      pending.current = qs;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );
  return { get, set };
}

function QuestionsBank() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const subjects = useSubjects();
  const drafts = useReadyDraftCount();
  const url = useUrlState();
  const sampleSource = useQuestionsSource("search", "taxonomy", "delete");

  const typeParam = url.get("type");
  const tab: "all" | QuestionType = typeParam && TYPE_KEYS.has(typeParam) ? (typeParam as QuestionType) : "all";
  const [search, setSearch] = React.useState(() => url.get("q") ?? "");
  const q = useDebounced(search.trim(), 300);
  const subjectId = url.get("subject");
  const chapterId = url.get("chapter");
  const difficulty = url.get("level");
  const missingSolution = url.get("missing") === "1";
  const untagged = url.get("untagged") === "1";
  const hindiMissing = url.get("nohindi") === "1";
  const needsLatex = url.get("latex") === "1";
  const sourceParam = url.get("source");
  const sourceTab: SourceTab = sourceParam === "mine" || sourceParam === "library" ? sourceParam : "all";
  const hideCopied = url.get("hideCopied") === "1";
  const examId = url.get("exam");
  const pubParam = url.get("lib");
  const pubTab: "all" | "in" | "can" = pubParam === "in" || pubParam === "can" ? pubParam : "all";
  const page = Math.max(1, Number(url.get("page")) || 1);
  const setPage = (p: number | ((p: number) => number)) => url.set({ page: typeof p === "function" ? p(page) : p });
  const setFilter = (patch: Record<string, string | boolean | null>) => url.set({ ...patch, page: null });
  React.useEffect(() => {
    if ((url.get("q") ?? "") !== q) url.set({ q: q || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const [openId, setOpenId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Map<string, BankListItem>>(new Map());
  const [allMatching, setAllMatching] = React.useState(false);
  const [savingProof, setSavingProof] = React.useState(false);
  const [previewKind, setPreviewKind] = React.useState<DraftKind | null>(null);
  /** Add to test: the ids and whether they came from the bulk bar (then the selection clears after) */
  const [picking, setPicking] = React.useState<{ ids: string[]; bulk: boolean } | null>(null);
  const [copyIds, setCopyIds] = React.useState<{ ids: string[]; bulk: boolean } | null>(null);
  const [publishIds, setPublishIds] = React.useState<string[] | null>(null);
  /** the edit-locked tip on a library / licence-ended preview (opens on arrival from a LIB- editor link) */
  const [tipOpen, setTipOpen] = React.useState(() => url.get("locked") === "1");

  /* ---------- M10 library: status and what the last search said ---------- */
  const libStatus = useLibraryStatus();
  const status = libStatus.data ?? null;
  const { roleName } = useCan();
  const { owner } = useOwner();
  const meFull = useMe().data;
  const [lastLib, setLastLib] = React.useState<SearchLibrary | null>(null);
  const libraryOn = !!status || !!lastLib;
  const isLibOwner = status?.isLibraryOwner ?? (libraryOn && meFull?.tenant?.id === IITP_TENANT);
  const entitled = !isLibOwner && (status?.entitled ?? lastLib?.entitled ?? false);
  const addOnEnded = !isLibOwner && !entitled && !!status?.addOnEnded;
  const branded = (status?.branding ?? lastLib?.branding) !== false;
  const libLabel = libraryLabel(branded, status?.label ?? lastLib?.label);
  const showSourceTabs = libraryOn && !isLibOwner;
  const libLocked = showSourceTabs && !entitled;
  const onLibraryTab = showSourceTabs && sourceTab === "library";
  const canPublish = isLibOwner && !!status?.canPublish;
  const [blocked, setBlocked] = React.useState<{ total: number; deletable: BankListItem[]; blocked: Array<{ id: string; live: QuestionInLiveTestDetails["test"] }> } | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  /** deleted on this page (until Undo): their previews are not fetched */
  const [deletedIds, setDeletedIds] = React.useState<Set<string>>(() => new Set());
  const bulk = useBulkJob();

  const filter = React.useMemo<FilterM6>(
    () => ({
      q: q || undefined,
      subjectId: subjectId ?? undefined,
      chapterId: chapterId ?? undefined,
      difficulty: (difficulty as QuestionFilter["difficulty"]) ?? undefined,
      type: tab === "all" ? undefined : tab,
      missingSolution: missingSolution || undefined,
      untagged: untagged || undefined,
      hindiMissing: hindiMissing || undefined,
      needsLatex: needsLatex || undefined,
    }),
    [q, subjectId, chapterId, difficulty, tab, missingSolution, untagged, hindiMissing, needsLatex]
  );
  // M10 additions go only to a backend with the library; the locked library tab searches nothing new (the upsell shows)
  const searchFilter = React.useMemo<FilterM10>(
    () => ({
      ...filter,
      source: showSourceTabs && sourceTab !== "all" && !(sourceTab === "library" && libLocked) ? sourceTab : undefined,
      hideCopied: entitled && sourceTab !== "mine" && hideCopied ? true : undefined,
      examId: libraryOn && examId ? examId : undefined,
      published: isLibOwner && pubTab !== "all" ? pubTab : undefined,
    }),
    [filter, showSourceTabs, sourceTab, libLocked, entitled, hideCopied, libraryOn, examId, isLibOwner, pubTab]
  );
  const params = { ...searchFilter, page, pageSize: PAGE } as SearchParams;
  const res = useQuestionSearch(params);
  const data = res.data as SearchResponseM10 | undefined;
  if (data?.library && data.library !== lastLib) setLastLib(data.library);
  const libCounts = data?.library?.counts ?? lastLib?.counts ?? null;
  const byExam = data?.counts.byExam;
  // the publish tabs keep their last counts while a tab's search fails (503 EMBARGO_CHECK_UNAVAILABLE on "can")
  const [lastPub, setLastPub] = React.useState<NonNullable<SearchResponseM10["counts"]["publish"]> | null>(null);
  if (data?.counts.publish && data.counts.publish !== lastPub) setLastPub(data.counts.publish);
  const publishCounts = data?.counts.publish ?? lastPub;
  const embargoDown = res.isError && apiError(res.error).code === "EMBARGO_CHECK_UNAVAILABLE";
  // A backend without the M6 search has no needsLatex count: the chip counts 0 and its filter matches nothing
  const latexCount = (data?.counts as { needsLatex?: number } | undefined)?.needsLatex;
  const latexMissing = !!data && latexCount === undefined;
  React.useEffect(() => {
    if (latexMissing) markSample("search");
  }, [latexMissing]);
  const rows = React.useMemo(() => (latexMissing && needsLatex ? [] : ((data?.items ?? []) as RowM6[])), [data, latexMissing, needsLatex]);
  const total = latexMissing && needsLatex ? 0 : data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  // A filter change drops "all matching" (it meant the old filter)
  const filterKey = JSON.stringify(searchFilter);
  const [lastKey, setLastKey] = React.useState(filterKey);
  if (lastKey !== filterKey) {
    setLastKey(filterKey);
    setAllMatching(false);
  }

  const usage = useQuestionUsage(rows.map((r) => r.id));
  const used = (id: string) => usage.data?.[id]?.tests;

  const open: BankListItem | null = rows.find((r) => r.id === openId) || (openId && selected.get(openId)) || rows[0] || null;
  const full = useQuery({
    queryKey: ["questions", "one", open?.id],
    enabled: !!open && !deletedIds.has(open.id),
    queryFn: () => fetchQuestion(open!.id, editorKind(open!.type)),
    staleTime: 30_000,
  });

  // Filter options (ids: the search filters by id). Chapters come from the taxonomy tree (with question counts).
  const tree = useQuery({ queryKey: ["questions", "taxonomy"], queryFn: () => taxonomy(), staleTime: 5 * 60_000, retry: false });
  const subjectOptions = React.useMemo(() => (subjects.data ?? []).map((s) => ({ value: s._id, label: s.name })).sort((a, b) => a.label.localeCompare(b.label)), [subjects.data]);
  const chapterChoices = React.useMemo(() => {
    const out: Array<{ id: string; name: string; subject: string; subjectId: string; count: number | null }> = [];
    if (tree.data) {
      for (const s of tree.data.subjects) {
        if (subjectId && s.id !== subjectId) continue;
        for (const c of s.chapters) out.push({ id: c.id, name: c.name, subject: s.name, subjectId: s.id, count: c.questions || (tree.data.totals.questions ? 0 : null) });
      }
    } else {
      for (const s of subjects.data ?? []) {
        if (subjectId && s._id !== subjectId) continue;
        for (const c of s.chapters ?? []) {
          const id = (c as { id?: string; _id?: string }).id || (c as { _id?: string })._id;
          if (id && c.name) out.push({ id, name: c.name, subject: s.name, subjectId: s._id, count: null });
        }
      }
    }
    return out.sort((a, b) => a.subject.localeCompare(b.subject) || a.name.localeCompare(b.name));
  }, [tree.data, subjects.data, subjectId]);
  const chapterName = chapterChoices.find((c) => c.id === chapterId)?.name;
  /** The institute's own subjects and chapters (the copy dialog's chapter picker) */
  const ownSubjects = React.useMemo<OwnSubject[]>(() => {
    if (tree.data) return tree.data.subjects.map((s) => ({ id: s.id, name: s.name, chapters: s.chapters.map((c) => ({ id: c.id, name: c.name })) }));
    return (subjects.data ?? []).map((s) => ({
      id: s._id,
      name: s.name,
      chapters: (s.chapters ?? []).flatMap((c) => {
        const id = (c as { id?: string; _id?: string }).id || (c as { _id?: string })._id;
        return id && c.name ? [{ id, name: c.name }] : [];
      }),
    }));
  }, [tree.data, subjects.data]);
  // Exam filter (board Admin-Library exam-filter): the institute's own exams with the search's count per exam
  // (`counts.byExam`, every other filter applied; an exam it leaves out has none). Library rows match by exam name.
  const exams = useExamsList();
  const examOptions = React.useMemo<ComboOption[]>(
    () =>
      byExam
        ? (exams.data ?? [])
            .map((e) => ({ value: e._id, label: e.name, group: "Your institute's exams", end: fmt(byExam[e._id] ?? 0) }))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [],
    [exams.data, byExam]
  );
  const examName = (exams.data ?? []).find((e) => e._id === examId)?.name;
  const publishCheck = usePublishCheck(
    rows.map((r) => r.id),
    canPublish
  );
  const chapterOptions = React.useMemo<ComboOption[]>(
    () => chapterChoices.map((c) => ({ value: c.id, label: c.name, group: c.subject, end: c.count == null ? undefined : fmt(c.count) })),
    [chapterChoices]
  );

  /* ---------- selection ---------- */
  const pageIds = rows.map((r) => r.id);
  const pageSel = pageIds.filter((id) => selected.has(id)).length;
  const allState = pageSel === 0 ? "false" : pageSel === pageIds.length ? "true" : "mixed";
  const toggle = (r: BankListItem) => {
    setAllMatching(false);
    setSelected((s) => {
      const n = new Map(s);
      if (n.has(r.id)) n.delete(r.id);
      else n.set(r.id, r);
      return n;
    });
  };
  const selCount = allMatching ? total : selected.size;
  const selection = React.useMemo<Selection>(() => (allMatching ? { filter } : { questionIds: [...selected.keys()] }), [allMatching, filter, selected]);
  const clear = () => {
    setSelected(new Map());
    setAllMatching(false);
    bulk.setJob(null);
  };
  // "Select all N" only where every row is the institute's own (library rows take no AI runs or delete)
  const offerAll = !allMatching && pageIds.length > 0 && pageSel === pageIds.length && total > pageIds.length && !bulk.job && (!showSourceTabs || sourceTab === "mine");
  const selRows = [...selected.values()] as LibraryRow[];
  const selLib = allMatching ? 0 : selRows.filter(isLibraryRow).length;
  const allLib = selLib > 0 && selLib === selected.size;
  const selEnded = allMatching ? 0 : selRows.filter(licenceEnded).length;

  /* ---------- writes ---------- */
  const setProofread = async (id: string, kind: ReturnType<typeof editorKind>, value: boolean) => {
    setSavingProof(true);
    try {
      await api.questions.update(kind, id, { isProofRead: value });
      qc.invalidateQueries({ queryKey: ["questions"] });
    } catch {
      toast({ title: "Could not update proofread status", variant: "destructive" });
    } finally {
      setSavingProof(false);
    }
  };

  /**
   * Delete (soft, M6): no "Are you sure?" (Undo instead); questions in a live test can't be deleted until it closes,
   * so those are left out after the board's "Delete 2 of 3 questions?" dialog.
   */
  const runDelete = async (list: BankListItem[]) => {
    setDeleting(true);
    const done: SoftDeleteResponse[] = [];
    const lateBlocked: Array<{ id: string; live: QuestionInLiveTestDetails["test"] }> = [];
    try {
      for (const r of list) {
        try {
          done.push(await deleteQuestion(kindOfType(r.type), r.id, "Question bank"));
        } catch (e) {
          const live = liveTestDetails(e);
          if (live) lateBlocked.push({ id: r.id, live: live.test });
          else throw e;
        }
      }
    } catch (e) {
      toast({ title: "Could not delete", description: apiError(e).message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
    const gone = new Set(done.map((d) => d.deleted.id));
    setSelected((s) => new Map([...s].filter(([id]) => !gone.has(id))));
    setAllMatching(false);
    if (openId && gone.has(openId)) setOpenId(null);
    setDeletedIds((x) => new Set([...x, ...gone]));
    // the deleted questions' own previews would answer 404: refresh the lists only
    qc.invalidateQueries({ predicate: (x) => x.queryKey[0] === "questions" && x.queryKey[1] !== "one" });
    if (done.length) notify.undo(done.length === 1 ? "Deleted 1 question" : `Deleted ${fmt(done.length)} questions`, () => undoDeletes(done));
    if (lateBlocked.length) setBlocked({ total: lateBlocked.length, deletable: [], blocked: lateBlocked });
  };

  const undoDeletes = async (done: SoftDeleteResponse[]) => {
    try {
      for (const d of done) {
        if (d.undo) await undoDelete(d.undo.path, "Question bank");
      }
      const back = new Set(done.map((d) => d.deleted.id));
      setDeletedIds((x) => new Set([...x].filter((id) => !back.has(id))));
      qc.invalidateQueries({ queryKey: ["questions"] });
      notify.success(done.length === 1 ? "Question restored" : `${fmt(done.length)} questions restored`);
    } catch (e) {
      notify.error("Couldn't undo the delete", { description: apiError(e).message });
    }
  };

  /** Every question matching the filters (search pages of 100), for the CSV and for "Delete" on all matching. */
  const allRows = async (f: FilterM10 = searchFilter): Promise<BankListItem[]> => {
    const out: BankListItem[] = [];
    for (let p = 1; p <= 200; p++) {
      const r = await questionsAdmin.search({ ...f, page: p, pageSize: 100 } as SearchParams);
      out.push(...r.items);
      if (out.length >= r.total || !r.items.length) break;
    }
    // never library rows (no edit, delete or bulk export of them)
    return out.filter((r) => !isLibraryRow(r as LibraryRow));
  };

  const exportCsv = async (list?: BankListItem[]) => {
    let items = list;
    try {
      // M10: the CSV is the institute's own questions only (no library rows, no licensed copies)
      items ??= await allRows(showSourceTabs ? { ...searchFilter, source: "mine", hideCopied: undefined } : searchFilter);
    } catch (e) {
      toast({ title: "Could not export", description: apiError(e).message, variant: "destructive" });
      return;
    }
    items = items.filter((r) => !(r as LibraryRow).licence && (r as LibraryRow).source !== "copy");
    if (!items.length) {
      notify.success("Nothing to export", { description: "Library questions and their copies can't be exported." });
      return;
    }
    const head = ["ID", "Type", "Question", "Subject", "Chapter", "Topics", "Difficulty", "Status"];
    const body = items.map((r) => [
      r.id,
      TYPE_LABEL[r.type] ?? r.type,
      csvCell(r.stemPreview),
      csvCell(r.subject?.name ?? ""),
      csvCell(r.chapters.map((c) => c.name).join("; ")),
      csvCell(r.topics.map((t) => t.name).join("; ")),
      r.difficulty ?? "unset",
      r.isProofRead ? "Proofread" : "Pending",
    ]);
    const blob = new Blob([[head.join(","), ...body.map((r) => r.join(","))].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `questions_${tab === "all" ? "all" : tab}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const askDelete = async () => {
    let list: BankListItem[];
    try {
      list = allMatching ? await allRows() : [...selected.values()].filter((r) => !isLibraryRow(r as LibraryRow));
    } catch (e) {
      toast({ title: "Could not load the questions", description: apiError(e).message, variant: "destructive" });
      return;
    }
    if (!list.length) return;
    // Questions in a live test (usage `live`, M6) can't be deleted until it closes
    const live: Array<{ id: string; live: QuestionInLiveTestDetails["test"] }> = [];
    try {
      for (let k = 0; k < list.length; k += 200) {
        const u = await questionUsage(list.slice(k, k + 200).map((r) => r.id));
        for (const [id, x] of Object.entries(u)) if (x.live.length) live.push({ id, live: x.live[0] });
      }
    } catch {
      // usage unavailable: the delete itself still refuses a question in a live test (409)
    }
    if (live.length) {
      const ids = new Set(live.map((l) => l.id));
      setBlocked({ total: list.length, deletable: list.filter((r) => !ids.has(r.id)), blocked: live });
      return;
    }
    await runDelete(list);
  };

  const newType = tab === "integer" ? "numerical" : tab === "paragraph" ? "paragraph" : tab === "matrix" ? "matrix" : "mcq";
  const noFilters = !q && !subjectId && !chapterId && !difficulty && tab === "all" && !missingSolution && !untagged && !hindiMissing && !needsLatex && !examId && !hideCopied && pubTab === "all";
  const emptyBank = noFilters && !onLibraryTab && !!data && data.counts.byType.all === 0;
  const noMatchDetail = [
    examName ? `in ${examName}` : "",
    chapterName ? `in ${chapterName}` : subjectId ? `in ${subjectOptions.find((o) => o.value === subjectId)?.label ?? "this subject"}` : "",
    difficulty ? `${difficulty}` : "",
    missingSolution ? "missing a solution" : "",
    untagged ? "untagged" : "",
    hindiMissing ? "without Hindi" : "",
    needsLatex ? "with an equation as an image" : "",
  ]
    .filter(Boolean)
    .join(", ");

  const counts = data?.counts;
  // M10 columns: Source (institutes with the library or its copies) / Library (IIT-PULSE staff)
  const showSourceCol = showSourceTabs && (entitled || addOnEnded || rows.some((r) => !!r.licence || isLibraryRow(r)));
  const showPubCol = isLibOwner && libraryOn;
  const grid = showPubCol ? GRID_PUB : showSourceCol ? GRID_SRC : GRID;
  const tableMin = showPubCol ? "min-w-[750px]" : showSourceCol ? "min-w-[740px]" : "min-w-[560px]";
  // the locked library tab (or a search that says the institute isn't entitled) shows the upsell in place of the list
  const notEntitledErr = res.isError && apiError(res.error).code === "LIBRARY_NOT_ENTITLED";
  const showUpsell = (onLibraryTab && libLocked) || notEntitledErr;
  const clearAll = () => {
    setSearch("");
    url.set({ q: null, subject: null, chapter: null, level: null, missing: null, untagged: null, nohindi: null, latex: null, exam: null, hideCopied: null, page: null });
  };
  const pickSource = (v: SourceTab) => {
    const patch: Record<string, string | boolean | null> = { source: v === "all" ? null : v };
    // the bank's edit chips mean nothing for read-only library questions
    if (v === "library") Object.assign(patch, { missing: null, untagged: null, nohindi: null, latex: null });
    if (v === "mine") patch.hideCopied = null;
    setFilter(patch);
  };

  const showBar = (selCount > 0 || !!bulk.job) && !showUpsell;
  // owner rule (6 Nov): the table takes the screen height left, only its rows scroll (header row and pager stay put)
  // (80px kept clear while the bulk bar shows, as the kit's DataTable does)
  const [fillRef, fillH] = useFillHeight<HTMLDivElement>(true, 320, showBar ? 80 : 0);
  const busyJob = bulk.job && bulk.active;
  const ghost = "btn btn-ghost h-[34px] text-[13px] text-[#D6D8FA] hover:bg-white/10 hover:text-white";

  const openRow = open as LibraryRow | null;
  const openIsLib = !!openRow && isLibraryRow(openRow);
  const openEnded = !!openRow && licenceEnded(openRow);
  const openExams = openRow?.exams ?? [];

  const copied = (copies: Array<{ sourceId: string; id: string }>, fromBulk: boolean) => {
    setCopyIds(null);
    if (fromBulk) clear();
    const n = copies.length;
    notify.success(n === 1 ? "1 question copied to your bank. It's yours to edit." : `${fmt(n)} questions copied to your bank. They're yours to edit.`, {
      action: { label: "Open in my bank", href: n === 1 ? `/questions?source=mine&q=${encodeURIComponent(copies[0].id)}` : "/questions?source=mine" },
    });
  };

  return (
    <>
      <Topbar
        title="Question bank"
        badge={
          sampleSource === "sample" ? (
            <span className="badge b-amber" title="This backend doesn't have some M6 question routes yet. Parts of this page show sample data.">
              Sample data
            </span>
          ) : undefined
        }
        actions={
          <>
            {!onLibraryTab && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => exportCsv()}
                disabled={!total}
                title={showSourceCol ? "Your own questions only: library questions and their copies can't be exported" : undefined}
              >
                <Download className="size-4" aria-hidden />
                Export CSV
              </button>
            )}
            <Link href="/questions/drafts" className="btn btn-secondary btn-sm">
              AI drafts
              {!!drafts.data && <span className="badge b-navy h-5 px-[7px]">{fmt(drafts.data)}</span>}
            </Link>
            <Link href="/questions/bulk-upload" className="btn btn-secondary btn-sm">
              Import Word / PDF
            </Link>
            <Link href={`/questions/new?type=${newType}`} className="btn btn-primary btn-sm">
              <Plus className="size-4" aria-hidden />
              New question
            </Link>
          </>
        }
      />
      <main className="col gap-3.5 px-7 pt-5 pb-8">
        {showSourceTabs && (
          <SourceTabs value={sourceTab} onChange={pickSource} counts={libCounts} label={libLocked ? "IIT-PULSE library" : libLabel} locked={libLocked} />
        )}
        {isLibOwner && (publishCounts || pubTab !== "all") && (
          <Segmented<"all" | "in" | "can">
            ariaLabel="Library"
            value={pubTab}
            onChange={(v) => setFilter({ lib: v === "all" ? null : v })}
            options={[
              { value: "all", label: "All", count: publishCounts?.all != null ? fmt(publishCounts.all) : undefined },
              { value: "in", label: "In the library", count: publishCounts ? fmt(publishCounts.inLibrary) : undefined },
              // null: tests couldn't answer the embargo check, so there's no count to show
              { value: "can", label: "Can be published", count: publishCounts?.canPublish != null ? fmt(publishCounts.canPublish) : undefined },
            ]}
          />
        )}

        {addOnEnded ? (
          <AddOnEndedBanner endedAt={status?.addOnEndedAt} copies={status?.counts.copies ?? 0} owner={owner} />
        ) : onLibraryTab && !libLocked ? (
          <LibraryReadOnlyBanner label={libLabel} />
        ) : isLibOwner && status && !canPublish ? (
          <NoPublishBanner roleName={roleName} />
        ) : null}

        {showUpsell ? (
          <NotEntitledCard owner={owner} institute={meFull?.tenant?.name ?? null} price={status?.price} />
        ) : (
          <>
            <div className="underline-tabs overflow-x-auto" role="tablist" aria-label="Question type">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  className={`utab whitespace-nowrap ${tab === t.key ? "on" : ""}`}
                  onClick={() => setFilter({ type: t.key === "all" ? null : t.key })}
                >
                  {t.label} <span className="muted num">{counts ? fmt(counts.byType[t.key] ?? 0) : "…"}</span>
                </button>
              ))}
            </div>

            <div className="row wrap gap-2">
              <div className="relative w-[300px] max-w-full">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <label htmlFor="qs" className="sr-only">
                  Search
                </label>
                <input id="qs" className="input h-9 pl-[34px] text-[13px]" placeholder="Search text, ID or tag" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              {(byExam || examId) && (
                <KitFilterChip
                  label="Exam"
                  noun="exam"
                  value={examId}
                  options={examOptions}
                  valueLabel={examName}
                  note="Only exams your institute has set up are listed."
                  onChange={(v) => setFilter({ exam: v })}
                />
              )}
              <KitFilterChip label="Subject" noun="subject" value={subjectId} options={subjectOptions} onChange={(v) => setFilter({ subject: v, chapter: null })} />
              <KitFilterChip label="Chapter" noun="chapter" value={chapterId} options={chapterOptions} valueLabel={chapterName} onChange={(v) => setFilter({ chapter: v })} />
              <KitFilterChip
                label="Difficulty"
                noun="difficulty"
                anyLabel="Any difficulty"
                value={difficulty}
                options={[
                  { value: "easy", label: "Easy" },
                  { value: "medium", label: "Medium" },
                  { value: "hard", label: "Hard" },
                ]}
                onChange={(v) => setFilter({ level: v })}
              />
              {!onLibraryTab && (
                <>
                  <ToggleChip on={missingSolution} onChange={(v) => setFilter({ missing: v })}>
                    Missing solution · {counts ? fmt(counts.missingSolution) : "…"}
                  </ToggleChip>
                  <ToggleChip on={untagged} onChange={(v) => setFilter({ untagged: v })}>
                    Untagged · {counts ? fmt(counts.untagged) : "…"}
                  </ToggleChip>
                  <ToggleChip on={hindiMissing} onChange={(v) => setFilter({ nohindi: v })}>
                    No Hindi · {counts ? fmt(counts.hindiMissing) : "…"}
                  </ToggleChip>
                  <ToggleChip on={needsLatex} onChange={(v) => setFilter({ latex: v })}>
                    Needs LaTeX · {counts ? fmt(latexCount ?? 0) : "…"}
                  </ToggleChip>
                </>
              )}
              {entitled && sourceTab !== "mine" && (
                <ToggleChip on={hideCopied} onChange={(v) => setFilter({ hideCopied: v })}>
                  Hide ones I&apos;ve copied
                </ToggleChip>
              )}
            </div>

            <div className="flex flex-wrap items-start gap-3.5">
              <div ref={fillRef} className={`card min-w-0 ${fillH !== null ? "k-fill" : "scrollx"}`} style={{ flex: "999 1 560px", height: fillH ?? undefined, overflow: fillH !== null ? "hidden" : undefined }}>
                <div className="k-fill-body">
                  <div role="table" aria-label="Questions" className={tableMin} aria-busy={res.isFetching}>
                    <div role="rowgroup" className="k-fill-head">
                      <div role="row" className={`${grid} border-b-line bg-[#FAFBFD] text-xs font-semibold tracking-[.04em] text-muted uppercase`}>
                        <span role="columnheader">
                          <input
                            type="checkbox"
                            className="check size-[18px]"
                            aria-label="Select all on this page"
                            checked={allState === "true"}
                            ref={(el) => {
                              if (el) el.indeterminate = allState === "mixed";
                            }}
                            onChange={() => {
                              setAllMatching(false);
                              setSelected((s) => {
                                const n = new Map(s);
                                if (allState === "true") pageIds.forEach((id) => n.delete(id));
                                else rows.forEach((r) => n.set(r.id, r));
                                return n;
                              });
                            }}
                            disabled={!pageIds.length}
                          />
                        </span>
                        <span role="columnheader">Question</span>
                        <span role="columnheader">Chapter</span>
                        <span role="columnheader">Type</span>
                        <span role="columnheader">Level</span>
                        {showPubCol ? <span role="columnheader">Library</span> : showSourceCol ? <span role="columnheader">Source</span> : null}
                      </div>
                    </div>
                    <div role="rowgroup" className={res.isFetching && !res.isLoading ? "opacity-70 transition-opacity" : ""}>
                      {res.isLoading &&
                        Array.from({ length: 3 }, (_, i) => (
                          <div key={i} className={`${grid} py-4`}>
                            <span className="skel size-[18px]" />
                            <span className="col gap-1.5">
                              <span className="skel h-2.5" style={{ width: ["90%", "75%", "85%"][i] }} />
                              <span className="skel h-2 w-[120px]" />
                            </span>
                            <span className="skel h-2.5 w-[100px]" />
                            <span className="skel h-2.5 w-[60px]" />
                            <span className="skel h-2.5 w-[50px]" />
                            {(showPubCol || showSourceCol) && <span className="skel h-2.5 w-[70px]" />}
                          </div>
                        ))}
                      {res.isError &&
                        (apiError(res.error).code === "NOT_IMPLEMENTED" ? (
                          <p className="sm muted p-6">Search needs the Postgres question bank.</p>
                        ) : embargoDown ? (
                          <p className="sm muted m-0 p-6" role="status">
                            We couldn&apos;t check IIT-PULSE tests just now, so we can&apos;t tell which questions can be published.{" "}
                            <button type="button" className="underline" onClick={() => res.refetch()}>
                              Try again
                            </button>{" "}
                            or{" "}
                            <button type="button" className="underline" onClick={() => setFilter({ lib: null })}>
                              see all questions
                            </button>
                            .
                          </p>
                        ) : (
                          <SearchError code={errorCode(res.error)} onRetry={() => res.refetch()} onClear={q ? () => setSearch("") : undefined} />
                        ))}
                      {!res.isLoading &&
                        !res.isError &&
                        !rows.length &&
                        (emptyBank ? (
                          <EmptyBank newHref={`/questions/new?type=${newType}`} />
                        ) : onLibraryTab ? (
                          <LibraryNoMatch query={q} detail={noMatchDetail} label={libLabel} onClear={clearAll} onMine={() => pickSource("mine")} />
                        ) : (
                          <NoMatch query={q} detail={noMatchDetail} onClear={clearAll} onAllChapters={chapterId ? () => setFilter({ chapter: null }) : undefined} />
                        ))}
                      {rows.map((r) => {
                        const lv = level(r.difficulty);
                        const isOpen = open?.id === r.id;
                        const n = used(r.id);
                        const lib = isLibraryRow(r);
                        const ended = licenceEnded(r);
                        const examNames = (r.exams ?? []).map((e) => e.name).join(" · ");
                        return (
                          <div
                            key={r.id}
                            role="row"
                            className={`${grid} cursor-pointer transition-colors hover:bg-brand-50 ${isOpen ? "bg-brand-50" : ended ? "bg-[#FAFBFD] text-muted" : ""}`}
                            onClick={() => {
                              setOpenId(r.id);
                              setTipOpen(false);
                            }}
                          >
                            <span role="cell" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" className="check size-[18px]" aria-label={`Select ${r.id}`} checked={allMatching || selected.has(r.id)} onChange={() => toggle(r)} />
                            </span>
                            <span role="cell" className="col min-w-0 gap-[3px]">
                              <button
                                type="button"
                                className={`sm block w-full min-w-0 truncate rounded text-left font-serif ${ended ? "text-muted" : "text-ink"}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenId(r.id);
                                  setTipOpen(false);
                                }}
                              >
                                <MathText text={r.stemPreview || "(empty question)"} />
                              </button>
                              <span className="xs mono muted truncate">
                                {r.id}
                                {examNames && ` · ${examNames}`}
                                {n !== undefined && ` · ${testsLabel(n)}`}
                                {r.licence && ` · copy of ${r.licence.sourceQuestionId}`}
                                {!lib && !r.hasSolution && <span className="text-warning"> · no solution</span>}
                                {!lib && needsLatexOf(r) > 0 && <span className="text-warning"> · needs LaTeX</span>}
                              </span>
                            </span>
                            <span role="cell" className="sm truncate" title={r.chapters.map((c) => c.name).join(", ")}>
                              {r.chapters.map((c) => c.name).join(", ") || <span className="muted">Untagged</span>}
                            </span>
                            <span role="cell">
                              <span className="badge b-grey">{TYPE_LABEL[r.type] ?? r.type}</span>
                            </span>
                            <span role="cell">
                              <span className={`badge ${lv.cls}`}>{lv.label}</span>
                            </span>
                            {showPubCol ? (
                              <span role="cell" className="min-w-0">
                                <PublishCell row={r} check={publishCheck.data?.[r.id]} />
                              </span>
                            ) : showSourceCol ? (
                              <span role="cell" className="min-w-0">
                                <SourceBadge row={r} label={libLabel} branded={branded} />
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {total > 0 && (
                  <div className="row between border-t border-line-2 px-4 py-3">
                    <span className="xs muted">
                      Showing {fmt((page - 1) * PAGE + 1)}–{fmt(Math.min(total, page * PAGE))} of {fmt(total)}
                      {onLibraryTab ? " library questions" : showSourceCol && sourceTab === "all" ? " · library rows are marked" : ""}
                      {showPubCol && ' · "Blocked" = in a live, upcoming or not-yet-published IIT-PULSE test'}
                    </span>
                    <div className="row gap-1.5">
                      <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Previous
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {open && (
                <aside key={open.id} className="card col fade min-w-0 overflow-hidden" aria-label="Question preview" style={{ flex: "1 0 300px", maxWidth: 380, maxHeight: fillH ?? undefined, overflow: tipOpen ? "visible" : undefined }}>
                  <div className="row between pad gap-1.5 border-b border-line-2">
                    <span className="col min-w-0 gap-px">
                      <span className="mono sm truncate">{open.id}</span>
                      {openIsLib && openRow?.library && (
                        <span className="xs muted truncate">
                          {libLabel} · version {openRow.library.version} · updated {fmtDay(openRow.library.updatedAt)}
                        </span>
                      )}
                      {openIsLib && !openRow?.library && <span className="xs muted truncate">{libLabel}</span>}
                      {openRow?.licence && (
                        <span className="xs muted truncate">
                          {openEnded ? "Licence ended · " : ""}Copy of {openRow.licence.sourceQuestionId} · version {openRow.licence.sourceVersion}
                        </span>
                      )}
                    </span>
                    <div className="row gap-1">
                      {openIsLib || openEnded ? (
                        <LockedEdit
                          tip={openIsLib ? LIBRARY_EDIT_TIP : LICENCE_ENDED_TIP}
                          open={tipOpen}
                          onToggle={() => {
                            setTipOpen((t) => !t);
                            if (url.get("locked")) url.set({ locked: null });
                          }}
                        />
                      ) : (
                        <>
                          <Link href={`/questions/${open.id}/edit?type=${editorKind(open.type)}`} className="btn btn-ghost btn-sm">
                            Edit
                          </Link>
                          <Link href={`/questions/new?type=${editorKind(open.type)}&from=${open.id}`} className="btn btn-ghost btn-sm">
                            Duplicate
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="col pad min-h-0 gap-3 overflow-y-auto">
                    <div className="row wrap gap-1.5">
                      {open.chapters.slice(0, 2).map((c) => (
                        <span key={c.id} className="badge b-grey max-w-full truncate">
                          {c.name}
                        </span>
                      ))}
                      <span className={`badge ${level(open.difficulty).cls}`}>{level(open.difficulty).label}</span>
                      <span className="badge b-grey">{TYPE_LABEL[open.type] ?? open.type}</span>
                      {(open.hasHindi || (full.data && hasHindi(full.data))) && <span className="badge b-sky">EN · हि</span>}
                      {openExams.slice(0, 2).map((e) => (
                        <span key={e.id} className="badge b-grey">
                          {e.name}
                        </span>
                      ))}
                    </div>
                    {full.data ? (
                      <QuestionBody q={full.data} showAnswers variant="pane" />
                    ) : full.isLoading ? (
                      <div className="col gap-2">
                        <span className="skel h-4 w-full" />
                        <span className="skel h-4 w-4/5" />
                        <span className="skel h-9 w-full" />
                        <span className="skel h-9 w-full" />
                      </div>
                    ) : (
                      <p className="m-0 font-serif text-base leading-[1.55]">
                        <MathText text={open.stemPreview} />
                      </p>
                    )}
                    {open.hasSolution && full.data && open.type !== "paragraph" && (
                      <div className="col gap-1.5 rounded-control bg-ground p-3">
                        <span className="eyebrow text-[11px]">{openIsLib ? solutionBy(branded) : "Solution"}</span>
                        {/* AI solutions are plain text with line breaks (contract "Drafts"); keep the lines */}
                        <MathText html as="div" className={`sm [&_img]:max-w-full [&_p]:my-0 ${/<[a-z][^>]*>/i.test(full.data.en?.solution || "") ? "" : "whitespace-pre-line"}`} text={full.data.en?.solution || ""} />
                      </div>
                    )}
                    {!open.hasSolution && !openIsLib && !openEnded && (
                      <div className="ai col gap-2 rounded-[10px] p-3">
                        <span className="ai-mark">
                          <Sparkle size={12} />
                          No solution yet
                        </span>
                        <span className="xs muted">Draft one with AI; it stays a draft until a teacher approves it.</span>
                        <Link href={`/questions/${open.id}/edit?type=${editorKind(open.type)}&assist=solution`} className="btn btn-secondary btn-sm self-start">
                          Draft solution
                        </Link>
                      </div>
                    )}
                    {openIsLib ? (
                      <>
                        <div className="row between xs muted gap-2">
                          <span>
                            {open.hasSolution ? solutionBy(branded) : "No solution yet"}
                            {open.hasSolution && (open.hasHindi || (full.data && hasHindi(full.data))) ? " · EN and हि" : ""}
                          </span>
                          <span>{used(open.id) === undefined ? " " : used(open.id) ? `Used in ${fmt(used(open.id)!)} of your tests` : "Not in your tests yet"}</span>
                        </div>
                        <div className="row wrap gap-2">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPicking({ ids: [open.id], bulk: false })}>
                            Add to a test
                          </button>
                          {openRow?.copied ? (
                            <Link href={`/questions?source=mine&q=${encodeURIComponent(openRow.copied)}`} className="btn btn-primary btn-sm">
                              Open my copy
                            </Link>
                          ) : (
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => setCopyIds({ ids: [open.id], bulk: false })}>
                              Copy to my bank
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {openEnded && <p className="xs muted m-0">{LICENCE_ENDED_TIP}</p>}
                        <label className="row between gap-3 border-t border-line-2 pt-3">
                          <span className="col gap-px">
                            <span className="sm font-semibold">Proofread</span>
                            <span className="xs muted">{open.isProofRead ? "Checked by a teacher" : "Not checked yet"}</span>
                          </span>
                          <Switch checked={open.isProofRead} disabled={savingProof || openEnded} onCheckedChange={(v) => setProofread(open.id, editorKind(open.type), v)} aria-label="Proofread" />
                        </label>
                        <div className="row between xs muted">
                          <span>{used(open.id) === undefined ? " " : used(open.id) ? `Used in ${testsLabel(used(open.id)!)}` : "Not in a test yet"}</span>
                          <span>Edited {dayjs(open.updatedAt).format("D MMM")}</span>
                        </div>
                      </>
                    )}
                  </div>
                </aside>
              )}
            </div>
          </>
        )}

        {showBar && (
          <div className="sticky bottom-5 z-10 row max-w-full animate-toast flex-wrap gap-2.5 self-center rounded-[14px] bg-ink py-2.5 pr-3 pl-[18px] text-white" role="toolbar" aria-label="Bulk actions">
            <span className="sm font-semibold">
              {allMatching
                ? noFilters
                  ? `All ${fmt(total)} questions selected · AI runs and delete only`
                  : `All ${fmt(total)} matching selected`
                : selCount
                  ? allLib
                    ? `${fmt(selCount)} selected · all from the library`
                    : selLib
                      ? `${fmt(selCount)} selected · ${fmt(selLib)} from the library`
                      : `${fmt(selCount)} selected`
                  : `${fmt(bulk.job?.total ?? 0)} questions`}
            </span>
            {offerAll && (
              <button type="button" className={`${ghost} underline`} onClick={() => setAllMatching(true)}>
                Select all {fmt(total)}
              </button>
            )}
            <span className="h-[22px] w-px bg-white/20" />
            {bulk.job ? (
              <BulkJobStatus job={bulk.job} onCancel={bulk.cancel} onClear={clear} />
            ) : selLib > 0 ? (
              // library questions (alone or mixed with own ones): Add to test, and Copy when all are from the library
              <div className="row items-center gap-1">
                <button type="button" className={ghost} onClick={clear}>
                  Clear
                </button>
                <button
                  type="button"
                  className={ghost}
                  onClick={() => setPicking({ ids: [...selected.keys()], bulk: true })}
                  disabled={selCount > 100 || selEnded > 0}
                  title={selEnded ? "Copies whose licence ended can't go into new tests" : selCount > 100 ? "Add to test works on up to 100 questions at a time" : undefined}
                >
                  Add to a test
                </button>
                {allLib ? (
                  <button
                    type="button"
                    className="btn h-[34px] bg-white text-[13px] text-brand hover:bg-white/90"
                    onClick={() => setCopyIds({ ids: [...selected.keys()], bulk: true })}
                    disabled={selCount > 100}
                    title={selCount > 100 ? "Copy up to 100 questions at a time" : undefined}
                  >
                    Copy {fmt(selCount)} to my bank
                  </button>
                ) : (
                  <span className="xs px-2 text-[#B9BCE0]">Pick only library questions to copy them, or only yours for AI and delete</span>
                )}
              </div>
            ) : (
              <div className="row gap-1">
                <button type="button" className={ghost} onClick={() => setPreviewKind("tags")}>
                  <Sparkle />
                  Auto-tag
                </button>
                <button type="button" className={ghost} onClick={() => setPreviewKind("translation")}>
                  <Sparkle />
                  Translate to Hindi
                </button>
                <button type="button" className={ghost} onClick={() => setPreviewKind("solution")}>
                  <Sparkle />
                  Draft solutions
                </button>
                <button
                  type="button"
                  className={ghost}
                  onClick={() => setPicking({ ids: [...selected.keys()], bulk: true })}
                  disabled={!selected.size || allMatching || selCount > 100 || selEnded > 0}
                  title={selEnded ? "Copies whose licence ended can't go into new tests" : allMatching || selCount > 100 ? "Add to test works on up to 100 questions at a time" : undefined}
                >
                  Add to test
                </button>
                <button type="button" className="btn btn-ghost h-[34px] text-[13px] text-[#FFB3B3] hover:bg-white/10 hover:text-white" onClick={askDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
                {canPublish && (
                  <button
                    type="button"
                    className="btn h-[34px] bg-white text-[13px] text-brand hover:bg-white/90"
                    onClick={() => setPublishIds([...selected.keys()])}
                    disabled={allMatching || selCount > 200}
                    title={allMatching || selCount > 200 ? "Publish up to 200 questions at a time" : undefined}
                  >
                    Publish to library…
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <BulkPreviewDialog
        kind={busyJob ? null : previewKind}
        total={selCount}
        selection={selection}
        onClose={() => setPreviewKind(null)}
        onStarted={(job) => {
          setPreviewKind(null);
          bulk.setJob(job);
        }}
      />
      <AddToTest
        ids={picking?.ids ?? []}
        open={!!picking}
        onClose={() => setPicking(null)}
        onDone={() => {
          const fromBulk = picking?.bulk;
          setPicking(null);
          if (fromBulk) clear();
        }}
      />
      <LibraryCopyDialog
        ids={copyIds?.ids ?? []}
        open={!!copyIds}
        onClose={() => setCopyIds(null)}
        subjects={ownSubjects}
        institute={meFull?.tenant?.name ?? null}
        onCopied={(copies) => copied(copies, !!copyIds?.bulk)}
      />
      <LibraryPublishDialog
        ids={publishIds ?? []}
        open={!!publishIds}
        onClose={() => setPublishIds(null)}
        label={libLabel}
        institutes={status?.institutes}
        onPublished={() => {
          setPublishIds(null);
          clear();
        }}
      />
      <DeleteBlockedDialog
        open={!!blocked}
        total={blocked?.total ?? 0}
        blocked={blocked?.blocked ?? []}
        onCancel={() => setBlocked(null)}
        onDelete={() => {
          const list = blocked?.deletable ?? [];
          setBlocked(null);
          runDelete(list);
        }}
      />
    </>
  );
}

/** "E-Q500I": status + first letters of the code, to read out to support. */
function errorCode(e: unknown): string {
  const er = apiError(e);
  const tag = (er.code ?? "NET").split("_").map((w) => w[0]).join("");
  return `E-Q${er.status || 0}${tag}`;
}

/** /questions */
export default function QuestionsPage() {
  return (
    <Suspense>
      <QuestionsBank />
    </Suspense>
  );
}
