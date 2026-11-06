"use client";
/*
  Admin-QuestionPicker (board: a page, "← <test> · Pick questions · Done", opened from the TestBuilder per
  sub-section). Route: /tests/[testId]/pick?sub=<subsectionId> (use `pickerHref`). Filters stay in the address.

  Props:
    testId      the test whose paper is edited
    backHref    where "← <test name>" and "Done" go (default /tests/<id>/edit, the builder)

  Board states: ready (pick by hand, preview, selection bar), over-fill (selection > free slots: "Add first N, skip M"),
  fill-by-rule, loading, empty-bank, no-match, error, locked (someone started: look only), plus no-permission (403),
  test not found, and "someone else changed this paper" (409 PAPER_CHANGED → reload). Section types: single,
  multiple, integer, paragraph (sets stay together, "Add set", "This section takes sets of 3"), matrix.
  Every write is a sub-section PUT with the paper's revision; the toast's Undo restores `previousRevision` (6 s).
  Questions whose equation is an image are added with a warning, never blocked. Kit: FilterBar/FilterChip/
  ToggleChip/SearchBox, Segmented, DataTable/Pagination/BulkBar, Banner, notify, page states.
*/
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import {
  Banner,
  BulkBar,
  CheckBox,
  DataTable,
  EmptyState,
  FilterBar,
  FilterChip,
  NoAccess,
  NotFoundState,
  PageError,
  Pagination,
  SearchBox,
  Segmented,
  StateBox,
  ToggleChip,
  notify,
  type Column,
} from "@/components/kit";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PickerRow, PickerSearchRequest } from "@/lib/m6-contract";
import { apiError, errCode, useM6Source } from "@/lib/m6/client";
import {
  REJECT_COPY,
  TYPE_NAME,
  blockedCopy,
  markingShort,
  paperKey,
  putSubsection,
  restorePaper,
  slotNumbers,
  usePaper,
  usePaperTestHead,
  usePickerSearch,
  useSetPaper,
} from "@/lib/m6/paper";
import { istDate, useM6Subjects } from "@/lib/m6/shared";
import { FillByRule } from "./FillByRule";
import { PickedPanel } from "./PickedPanel";
import { DIFF_LABEL, PreviewPane, shortId, Stem, type PaperSection, type PaperSub } from "./parts";
import "./picker.css";

export function pickerHref(testId: string, subsectionId?: string | null): string {
  return `/tests/${encodeURIComponent(testId)}/pick${subsectionId ? `?sub=${encodeURIComponent(subsectionId)}` : ""}`;
}

const STATE_BADGE: Record<string, [string, string]> = { draft: ["b-sky", "Draft"], scheduled: ["b-navy", "Scheduled"], live: ["b-live", "Live"], ended: ["b-grey", "Ended"] };
const SORTS = [
  { value: "leastUsed", label: "Least used first" },
  { value: "newest", label: "Newest first" },
  { value: "difficulty", label: "Easiest first" },
];
const LETTER = (i: number) => String.fromCharCode(65 + i);
/** "A · Single correct" (names that already say "Section A …" keep theirs) */
const subLabel = (i: number, name: string) => (/^section\b/i.test(name) ? name : `${LETTER(i)} · ${name}`);
const PAGE = 10;

/** "Physics · A Single correct" */
function subTitle(sec: PaperSection, i: number, sub: PaperSub) {
  return `${sec.subject?.name ?? sec.name} · ${/^section\b/i.test(sub.name) ? sub.name : `${LETTER(i)} ${sub.name}`}`;
}
/** "+4 / −1 · 20 questions" / "2 sets of 3 · +4 / −1 each" */
function subRule(sub: PaperSub) {
  if (sub.type === "paragraph" && sub.paragraph) {
    const sets = Math.floor(sub.need / sub.paragraph.setSize);
    return `${sets} ${sets === 1 ? "set" : "sets"} of ${sub.paragraph.setSize} · ${markingShort(sub.marking)} each`;
  }
  return `${markingShort(sub.marking)} · ${sub.need} ${sub.need === 1 ? "question" : "questions"}`;
}
function typeChip(sub: PaperSub) {
  if (sub.type === "paragraph" && sub.paragraph)
    return `Paragraph · sets of ${sub.paragraph.setSize}${sub.paragraph.childType !== "mixed" ? ` · ${TYPE_NAME[sub.paragraph.childType].toLowerCase()}` : ""}`;
  return TYPE_NAME[sub.type];
}
function isForbidden(e: unknown) {
  const x = apiError(e);
  return x.status === 403 && (x.code === "FORBIDDEN" || x.code === "STAFF_ONLY");
}
function lastUsedLabel(r: PickerRow): string {
  if (r.inThisTest) return "In this test";
  if (r.lastUsed) return `${r.lastUsed.shortName ?? r.lastUsed.name} · ${istDate(r.lastUsed.at)}`;
  return "Never";
}

export function QuestionPicker({ testId, backHref }: { testId: string; backHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const back = backHref ?? `/tests/${encodeURIComponent(testId)}/edit`;
  const sample = useM6Source("paper", "picker", "tests") === "sample";

  const head = usePaperTestHead(testId);
  const paper = usePaper(testId);
  const setPaper = useSetPaper(testId);
  const subjects = useM6Subjects();

  /* ── address state ── */
  const param = (k: string) => sp.get(k) ?? "";
  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [sp, pathname, router]
  );

  const flat = useMemo(() => {
    const out: Array<{ sec: PaperSection; sub: PaperSub; i: number; start: number }> = [];
    let n = 1;
    for (const sec of paper.data?.sections ?? [])
      sec.subsections.forEach((sub, i) => {
        // first empty number: after this sub-section's last slot (the API numbers filled slots one after another)
        const last = sub.slots[sub.slots.length - 1];
        const start = last ? last.n + last.count : n;
        out.push({ sec, sub, i, start });
        n = start;
      });
    return out;
  }, [paper.data]);
  const cur = flat.find((x) => x.sub.id === param("sub")) ?? flat.find((x) => x.sub.have < x.sub.need) ?? flat[0];
  const sub = cur?.sub;
  // keep the opened sub-section in the address, so it stays put when it fills up
  useEffect(() => {
    if (cur && !param("sub")) setParams({ sub: cur.sub.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.sub.id]);
  const isSet = sub?.type === "paragraph";
  const setSize = sub?.paragraph?.setSize ?? 1;
  const slotsLeft = sub ? Math.max(0, sub.need - sub.have) : 0;
  const full = !!sub && slotsLeft < (isSet ? setSize : 1);
  const locked = !!head.data?.locked;
  const mode = param("mode") === "auto" ? "auto" : "hand";

  const q = param("q");
  const chapterId = param("ch");
  const topicId = param("tp");
  const difficulty = param("d") as NonNullable<PickerSearchRequest["difficulty"]> | "";
  const recentOn = param("recent") !== "0";
  const solOn = param("sol") === "1";
  const hiOn = param("hi") === "1";
  const sort = (param("sort") || "leastUsed") as NonNullable<PickerSearchRequest["sort"]>;
  const page = Math.max(1, parseInt(param("page") || "1", 10) || 1);

  const subject = subjects.data?.find((s) => (cur?.sec.subject?.id && s.id === cur.sec.subject.id) || s.name === cur?.sec.subject?.name);
  const chapters = subject?.chapters ?? [];
  const chapter = chapters.find((c) => c.id === chapterId);
  const topics = (chapter ? chapter.topics : chapters.flatMap((c) => c.topics)).filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i);

  const req: PickerSearchRequest | null = sub
    ? {
        subsectionId: sub.id,
        q: q || undefined,
        chapterIds: chapterId ? [chapterId] : undefined,
        topicIds: topicId ? [topicId] : undefined,
        difficulty: difficulty || undefined,
        notInLastTests: recentOn ? 4 : null,
        hasSolution: solOn || undefined,
        hasHindi: hiOn || undefined,
        sort,
        page,
        pageSize: PAGE,
      }
    : null;
  const search = usePickerSearch(testId, mode === "hand" ? req : null);
  const rows = search.data?.items;
  const list = rows ?? [];
  const filterCount = [chapterId, topicId, difficulty, recentOn ? "r" : "", solOn ? "s" : "", hiOn ? "h" : ""].filter(Boolean).length;
  const narrowed = !!(q || chapterId || topicId || difficulty || solOn || hiOn) || (search.data?.hiddenRecent ?? 0) > 0;

  /* ── selection and preview ── */
  const [sel, setSel] = useState<string[]>([]);
  const [pv, setPv] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  useEffect(() => {
    setSel([]);
    setPv(null);
  }, [sub?.id]);
  useEffect(() => {
    if (!list.length) return;
    if (!pv || !list.some((r) => r.questionId === pv)) setPv((list.find((r) => !r.inThisTest && !r.blockedReason) ?? list.find((r) => !r.inThisTest) ?? list[0]).questionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.data]);
  const tableRef = useRef<HTMLDivElement>(null);

  /* ── writes ── */
  const write = async (ids: string[], done: string, warn?: string) => {
    if (!sub || !paper.data) return;
    setBusy(true);
    try {
      const r = await putSubsection(testId, sub.id, ids, paper.data.revision);
      setPaper(r.paper);
      setSel([]);
      setChanged(false);
      if (r.rejected.length)
        notify.error(r.rejected.length === 1 ? "1 question wasn't added" : `${r.rejected.length} questions weren't added`, {
          description: r.rejected.map((x) => `${shortId(x.questionId)} ${REJECT_COPY[x.reason] ?? x.reason}`).join(" · "),
        });
      notify.undo(
        done,
        () =>
          restorePaper(testId, r.previousRevision).then(
            (x) => setPaper(x.paper),
            (e) => notify.error("Couldn't undo", { description: apiError(e).message })
          ),
        warn ? { description: warn } : undefined
      );
    } catch (e) {
      const code = errCode(e);
      if (code === "PAPER_CHANGED") {
        setChanged(true);
        qc.invalidateQueries({ queryKey: paperKey(testId) });
      } else if (code === "TEST_LOCKED") {
        qc.invalidateQueries({ queryKey: ["m6", "paper-test", testId] });
        notify.error("Students have started this test", { description: "Its questions can't change any more." });
      } else notify.error("Couldn't save", { description: apiError(e).message });
    } finally {
      setBusy(false);
    }
  };
  const current = sub?.slots.map((s) => s.questionId) ?? [];
  const imageWarn = (picked: PickerRow[]) => {
    const n = picked.filter((r) => r.flags.needsLatex > 0).length;
    return n ? `${n === 1 ? "Its equation is an image" : `${n} have an equation image`}: students see the picture until someone types the LaTeX.` : undefined;
  };
  const add = (r: PickerRow) => write([...current, r.questionId], isSet ? `Added set ${shortId(r.questionId)} as Set ${sub!.slots.length + 1}` : `Added ${shortId(r.questionId)}`, imageWarn([r]));
  const addSelected = () => {
    const take = sel.slice(0, slotsLeft);
    const picked = list.filter((r) => take.includes(r.questionId));
    write([...current, ...take], take.length === 1 ? `Added ${shortId(take[0])}` : `Added ${take.length} questions`, imageWarn(picked));
  };
  const remove = (id: string) => {
    const slot = sub?.slots.find((s) => s.questionId === id);
    write(current.filter((x) => x !== id), slot ? `Removed ${isSet ? `Set ${sub!.slots.indexOf(slot) + 1}` : slotNumbers(slot.n, slot.count)}` : "Removed");
  };
  const replace = (oldId: string, r: PickerRow) => {
    const slot = sub?.slots.find((s) => s.questionId === oldId);
    write(current.map((x) => (x === oldId ? r.questionId : x)), `Replaced ${slot ? slotNumbers(slot.n, slot.count) : shortId(oldId)} with ${shortId(r.questionId)}`, imageWarn([r]));
  };
  const move = (from: number, to: number) => {
    const ids = [...current];
    const [x] = ids.splice(from, 1);
    ids.splice(to, 0, x);
    write(ids, isSet ? `Moved Set ${from + 1} to Set ${to + 1}` : `Moved Q${sub!.slots[from].n} to Q${sub!.slots[to].n}`);
  };

  const canTick = (r: PickerRow) => !isSet && !r.inThisTest && !locked && (r.blockedReason === null || r.blockedReason === "SUBSECTION_FULL");
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  /* ── keyboard on the table: ↑ ↓ move the preview, Space ticks ── */
  const onTableKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const tr = (e.target as HTMLElement).closest("tbody tr") as HTMLTableRowElement | null;
    if (!tr || e.target !== tr) return;
    const trs = Array.from(tableRef.current?.querySelectorAll("tbody tr") ?? []);
    const i = trs.indexOf(tr);
    const r = list[i];
    if (!r) return;
    const go = (j: number) => {
      if (!list[j]) return;
      e.preventDefault();
      setPv(list[j].questionId);
      (trs[j] as HTMLElement).focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === " " && canTick(r)) {
      e.preventDefault();
      toggle(r.questionId);
    }
  };

  /* ── page-level states ── */
  const headErr = head.error ?? paper.error;
  const shell = (body: ReactNode) => (
    <>
      <Topbar title="Pick questions" back={{ href: "/tests", label: "Tests" }} />
      <main className="px-7 pt-5 pb-10">{body}</main>
    </>
  );
  if (headErr && isForbidden(headErr)) return shell(<NoAccess what="this test's questions" />);
  if (headErr && errCode(headErr) === "TEST_NOT_FOUND") return shell(<NotFoundState deleted="This test doesn't exist or was deleted" />);

  const badge = head.data ? STATE_BADGE[head.data.state] : null;
  const overFill = sel.length > slotsLeft;
  const hidden = search.data?.hiddenRecent ?? 0;
  const where = chapter?.name ?? cur?.sec.subject?.name ?? "this subject";
  const total = search.data?.pageInfo.total ?? 0;
  const countLabel = isSet
    ? `${total} ${total === 1 ? "set" : "sets"} in ${where}${hidden ? ` · ${hidden} hidden: used in the last 4 tests` : ""}`
    : sub?.type === "matrix"
      ? `${total} matrix ${total === 1 ? "question" : "questions"} · ${hidden} hidden`
      : `${list.length} of ${total.toLocaleString("en-IN")} shown${hidden ? ` · ${hidden} hidden: used in the last 4 tests` : ""}`;

  const columns: Array<Column<PickerRow>> = sub
    ? [
        {
          key: "tick",
          header: <span className="sr-only">Select</span>,
          width: 44,
          tdClass: "chk",
          render: (r) => {
            const on = sel.includes(r.questionId);
            const can = canTick(r);
            return (
              <span onClick={(e) => e.stopPropagation()}>
                <label className={`k-check ${can ? "" : "disabled"}`} style={{ minHeight: 0 }}>
                  <input type="checkbox" checked={on} disabled={!can} aria-label={`Select ${shortId(r.questionId)}`} onChange={() => toggle(r.questionId)} />
                  <CheckBox on={on} disabled={!can} />
                </label>
              </span>
            );
          },
        },
        { key: "id", header: "ID", width: 92, tdClass: "idc", render: (r) => <span title={r.questionId}>{shortId(r.questionId)}</span> },
        { key: "q", header: isSet ? "Passage" : "Question", render: (r) => <RowStem r={r} sub={sub} isSet={isSet} /> },
        { key: "d", header: "Difficulty", width: 92, render: (r) => <span className="sm">{DIFF_LABEL[r.difficulty ?? "unset"]}</span> },
        { key: "used", header: "Last used", width: 130, tablet: "hide", render: (r) => <span className="sm muted">{lastUsedLabel(r)}</span> },
        {
          key: "act",
          header: <span className="sr-only">Action</span>,
          width: 120,
          render: (r) => (
            <span onClick={(e) => e.stopPropagation()}>
              <RowAction r={r} sub={sub} isSet={isSet} locked={locked} busy={busy} full={full} onAdd={() => add(r)} onRemove={() => remove(r.questionId)} onReplace={(oldId) => replace(oldId, r)} />
            </span>
          ),
        },
      ]
    : [];

  return (
    <>
      <Topbar
        title="Pick questions"
        back={{ href: back, label: head.data?.name ?? "Test" }}
        badge={
          <>
            {badge && <span className={`badge ${badge[0]}`}>{badge[1]}</span>}
            {sample && (
              <span className="badge b-amber" title="This backend doesn't have these routes yet. The page shows sample data; changes last until you reload.">
                Sample data
              </span>
            )}
          </>
        }
        actions={
          <>
            {paper.data && (
              <span className="xs muted num hide-sm">
                {paper.data.filled} of {paper.data.needed} picked
              </span>
            )}
            <Link href={back} className="btn btn-primary btn-sm">
              Done
            </Link>
          </>
        }
      />
      <main className="col gap-3.5 px-7 pt-[18px] pb-12">
        {locked && (
          <Banner
            tone="warn"
            title="Students have started this test, so its questions can't change."
            action={
              head.data?.state === "live" ? (
                <Link href={`/tests/${encodeURIComponent(testId)}/monitor`} className="btn btn-secondary btn-sm">
                  Watch it live
                </Link>
              ) : undefined
            }
          >
            You can still look through them.
          </Banner>
        )}
        {changed && (
          <Banner
            tone="block"
            title="Someone else changed this paper."
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChanged(false)}>
                OK
              </button>
            }
          >
            It has been reloaded; check the list on the right and try again.
          </Banner>
        )}

        {paper.isError ? (
          <PageError what="this test's paper" code={apiError(paper.error).code ?? undefined} onRetry={() => paper.refetch()} body="Check your connection and try again." />
        ) : (
          <>
            <nav className="qp-tally" aria-label="Sections of this test">
              {paper.isLoading &&
                Array.from({ length: 4 }, (_, i) => (
                  <span key={i} className="qp-tl" aria-hidden>
                    <span className="skel block h-3 w-24" />
                    <span className="skel block h-1 w-full" />
                    <span className="skel block h-2.5 w-14" />
                  </span>
                ))}
              {flat.map(({ sec, sub: s, i }) => {
                const on = s.id === sub?.id;
                const pct = Math.min(100, Math.round((100 * s.have) / Math.max(1, s.need)));
                return (
                  <button key={s.id} type="button" className={`qp-tl ${on ? "on" : ""}`} aria-current={on ? "true" : undefined} onClick={() => setParams({ sub: s.id, ch: null, tp: null, q: null })}>
                    <span className="row between gap-2.5">
                      <span className="xs font-semibold">{subLabel(i, s.name)}</span>
                      <span className={`n ${s.have >= s.need ? "full" : "short"}`}>
                        {s.have} / {s.need}
                      </span>
                    </span>
                    <span className="bar">
                      <i style={{ width: `${pct}%`, animation: "none" }} />
                    </span>
                    <span className="xs muted">{s.type === "paragraph" && s.paragraph ? `${Math.floor(s.need / s.paragraph.setSize)} sets of ${s.paragraph.setSize}` : sec.subject?.name ?? sec.name}</span>
                  </button>
                );
              })}
            </nav>

            {sub && cur && (
              <div className="qp-body">
                <section className="col qp-list" id="list" aria-label="Questions to pick from">
                  <div className="row between wrap gap-2.5">
                    <Segmented
                      ariaLabel="How to pick"
                      value={mode}
                      onChange={(v) => setParams({ mode: v === "auto" ? "auto" : null })}
                      options={[
                        { value: "hand", label: "Pick by hand" },
                        { value: "auto", label: "Fill by rule" },
                      ]}
                    />
                    {mode === "hand" && (
                      <FilterChip label="Sort" noun="order" clearable={false} options={SORTS} value={sort} onChange={(v) => setParams({ sort: !v || v === "leastUsed" ? null : v })} />
                    )}
                  </div>

                  {mode === "hand" ? (
                    <>
                      <FilterBar
                        activeCount={filterCount}
                        onClearAll={() => setParams({ ch: null, tp: null, d: null, recent: "0", sol: null, hi: null })}
                        search={<SearchBox value={q} onChange={(v) => setParams({ q: v })} placeholder="Words, formula or ID" label="Search questions" width={240} id="pq" />}
                      >
                        <span className="k-fc qp-lock" title="Set by the pattern">
                          <Lock className="size-3" aria-hidden />
                          <span className="k">Type:</span>
                          <b>{typeChip(sub)}</b>
                        </span>
                        <FilterChip label="Chapter" noun="chapter" options={chapters.map((c) => ({ value: c.id, label: c.name }))} value={chapterId || null} onChange={(v) => setParams({ ch: v, tp: null })} />
                        <FilterChip label="Topic" noun="topic" options={topics.map((t) => ({ value: t.id, label: t.name }))} value={topicId || null} onChange={(v) => setParams({ tp: v })} />
                        <FilterChip
                          label="Difficulty"
                          noun="difficulty"
                          anyLabel="Any difficulty"
                          options={(["easy", "medium", "hard", "unset"] as const).map((d) => ({ value: d, label: DIFF_LABEL[d] }))}
                          value={difficulty || null}
                          onChange={(v) => setParams({ d: v })}
                        />
                        <ToggleChip on={recentOn} onChange={(v) => setParams({ recent: v ? null : "0" })}>
                          Not in the last 4 tests
                        </ToggleChip>
                        <ToggleChip on={solOn} onChange={(v) => setParams({ sol: v ? "1" : null })}>
                          Has solution
                        </ToggleChip>
                        <ToggleChip on={hiOn} onChange={(v) => setParams({ hi: v ? "1" : null })}>
                          Has Hindi
                        </ToggleChip>
                      </FilterBar>

                      {search.isError && isForbidden(search.error) ? (
                        <section className="card">
                          <StateBox title="You can't pick questions for this test" body="Your role can look at tests but not change their questions. An admin at your institute can give you access." />
                        </section>
                      ) : (
                        <div ref={tableRef} onKeyDown={onTableKey}>
                          <DataTable<PickerRow>
                            ariaLabel={`Questions for ${subTitle(cur.sec, cur.i, sub)}`}
                            columns={columns}
                            rows={rows}
                            rowKey={(r) => r.questionId}
                            status={search.isError ? "error" : !search.data || paper.isLoading ? "loading" : "ready"}
                            skeletonRows={3}
                            minWidth={640}
                            scrollX
                            onRowClick={(r) => setPv(r.questionId)}
                            rowClass={(r) =>
                              r.inThisTest
                                ? "qp-in"
                                : sel.includes(r.questionId)
                                  ? "sel"
                                  : r.blockedReason === "WRONG_SET_SIZE" || r.blockedReason === "WRONG_CHILD_TYPE"
                                    ? "qp-off"
                                    : pv === r.questionId
                                      ? "qp-pv"
                                      : undefined
                            }
                            filtered={narrowed}
                            empty={
                              <StateBox
                                doodle={<Doodle />}
                                title={`No ${isSet ? "paragraph sets" : `${typeChip(sub).toLowerCase()} questions`} in ${where} yet`}
                                body={isSet ? "Write one in the editor, or import a paper; passages and their questions come in together." : "Write some in the editor, or import a paper."}
                                action={
                                  <>
                                    <Link href="/questions/bulk-upload" className="btn btn-secondary">
                                      Import a paper
                                    </Link>
                                    <Link href="/questions/new" className="btn btn-primary">
                                      {isSet ? "Write a paragraph set" : "Write a question"}
                                    </Link>
                                  </>
                                }
                              />
                            }
                            noMatch={
                              <StateBox
                                title={q ? `No questions match "${q}"` : "No questions match these filters"}
                                body={`in ${where}, ${typeChip(sub).toLowerCase()}${recentOn ? ", not in the last 4 tests" : ""}`}
                                action={
                                  <>
                                    <button type="button" className="btn btn-secondary" onClick={() => setParams({ ch: null, tp: null, d: null, sol: null, hi: null, q: null })}>
                                      Clear filters
                                    </button>
                                    {recentOn && hidden > 0 && (
                                      <button type="button" className="btn btn-ghost" onClick={() => setParams({ recent: "0" })}>
                                        Include recently used
                                      </button>
                                    )}
                                  </>
                                }
                              />
                            }
                            error={{
                              title: "Couldn't load questions",
                              body: "Check your connection and try again. If it keeps happening, share this code with support.",
                              code: apiError(search.error).code ?? `E-${apiError(search.error).status || "NET"}`,
                              onRetry: () => search.refetch(),
                            }}
                            footer={
                              search.data && list.length > 0 ? (
                                <>
                                  <PreviewPane testId={testId} questionId={pv} type={list.find((r) => r.questionId === pv)?.type} hint="↑ ↓ move between rows · Space ticks" />
                                  {total > PAGE ? (
                                    <Pagination page={page} pageSize={PAGE} total={total} onPage={(p) => setParams({ page: String(p) })} extra={hidden ? <span className="xs muted">{hidden} hidden: used in the last 4 tests</span> : undefined} />
                                  ) : (
                                    <div className="row between wrap gap-2.5 border-t border-[#EEF0F5] px-3.5 py-2.5">
                                      <span className="xs muted num">{countLabel}</span>
                                      <span className="xs muted hide-sm">Pick by hand or with Space · filters stay in the address</span>
                                    </div>
                                  )}
                                </>
                              ) : undefined
                            }
                          />
                        </div>
                      )}
                      {!isSet && !locked && (
                        <BulkBar count={sel.length} onClear={() => setSel([])}>
                          <span className="sm" style={{ color: "#FFD9A0" }}>
                            {overFill ? `Only ${slotsLeft} ${slotsLeft === 1 ? "slot" : "slots"} left` : `${slotsLeft} ${slotsLeft === 1 ? "slot" : "slots"} left`}
                          </span>
                          <button type="button" className="btn btn-ghost font-semibold" style={{ color: "#fff" }} disabled={busy || slotsLeft === 0} onClick={addSelected}>
                            {slotsLeft === 0 ? "Section is full" : overFill ? `Add first ${slotsLeft}, skip ${sel.length - slotsLeft}` : `Add ${sel.length}`}
                          </button>
                        </BulkBar>
                      )}
                    </>
                  ) : (
                    <FillByRule
                      key={sub.id}
                      testId={testId}
                      sub={sub}
                      start={cur.start}
                      title={subTitle(cur.sec, cur.i, sub)}
                      chapters={chapters}
                      initialChapterId={chapterId || null}
                      locked={locked}
                      onCancel={() => setParams({ mode: null })}
                      onCommit={async (ids) => {
                        await write([...current, ...ids], `Filled ${ids.length} ${isSet ? (ids.length === 1 ? "set" : "sets") : ids.length === 1 ? "slot" : "slots"} by rule`);
                        setParams({ mode: null });
                      }}
                    />
                  )}
                </section>

                <aside className="col qp-side">
                  <PickedPanel
                    sub={sub}
                    start={cur.start}
                    title={subTitle(cur.sec, cur.i, sub)}
                    rule={subRule(sub)}
                    locked={locked}
                    busy={busy}
                    overFill={overFill && mode === "hand"}
                    onRemove={remove}
                    onMove={move}
                  />
                </aside>
              </div>
            )}
            {paper.data && !flat.length && (
              <EmptyState
                title="This test has no sections"
                body="Its pattern has no sub-sections to fill. Pick another pattern in the builder."
                actions={
                  <Link href={back} className="btn btn-secondary btn-sm">
                    Back to the builder
                  </Link>
                }
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

function Doodle() {
  return (
    <svg className="qp-doodle" width="84" height="60" viewBox="0 0 84 60" aria-hidden>
      <path d="M14 10h40v44H14z" />
      <path d="M22 22h24M22 30h24M22 38h14" />
      <circle cx="62" cy="40" r="10" />
      <path d="m69 47 8 8" />
    </svg>
  );
}

function RowStem({ r, sub, isSet }: { r: PickerRow; sub: PaperSub; isSet: boolean }) {
  const inHere = r.inThisTest?.subsectionId === sub.id;
  const wrong = r.blockedReason === "WRONG_SET_SIZE" || r.blockedReason === "WRONG_CHILD_TYPE";
  const bad = blockedCopy(wrong ? r.blockedReason : null, sub.paragraph?.setSize, sub.paragraph?.childType);
  const setNo = inHere ? sub.slots.findIndex((s) => s.questionId === r.questionId) + 1 : 0;
  const setLabel = r.set
    ? `${r.set.count} questions${r.set.childTypes.length ? ` · ${r.set.childTypes.map((t) => (t === "integer" ? "Numerical" : t[0].toUpperCase() + t.slice(1))).join(", ")}` : ""}`
    : null;
  return (
    <span className="col min-w-0 gap-1">
      <Stem text={r.stemPreview} />
      <span className="row wrap gap-1.5">
        {setLabel && <span className="badge b-navy">{setLabel}</span>}
        {r.inThisTest && <span className="badge b-green">{inHere && isSet ? `In this test · Set ${setNo}` : `In this test · Q${r.inThisTest.n}`}</span>}
        {r.recentTest && <span className="badge b-grey">Used in {r.recentTest.shortName ?? r.recentTest.name}</span>}
        {r.flags.needsLatex > 0 && (
          <span className="badge b-amber" title="Can be added. Students see the picture until someone types the LaTeX.">
            Equation is an image
          </span>
        )}
        {!r.flags.hasSolution && <span className="badge b-grey">No solution</span>}
        {!r.flags.hasHindi && <span className="badge b-grey">No Hindi</span>}
        {bad && (
          <span className="xs font-semibold" style={{ color: "#9A5800" }}>
            {bad}
          </span>
        )}
      </span>
    </span>
  );
}

function RowAction({
  r,
  sub,
  isSet,
  locked,
  busy,
  full,
  onAdd,
  onRemove,
  onReplace,
}: {
  r: PickerRow;
  sub: PaperSub;
  isSet: boolean;
  locked: boolean;
  busy: boolean;
  full: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onReplace: (oldId: string) => void;
}) {
  const wrong = r.blockedReason === "WRONG_SET_SIZE" || r.blockedReason === "WRONG_CHILD_TYPE";
  const bad = blockedCopy(wrong ? r.blockedReason : null, sub.paragraph?.setSize, sub.paragraph?.childType);
  if (r.inThisTest)
    return r.inThisTest.subsectionId === sub.id ? (
      <button type="button" className="btn btn-ghost btn-sm danger-hover" disabled={locked || busy} onClick={onRemove}>
        Remove
      </button>
    ) : null;
  if (full && !wrong && !locked)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} title="This section is full: pick the question this one replaces">
            Replace
            <ChevronDown className="size-3" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-80 overflow-y-auto">
          <DropdownMenuLabel className="xs muted">Replace which one?</DropdownMenuLabel>
          {sub.slots
            .filter((s) => !isSet || s.count === (r.set?.count ?? 1))
            .map((s, k) => (
              <DropdownMenuItem key={s.questionId} onSelect={() => onReplace(s.questionId)}>
                <span className="mono xs muted w-14 shrink-0">{isSet ? `Set ${k + 1}` : `Q${s.n}`}</span>
                <Stem text={s.stemPreview} className="qp-ell font-serif" />
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  const img = r.flags.needsLatex > 0;
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      disabled={locked || busy || wrong || r.blockedReason === "SUBSECTION_FULL"}
      title={wrong ? bad ?? undefined : r.blockedReason === "SUBSECTION_FULL" ? "Section is full" : img ? "Adds with a warning: equation is an image" : `Add to ${sub.name}`}
      onClick={onAdd}
    >
      {isSet ? "Add set" : "Add"}
    </button>
  );
}
