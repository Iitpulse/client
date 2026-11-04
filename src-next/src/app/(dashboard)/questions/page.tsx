"use client";

/*
  Question bank (board: Admin-Questions). Tabs per type with counts, search + filter chips, a selectable list,
  and a preview pane with edit / duplicate / proofread / delete. The board's AI pieces (draft solution,
  auto-tag, translate, bulk AI jobs) and "Add to test" are not here: they have no backend yet.
*/
import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Check, Download, Plus, Search, Trash2 } from "lucide-react";
import { MathText } from "@iitpulse/ui";
import { Topbar } from "@/components/admin/Topbar";
import { QuestionBody } from "@/components/question-body";
import { FilterChip } from "@/components/question-filter-chip";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  hasHindi,
  hasSolution,
  level,
  stemHtml,
  stripHtml,
  subjectName,
  typeLabel,
  useQuestionBank,
  useSubjects,
  type BankQuestion,
  type TypeLabel,
} from "@/lib/question-queries";

const TABS: { key: "all" | TypeLabel; label: string }[] = [
  { key: "all", label: "All" },
  { key: "Single", label: "Single" },
  { key: "Multiple", label: "Multiple" },
  { key: "Numerical", label: "Numerical" },
  { key: "Paragraph", label: "Paragraph" },
  { key: "Matrix", label: "Matrix" },
];
const PAGE = 25;
const GRID = "grid grid-cols-[36px_minmax(0,1fr)_140px_92px_84px] items-center gap-x-3 px-4 py-2.5 border-b border-line-2";

function stemLine(q: BankQuestion): string {
  return stripHtml(stemHtml(q));
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export default function QuestionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const bank = useQuestionBank();
  const subjects = useSubjects();
  const all = React.useMemo(() => bank.data ?? [], [bank.data]);

  const [tab, setTab] = React.useState<"all" | TypeLabel>("all");
  const [search, setSearch] = React.useState("");
  const [subject, setSubject] = React.useState<string | null>(null);
  const [chapter, setChapter] = React.useState<string | null>(null);
  const [topic, setTopic] = React.useState<string | null>(null);
  const [difficulty, setDifficulty] = React.useState<string | null>(null);
  const [missingSolution, setMissingSolution] = React.useState(false);
  const [untagged, setUntagged] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = React.useState<BankQuestion[] | null>(null);
  const [savingProof, setSavingProof] = React.useState(false);

  // Filters other than the type tab and the two toggle chips; counts on tabs and chips follow them.
  const base = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((q) => {
      if (subject && subjectName(q).toLowerCase() !== subject.toLowerCase()) return false;
      if (chapter && !(q.chapters ?? []).some((c) => c.name === chapter)) return false;
      if (topic && !(q.chapters ?? []).some((c) => (c.topics ?? []).includes(topic))) return false;
      if (difficulty && (q.difficulty || "").toLowerCase() !== difficulty) return false;
      if (s) {
        const hay = [q._id, stemLine(q), ...(q.chapters ?? []).flatMap((c) => [c.name, ...(c.topics ?? [])]), ...(q.sources ?? [])]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [all, search, subject, chapter, topic, difficulty]);

  const inTab = React.useMemo(() => (tab === "all" ? base : base.filter((q) => typeLabel(q) === tab)), [base, tab]);
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: base.length };
    for (const q of base) c[typeLabel(q)] = (c[typeLabel(q)] ?? 0) + 1;
    return c;
  }, [base]);
  const missingCount = inTab.filter((q) => !hasSolution(q)).length;
  const untaggedCount = inTab.filter((q) => !(q.chapters ?? []).length).length;
  const rows = React.useMemo(
    () => inTab.filter((q) => (!missingSolution || !hasSolution(q)) && (!untagged || !(q.chapters ?? []).length)),
    [inTab, missingSolution, untagged]
  );

  React.useEffect(() => setPage(0), [tab, search, subject, chapter, topic, difficulty, missingSolution, untagged]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);
  const open = all.find((q) => q._id === openId) ?? pageRows[0] ?? null;

  // Filter options
  const subjectOptions = React.useMemo(() => {
    const names = new Set<string>((subjects.data ?? []).map((s) => s.name));
    for (const q of all) if (subjectName(q)) names.add(subjectName(q));
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [subjects.data, all]);
  const chapterOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const q of all) if (!subject || subjectName(q).toLowerCase() === subject.toLowerCase()) for (const c of q.chapters ?? []) names.add(c.name);
    return [...names].filter(Boolean).sort().map((n) => ({ value: n, label: n }));
  }, [all, subject]);
  const topicOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const q of all) for (const c of q.chapters ?? []) if (c.name === chapter) for (const t of c.topics ?? []) names.add(t);
    return [...names].sort().map((n) => ({ value: n, label: n }));
  }, [all, chapter]);

  const patchCache = (fn: (q: BankQuestion) => BankQuestion | null) =>
    qc.setQueryData<BankQuestion[]>(["questions", "bank"], (old) => (old ?? []).map(fn).filter((q): q is BankQuestion => q !== null));

  const setProofread = async (q: BankQuestion, value: boolean) => {
    setSavingProof(true);
    try {
      await api.questions.update(q._kind, q._id, { isProofRead: value });
      patchCache((x) => (x._id === q._id ? { ...x, isProofRead: value } : x));
    } catch {
      toast({ title: "Could not update proofread status", variant: "destructive" });
    } finally {
      setSavingProof(false);
    }
  };

  const deleteQuestions = async () => {
    if (!toDelete) return;
    const gone = new Set<string>();
    for (const q of toDelete) {
      await api.questions.delete(q._kind, q._id);
      gone.add(q._id);
    }
    patchCache((x) => (gone.has(x._id) ? null : x));
    setSelected((s) => new Set([...s].filter((id) => !gone.has(id))));
    qc.invalidateQueries({ queryKey: ["questions", "totals"] });
    toast({ title: gone.size === 1 ? "Question deleted" : `${gone.size} questions deleted` });
  };

  const exportCsv = (list: BankQuestion[]) => {
    if (!list.length) return;
    const head = ["ID", "Type", "Question", "Subject", "Chapter", "Topics", "Difficulty", "Status", "Uploaded By"];
    const body = list.map((q) => [
      q._id,
      typeLabel(q),
      csvCell(stripHtml(stemHtml(q))),
      csvCell(subjectName(q)),
      csvCell((q.chapters ?? []).map((c) => c.name).join("; ")),
      csvCell((q.chapters ?? []).flatMap((c) => c.topics ?? []).join("; ")),
      q.difficulty || "unset",
      q.isProofRead ? "Proofread" : "Pending",
      q.uploadedBy ? `${q.uploadedBy.userType} (${q.uploadedBy.id})` : "",
    ]);
    const blob = new Blob([[head.join(","), ...body.map((r) => r.join(","))].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `questions_${tab === "all" ? "all" : tab.toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const pageIds = pageRows.map((q) => q._id);
  const pageSel = pageIds.filter((id) => selected.has(id)).length;
  const allState = pageSel === 0 ? "false" : pageSel === pageIds.length ? "true" : "mixed";
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const selectedQs = all.filter((q) => selected.has(q._id));
  const newType = tab === "Numerical" ? "numerical" : tab === "Paragraph" ? "paragraph" : tab === "Matrix" ? "matrix" : "mcq";

  return (
    <>
      <Topbar
        title="Question bank"
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportCsv(rows)} disabled={!rows.length}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </button>
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
              {t.label} <span className="muted num">{bank.isLoading ? "…" : (counts[t.key] ?? 0).toLocaleString("en-IN")}</span>
            </button>
          ))}
        </div>

        <div className="row wrap gap-2">
          <div className="relative w-[300px] max-w-full">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="qs" className="sr-only">
              Search
            </label>
            <input
              id="qs"
              className="input h-9 pl-[34px] text-[13px]"
              placeholder="Search text, ID or tag"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FilterChip label="Subject" value={subject} options={subjectOptions} onChange={(v) => { setSubject(v); setChapter(null); setTopic(null); }} />
          <FilterChip label="Chapter" value={chapter} options={chapterOptions} onChange={(v) => { setChapter(v); setTopic(null); }} />
          {chapter && topicOptions.length > 0 && <FilterChip label="Topic" value={topic} options={topicOptions} onChange={setTopic} />}
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
            Missing solution · {missingCount}
          </button>
          <button type="button" className={`chip h-9 ${untagged ? "on" : ""}`} aria-pressed={untagged} onClick={() => setUntagged((v) => !v)}>
            Untagged · {untaggedCount}
          </button>
        </div>

        <div className="flex flex-wrap items-start gap-3.5">
          <div className="card scrollx min-w-0" style={{ flex: "999 1 560px" }}>
            <div role="table" aria-label="Questions" className="min-w-[560px]">
              <div role="rowgroup">
                <div role="row" className={`${GRID} border-b-line bg-[#FAFBFD] text-xs font-semibold tracking-[.04em] text-muted uppercase`}>
                  <span role="columnheader">
                    <input
                      type="checkbox"
                      className="check size-[18px]"
                      aria-label="Select all on this page"
                      checked={allState === "true"}
                      ref={(el) => { if (el) el.indeterminate = allState === "mixed"; }}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (allState === "true") pageIds.forEach((id) => n.delete(id));
                          else pageIds.forEach((id) => n.add(id));
                          return n;
                        })
                      }
                      disabled={!pageIds.length}
                    />
                  </span>
                  <span role="columnheader">Question</span>
                  <span role="columnheader">Chapter</span>
                  <span role="columnheader">Type</span>
                  <span role="columnheader">Level</span>
                </div>
              </div>
              <div role="rowgroup">
                {bank.isLoading &&
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
                {bank.isError && <p className="sm muted p-6">The question bank could not be loaded. Reload to try again.</p>}
                {!bank.isLoading && !bank.isError && !rows.length && (
                  <div className="col items-center gap-1.5 p-12 text-center">
                    <span className="h3">No questions match</span>
                    <span className="sm muted">Clear a filter, or add a question.</span>
                  </div>
                )}
                {pageRows.map((q) => {
                  const lv = level(q);
                  const isOpen = open?._id === q._id;
                  return (
                    <div
                      key={q._id}
                      role="row"
                      className={`${GRID} cursor-pointer transition-colors hover:bg-brand-50 ${isOpen ? "bg-brand-50" : ""}`}
                      onClick={() => setOpenId(q._id)}
                    >
                      <span role="cell" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="check size-[18px]"
                          aria-label={`Select ${q._id}`}
                          checked={selected.has(q._id)}
                          onChange={() => toggle(q._id)}
                        />
                      </span>
                      <span role="cell" className="col min-w-0 gap-[3px]">
                        <button
                          type="button"
                          className="sm block w-full min-w-0 truncate rounded text-left font-serif text-ink"
                          onClick={(e) => { e.stopPropagation(); setOpenId(q._id); }}
                        >
                          <MathText text={stemLine(q) || "(empty question)"} />
                        </button>
                        <span className="xs mono muted truncate">
                          {q._id}
                          {!hasSolution(q) && <span className="text-warning"> · no solution</span>}
                        </span>
                      </span>
                      <span role="cell" className="sm truncate" title={(q.chapters ?? []).map((c) => c.name).join(", ")}>
                        {(q.chapters ?? []).map((c) => c.name).join(", ") || <span className="muted">Untagged</span>}
                      </span>
                      <span role="cell">
                        <span className="badge b-grey">{typeLabel(q)}</span>
                      </span>
                      <span role="cell">
                        <span className={`badge ${lv.cls}`}>{lv.label}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            {rows.length > 0 && (
              <div className="row between px-4 py-3">
                <span className="xs muted">
                  Showing {page * PAGE + 1}–{Math.min(rows.length, (page + 1) * PAGE)} of {rows.length.toLocaleString("en-IN")}
                </span>
                <div className="row gap-1.5">
                  <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {open && (
            <aside key={open._id} className="card col fade w-[340px] max-w-full shrink-0 overflow-hidden" aria-label="Question preview" style={{ flex: "0 0 340px" }}>
              <div className="row between pad border-b border-line-2">
                <span className="mono sm truncate">{open._id}</span>
                <div className="row gap-1">
                  <Link href={`/questions/${open._id}/edit?type=${open._kind}`} className="btn btn-ghost btn-sm">
                    Edit
                  </Link>
                  <Link href={`/questions/new?type=${open._kind}&from=${open._id}`} className="btn btn-ghost btn-sm">
                    Duplicate
                  </Link>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon danger-hover w-8"
                    aria-label="Delete question"
                    title="Delete"
                    onClick={() => setToDelete([open])}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="col pad gap-3">
                <div className="row wrap gap-1.5">
                  {(open.chapters ?? []).slice(0, 2).map((c) => (
                    <span key={c.name} className="badge b-grey max-w-full truncate">
                      {c.name}
                    </span>
                  ))}
                  <span className={`badge ${level(open).cls}`}>{level(open).label}</span>
                  <span className="badge b-grey">{typeLabel(open)}</span>
                  {hasHindi(open) && <span className="badge b-sky">EN · हि</span>}
                </div>
                <QuestionBody q={open} showAnswers />
                {hasSolution(open) && open._kind !== "paragraph" ? (
                  <div className="col gap-1.5 rounded-control bg-ground p-3">
                    <span className="eyebrow text-[11px]">Solution</span>
                    <MathText html as="div" className="sm [&_img]:max-w-full [&_p]:my-0" text={open.en?.solution || ""} />
                  </div>
                ) : (
                  !hasSolution(open) && <span className="xs text-warning">No solution yet</span>
                )}
                <label className="row between gap-3 border-t border-line-2 pt-3">
                  <span className="col gap-px">
                    <span className="sm font-semibold">Proofread</span>
                    <span className="xs muted">{open.isProofRead ? "Checked by a teacher" : "Not checked yet"}</span>
                  </span>
                  <Switch checked={!!open.isProofRead} disabled={savingProof} onCheckedChange={(v) => setProofread(open, v)} aria-label="Proofread" />
                </label>
                <div className="row between xs muted">
                  <span>{subjectName(open) || "No subject"}</span>
                  {open.modifiedAt && <span>Edited {dayjs(open.modifiedAt).format("D MMM YYYY")}</span>}
                </div>
              </div>
            </aside>
          )}
        </div>

        {selected.size > 0 && (
          <div className="sticky bottom-5 z-10 row animate-toast gap-2.5 self-center rounded-[14px] bg-ink py-2.5 pr-3 pl-[18px] text-white" role="toolbar" aria-label="Bulk actions">
            <span className="sm font-semibold">{selected.size} selected</span>
            <span className="h-[22px] w-px bg-white/20" />
            <button type="button" className="btn btn-ghost h-[34px] text-[#D6D8FA] hover:bg-white/10 hover:text-white" onClick={() => exportCsv(selectedQs)}>
              <Download className="size-4" aria-hidden />
              Export CSV
            </button>
            <button type="button" className="btn btn-ghost h-[34px] text-[#FFB3B3] hover:bg-white/10 hover:text-white" onClick={() => setToDelete(selectedQs)}>
              <Trash2 className="size-4" aria-hidden />
              Delete
            </button>
            <button type="button" className="btn btn-ghost h-[34px] text-[#D6D8FA] hover:bg-white/10 hover:text-white" onClick={() => setSelected(new Set())}>
              <Check className="size-4" aria-hidden />
              Done
            </button>
          </div>
        )}
      </main>

      <DeleteConfirmationDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title={toDelete && toDelete.length > 1 ? `Delete ${toDelete.length} questions` : "Delete question"}
        description={
          toDelete && toDelete.length > 1
            ? "These questions will be removed from the bank."
            : "This question will be removed from the bank."
        }
        onConfirm={deleteQuestions}
        requirePassword
      />
    </>
  );
}
