"use client";

/*
  Question bank (board: Admin-Questions, canvas v85). Server-side search, filters, tab and chip counts and paging
  (GET /questions/admin/search), "used in N tests" (POST /tests/admin/question-usage), a preview pane, and the bulk bar:
  AI runs with a cost preview (Auto-tag, Translate to Hindi, Draft solutions → /ai/admin/bulk/*), Add to test (with an
  optional section), Delete. "Select all N" selects every question matching the filters (bulk AI runs on the filter).
*/
import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Download, Plus, Search, Trash2 } from "lucide-react";
import { MathText } from "@iitpulse/ui";
import { Topbar } from "@/components/admin/Topbar";
import { QuestionBody } from "@/components/question-body";
import { FilterChip } from "@/components/question-filter-chip";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { AddToTest } from "@/components/questions-admin/add-to-test";
import { BulkJobStatus, BulkPreviewDialog, useBulkJob, type Selection } from "@/components/questions-admin/bulk-ai";
import { Sparkle } from "@/components/questions-admin/parts";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { apiError, editorKind, questionsAdmin, TYPE_LABEL, useQuestionSearch, useQuestionUsage, useReadyDraftCount, type SearchParams } from "@/lib/ai-admin";
import { fetchQuestion, hasHindi, LEVEL, useSubjects } from "@/lib/question-queries";
import type { BankListItem, DraftKind, QuestionFilter, QuestionType } from "@/lib/m5-contract";

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

export default function QuestionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const subjects = useSubjects();
  const drafts = useReadyDraftCount();

  const [tab, setTab] = React.useState<"all" | QuestionType>("all");
  const [search, setSearch] = React.useState("");
  const q = useDebounced(search.trim(), 300);
  const [subjectId, setSubjectId] = React.useState<string | null>(null);
  const [chapterId, setChapterId] = React.useState<string | null>(null);
  const [difficulty, setDifficulty] = React.useState<string | null>(null);
  const [missingSolution, setMissingSolution] = React.useState(false);
  const [untagged, setUntagged] = React.useState(false);
  const [hindiMissing, setHindiMissing] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Map<string, BankListItem>>(new Map());
  const [allMatching, setAllMatching] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<BankListItem[] | null>(null);
  const [savingProof, setSavingProof] = React.useState(false);
  const [previewKind, setPreviewKind] = React.useState<DraftKind | null>(null);
  const [picking, setPicking] = React.useState(false);
  const bulk = useBulkJob();

  const filter = React.useMemo<QuestionFilter>(
    () => ({
      q: q || undefined,
      subjectId: subjectId ?? undefined,
      chapterId: chapterId ?? undefined,
      difficulty: (difficulty as QuestionFilter["difficulty"]) ?? undefined,
      type: tab === "all" ? undefined : tab,
      missingSolution: missingSolution || undefined,
      untagged: untagged || undefined,
      hindiMissing: hindiMissing || undefined,
    }),
    [q, subjectId, chapterId, difficulty, tab, missingSolution, untagged, hindiMissing]
  );
  const params: SearchParams = { ...filter, page, pageSize: PAGE };
  const res = useQuestionSearch(params);
  const data = res.data;
  const rows = React.useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  // A filter change starts again at page 1 and drops "all matching" (it meant the old filter)
  const filterKey = JSON.stringify(filter);
  React.useEffect(() => {
    setPage(1);
    setAllMatching(false);
  }, [filterKey]);

  const usage = useQuestionUsage(rows.map((r) => r.id));
  const used = (id: string) => usage.data?.[id]?.tests;

  const open: BankListItem | null = rows.find((r) => r.id === openId) || (openId && selected.get(openId)) || rows[0] || null;
  const full = useQuery({
    queryKey: ["questions", "one", open?.id],
    enabled: !!open,
    queryFn: () => fetchQuestion(open!.id, editorKind(open!.type)),
    staleTime: 30_000,
  });

  // Filter options (ids: the search filters by id)
  const subjectOptions = React.useMemo(() => (subjects.data ?? []).map((s) => ({ value: s._id, label: s.name })).sort((a, b) => a.label.localeCompare(b.label)), [subjects.data]);
  const chapterOptions = React.useMemo(() => {
    const list = (subjects.data ?? []).filter((s) => !subjectId || s._id === subjectId).flatMap((s) => s.chapters ?? []);
    const seen = new Map<string, string>();
    for (const c of list) {
      const id = (c as { id?: string; _id?: string }).id || (c as { _id?: string })._id;
      if (id && c.name) seen.set(id, c.name);
    }
    return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [subjects.data, subjectId]);

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
  const offerAll = !allMatching && pageIds.length > 0 && pageSel === pageIds.length && total > pageIds.length && !bulk.job;

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

  const deleteQuestions = async () => {
    if (!toDelete) return;
    const gone = new Set<string>();
    for (const r of toDelete) {
      await api.questions.delete(editorKind(r.type), r.id);
      gone.add(r.id);
    }
    setSelected((s) => new Map([...s].filter(([id]) => !gone.has(id))));
    setAllMatching(false);
    qc.invalidateQueries({ queryKey: ["questions"] });
    toast({ title: gone.size === 1 ? "Question deleted" : `${gone.size} questions deleted` });
  };

  /** Every question matching the filters (search pages of 100), for the CSV and for "Delete" on all matching. */
  const allRows = async (): Promise<BankListItem[]> => {
    const out: BankListItem[] = [];
    for (let p = 1; p <= 200; p++) {
      const r = await questionsAdmin.search({ ...filter, page: p, pageSize: 100 });
      out.push(...r.items);
      if (out.length >= r.total || !r.items.length) break;
    }
    return out;
  };

  const exportCsv = async (list?: BankListItem[]) => {
    let items = list;
    try {
      items ??= await allRows();
    } catch (e) {
      toast({ title: "Could not export", description: apiError(e).message, variant: "destructive" });
      return;
    }
    if (!items.length) return;
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
    if (!allMatching) return setToDelete([...selected.values()]);
    try {
      setToDelete(await allRows());
    } catch (e) {
      toast({ title: "Could not load the questions", description: apiError(e).message, variant: "destructive" });
    }
  };

  const newType = tab === "integer" ? "numerical" : tab === "paragraph" ? "paragraph" : tab === "matrix" ? "matrix" : "mcq";
  const counts = data?.counts;
  const showBar = selCount > 0 || !!bulk.job;
  const busyJob = bulk.job && bulk.active;
  const ghost = "btn btn-ghost h-[34px] text-[13px] text-[#D6D8FA] hover:bg-white/10 hover:text-white";

  return (
    <>
      <Topbar
        title="Question bank"
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportCsv()} disabled={!total}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </button>
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
        <div className="underline-tabs overflow-x-auto" role="tablist" aria-label="Question type">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`utab whitespace-nowrap ${tab === t.key ? "on" : ""}`}
              onClick={() => setTab(t.key)}
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
          <FilterChip label="Subject" value={subjectId} options={subjectOptions} onChange={(v) => { setSubjectId(v); setChapterId(null); }} />
          <FilterChip label="Chapter" value={chapterId} options={chapterOptions} onChange={setChapterId} />
          <FilterChip
            label="Difficulty"
            value={difficulty}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
            onChange={setDifficulty}
          />
          <button type="button" className={`chip h-9 ${missingSolution ? "on" : ""}`} aria-pressed={missingSolution} onClick={() => setMissingSolution((v) => !v)}>
            Missing solution · {counts ? fmt(counts.missingSolution) : "…"}
          </button>
          <button type="button" className={`chip h-9 ${untagged ? "on" : ""}`} aria-pressed={untagged} onClick={() => setUntagged((v) => !v)}>
            Untagged · {counts ? fmt(counts.untagged) : "…"}
          </button>
          <button type="button" className={`chip h-9 ${hindiMissing ? "on" : ""}`} aria-pressed={hindiMissing} onClick={() => setHindiMissing((v) => !v)}>
            No Hindi · {counts ? fmt(counts.hindiMissing) : "…"}
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-3.5">
          <div className="card scrollx min-w-0" style={{ flex: "999 1 560px" }}>
            <div role="table" aria-label="Questions" className="min-w-[560px]" aria-busy={res.isFetching}>
              <div role="rowgroup">
                <div role="row" className={`${GRID} border-b-line bg-[#FAFBFD] text-xs font-semibold tracking-[.04em] text-muted uppercase`}>
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
                </div>
              </div>
              <div role="rowgroup" className={res.isFetching && !res.isLoading ? "opacity-70 transition-opacity" : ""}>
                {res.isLoading &&
                  Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className={GRID}>
                      <span className="skel size-[18px]" />
                      <span className="col gap-1.5">
                        <span className="skel h-3.5 w-4/5" />
                        <span className="skel h-3 w-1/3" />
                      </span>
                      <span className="skel h-3.5" />
                      <span className="skel h-5 w-16" />
                      <span className="skel h-5 w-14" />
                    </div>
                  ))}
                {res.isError && <p className="sm muted p-6">{apiError(res.error).code === "NOT_IMPLEMENTED" ? "Search needs the Postgres question bank." : "The question bank could not be loaded. Reload to try again."}</p>}
                {!res.isLoading && !res.isError && !rows.length && (
                  <div className="col items-center gap-1.5 p-12 text-center">
                    <span className="h3">No questions match</span>
                    <span className="sm muted">Clear a filter, or add a question.</span>
                  </div>
                )}
                {rows.map((r) => {
                  const lv = level(r.difficulty);
                  const isOpen = open?.id === r.id;
                  const n = used(r.id);
                  return (
                    <div key={r.id} role="row" className={`${GRID} cursor-pointer transition-colors hover:bg-brand-50 ${isOpen ? "bg-brand-50" : ""}`} onClick={() => setOpenId(r.id)}>
                      <span role="cell" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="check size-[18px]" aria-label={`Select ${r.id}`} checked={allMatching || selected.has(r.id)} onChange={() => toggle(r)} />
                      </span>
                      <span role="cell" className="col min-w-0 gap-[3px]">
                        <button
                          type="button"
                          className="sm block w-full min-w-0 truncate rounded text-left font-serif text-ink"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(r.id);
                          }}
                        >
                          <MathText text={r.stemPreview || "(empty question)"} />
                        </button>
                        <span className="xs mono muted truncate">
                          {r.id}
                          {n !== undefined && ` · ${testsLabel(n)}`}
                          {!r.hasSolution && <span className="text-warning"> · no solution</span>}
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
                    </div>
                  );
                })}
              </div>
            </div>
            {total > 0 && (
              <div className="row between px-4 py-3">
                <span className="xs muted">
                  Showing {fmt((page - 1) * PAGE + 1)}–{fmt(Math.min(total, page * PAGE))} of {fmt(total)}
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
            <aside key={open.id} className="card col fade w-[340px] max-w-full shrink-0 overflow-hidden" aria-label="Question preview" style={{ flex: "0 0 340px" }}>
              <div className="row between pad border-b border-line-2">
                <span className="mono sm truncate">{open.id}</span>
                <div className="row gap-1">
                  <Link href={`/questions/${open.id}/edit?type=${editorKind(open.type)}`} className="btn btn-ghost btn-sm">
                    Edit
                  </Link>
                  <Link href={`/questions/new?type=${editorKind(open.type)}&from=${open.id}`} className="btn btn-ghost btn-sm">
                    Duplicate
                  </Link>
                  <button type="button" className="btn btn-ghost btn-sm btn-icon danger-hover w-8" aria-label="Delete question" title="Delete" onClick={() => setToDelete([open])}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="col pad gap-3">
                <div className="row wrap gap-1.5">
                  {open.chapters.slice(0, 2).map((c) => (
                    <span key={c.id} className="badge b-grey max-w-full truncate">
                      {c.name}
                    </span>
                  ))}
                  <span className={`badge ${level(open.difficulty).cls}`}>{level(open.difficulty).label}</span>
                  <span className="badge b-grey">{TYPE_LABEL[open.type] ?? open.type}</span>
                  {(open.hasHindi || (full.data && hasHindi(full.data))) && <span className="badge b-sky">EN · हि</span>}
                </div>
                {full.data ? (
                  <QuestionBody q={full.data} showAnswers />
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
                    <span className="eyebrow text-[11px]">Solution</span>
                    {/* AI solutions are plain text with line breaks (contract "Drafts"); keep the lines */}
                    <MathText html as="div" className={`sm [&_img]:max-w-full [&_p]:my-0 ${/<[a-z][^>]*>/i.test(full.data.en?.solution || "") ? "" : "whitespace-pre-line"}`} text={full.data.en?.solution || ""} />
                  </div>
                )}
                {!open.hasSolution && (
                  <div className="ai col gap-2 rounded-[10px] p-3">
                    <span className="ai-mark">
                      <Sparkle size={12} />
                      No solution yet
                    </span>
                    <span className="xs muted">Draft one with AI; it stays a draft until a teacher approves it.</span>
                    {open.type === "paragraph" || open.type === "matrix" ? (
                      <span className="xs muted">AI drafts work on single, multiple and numerical questions.</span>
                    ) : (
                      <Link href={`/questions/${open.id}/edit?type=${editorKind(open.type)}&assist=solution`} className="btn btn-secondary btn-sm self-start">
                        Draft solution
                      </Link>
                    )}
                  </div>
                )}
                <label className="row between gap-3 border-t border-line-2 pt-3">
                  <span className="col gap-px">
                    <span className="sm font-semibold">Proofread</span>
                    <span className="xs muted">{open.isProofRead ? "Checked by a teacher" : "Not checked yet"}</span>
                  </span>
                  <Switch checked={open.isProofRead} disabled={savingProof} onCheckedChange={(v) => setProofread(open.id, editorKind(open.type), v)} aria-label="Proofread" />
                </label>
                <div className="row between xs muted">
                  <span>{used(open.id) === undefined ? " " : used(open.id) ? `Used in ${testsLabel(used(open.id)!)}` : "Not in a test yet"}</span>
                  <span>Edited {dayjs(open.updatedAt).format("D MMM")}</span>
                </div>
              </div>
            </aside>
          )}
        </div>

        {showBar && (
          <div className="sticky bottom-5 z-10 row max-w-full animate-toast flex-wrap gap-2.5 self-center rounded-[14px] bg-ink py-2.5 pr-3 pl-[18px] text-white" role="toolbar" aria-label="Bulk actions">
            <span className="sm font-semibold">{allMatching ? `All ${fmt(total)} matching selected` : selCount ? `${fmt(selCount)} selected` : `${fmt(bulk.job?.total ?? 0)} questions`}</span>
            {offerAll && (
              <button type="button" className={`${ghost} underline`} onClick={() => setAllMatching(true)}>
                Select all {fmt(total)}
              </button>
            )}
            <span className="h-[22px] w-px bg-white/20" />
            {bulk.job ? (
              <BulkJobStatus job={bulk.job} onCancel={bulk.cancel} onClear={clear} />
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
                <button type="button" className={ghost} onClick={() => { setAllMatching(false); setPicking(true); }} disabled={!selected.size}>
                  Add to test
                </button>
                <button type="button" className="btn btn-ghost h-[34px] text-[13px] text-[#FFB3B3] hover:bg-white/10 hover:text-white" onClick={askDelete}>
                  Delete
                </button>
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
        ids={[...selected.keys()]}
        open={picking}
        onClose={() => setPicking(false)}
        onDone={() => {
          setPicking(false);
          clear();
        }}
      />
      <DeleteConfirmationDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title={toDelete && toDelete.length > 1 ? `Delete ${toDelete.length} questions` : "Delete question"}
        description={toDelete && toDelete.length > 1 ? "These questions will be removed from the bank." : "This question will be removed from the bank."}
        onConfirm={deleteQuestions}
        requirePassword
      />
    </>
  );
}
