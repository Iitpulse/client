"use client";
/*
  Admin-Patterns board, view=list (+ empty, error, no-access, delete-blocked, deleted-undo).
  GET /tests/admin/patterns?q&examId&sort; row menu Edit · Preview · Duplicate · Delete. A pattern used by tests can't
  be deleted (409 PATTERN_IN_USE → BlockedDialog); an unused one is deleted at once with Undo (6 s).
*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import "@/components/m6/m6-patterns.css";
import { Topbar } from "@/components/admin/Topbar";
import { BlockedDialog, DataTable, EmptyState, FilterBar, FilterChip, NoAccess, notify, SearchBox, Segmented, StateBox, useUrlState } from "@/components/kit";
import { errorCode, isForbidden, SamplePill } from "@/components/m6/parts";
import { DuplicatePatternDialog } from "@/components/m6/patterns/DuplicatePatternDialog";
import { apiError, errDetails } from "@/lib/m6/client";
import { typesLine } from "@/lib/m6/pattern-rules";
import { patternsApi, type PatternSort, useInvalidatePatterns, usePatterns } from "@/lib/m6/patterns";
import { examRefs, useM6Exams } from "@/lib/m6/shared";
import type { PatternListResponse, TestRef } from "@/lib/m6-contract";

type Row = PatternListResponse["items"][number];
const SORT_LABEL: Record<PatternSort, string> = { lastUsed: "Last used", name: "Name", created: "Newest" };

export default function PatternsPage() {
  return (
    <Suspense>
      <PatternsList />
    </Suspense>
  );
}

function PatternsList() {
  const router = useRouter();
  const [s, set] = useUrlState({ q: "", exam: "", sort: "lastUsed" });
  const sort = (s.sort in SORT_LABEL ? s.sort : "lastUsed") as PatternSort;
  const list = usePatterns({ q: s.q.trim() || undefined, examId: s.exam || undefined, sort });
  const exams = useM6Exams();
  const invalidate = useInvalidatePatterns();
  const [dup, setDup] = useState<Row | null>(null);
  const [blocked, setBlocked] = useState<{ row: Row; tests: TestRef[] } | null>(null);

  const examOptions = useMemo(() => examRefs(exams.data).map((e) => ({ value: e.id, label: e.name })), [exams.data]);
  const forbidden = list.isError && isForbidden(list.error);
  const items = list.data?.items;
  const filtered = !!s.q.trim() || !!s.exam;
  const total = list.data?.pageInfo.total ?? 0;

  const remove = async (row: Row) => {
    try {
      await patternsApi.remove(row.id);
      await invalidate();
      notify.undo(`Pattern "${row.name}" deleted`, async () => {
        try {
          await patternsApi.restore(row.id);
          await invalidate();
        } catch (e) {
          notify.error("Couldn't bring the pattern back", { description: apiError(e).message });
        }
      });
    } catch (e) {
      const err = apiError(e);
      if (err.code === "PATTERN_IN_USE") setBlocked({ row, tests: errDetails<{ tests: TestRef[] }>(e)?.tests ?? [] });
      else notify.error("Couldn't delete the pattern", { description: err.message });
    }
  };

  const newButton = (
    <Link href="/patterns/new" className="btn btn-primary btn-sm">
      + New pattern
    </Link>
  );
  const nUsing = blocked ? blocked.row.usedBy || blocked.tests.length : 0;

  return (
    <>
      <Topbar title="Patterns" badge={<SamplePill areas={["patterns"]} />} actions={!forbidden && newButton} />
      <main className="col" style={{ padding: "20px 28px 40px", gap: 14 }}>
        {forbidden ? (
          <NoAccess what="patterns" />
        ) : list.isSuccess && !items?.length && !filtered ? (
          <EmptyState
            title="No patterns yet"
            body="A pattern sets a test's sections, question types and marking. Make one per exam format, then every test built on it adds up the same way."
            actions={newButton}
          />
        ) : (
          <>
            <FilterBar
              activeCount={s.exam ? 1 : 0}
              onClearAll={() => set({ exam: "" })}
              search={<SearchBox value={s.q} onChange={(q) => set({ q })} placeholder="Pattern name" label="Search patterns" />}
              right={
                <span className="row" style={{ gap: 8 }}>
                  <span className="sm muted">
                    {list.data ? `${total} pattern${total === 1 ? "" : "s"} · ` : ""}sorted by
                  </span>
                  <Segmented<PatternSort>
                    size="sm"
                    ariaLabel="Sort patterns"
                    value={sort}
                    onChange={(v) => set({ sort: v })}
                    options={(Object.keys(SORT_LABEL) as PatternSort[]).map((k) => ({ value: k, label: SORT_LABEL[k] }))}
                  />
                </span>
              }
            >
              <FilterChip label="Exam" noun="exam" options={examOptions} value={s.exam || null} onChange={(v) => set({ exam: v ?? "" })} loading={exams.isLoading} />
            </FilterBar>
            <DataTable<Row>
              ariaLabel="Patterns"
              status={list.isLoading ? "loading" : list.isError ? "error" : "ready"}
              rows={items}
              rowKey={(r) => r.id}
              onRowClick={(r) => router.push(`/patterns/${r.id}/edit`)}
              filtered={filtered}
              noMatch={
                <StateBox
                  title="No pattern matches"
                  body="Clear the search or pick another exam."
                  action={
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ q: "", exam: "" })}>
                      Clear
                    </button>
                  }
                />
              }
              error={{ title: "Couldn't load patterns", body: "Tests that use them still work. Try again in a moment.", code: errorCode("PAT", list.error), onRetry: () => list.refetch() }}
              rowMenuLabel={(r) => `More for ${r.name}`}
              rowMenu={(r) => [
                { label: "Edit", onSelect: () => router.push(`/patterns/${r.id}/edit`) },
                { label: "Preview", onSelect: () => router.push(`/patterns/${r.id}`) },
                { label: "Duplicate", onSelect: () => setDup(r) },
                { label: "Delete", danger: true, onSelect: () => remove(r) },
              ]}
              columns={[
                {
                  key: "name",
                  header: "Pattern",
                  render: (p) => (
                    <span className="col" style={{ minWidth: 0 }}>
                      <span className="sm" style={{ fontWeight: 600 }}>
                        {p.name}
                      </span>
                      <span className="xs muted">{typesLine(p.types, p.negative)}</span>
                    </span>
                  ),
                },
                { key: "exam", header: "Exam", width: 140, render: (p) => p.exam?.name ?? "—" },
                { key: "sections", header: "Sections", width: 90, align: "num", tablet: "hide", render: (p) => p.totals.sections },
                { key: "questions", header: "Questions", width: 100, align: "num", render: (p) => p.totals.questions },
                { key: "marks", header: "Marks", width: 80, align: "num", render: (p) => p.totals.marks },
                { key: "duration", header: "Duration", width: 100, align: "num", render: (p) => `${p.durationMinutes} min` },
                { key: "used", header: "Used by", width: 110, align: "num", render: (p) => (p.usedBy ? `${p.usedBy} test${p.usedBy === 1 ? "" : "s"}` : <span className="muted">Not used</span>) },
              ]}
            />
            <span className="xs muted">A pattern used by tests can&apos;t be deleted; an unused one is deleted at once with Undo.</span>
          </>
        )}
      </main>

      {dup && <DuplicatePatternDialog pattern={dup} onClose={() => setDup(null)} onDone={(id) => router.push(`/patterns/${id}/edit`)} />}
      <BlockedDialog
        open={!!blocked}
        onOpenChange={(o) => !o && setBlocked(null)}
        title={`Can't delete ${blocked?.row.name ?? ""}`}
        description={`${nUsing} test${nUsing === 1 ? " uses" : "s use"} it, and their results depend on it. It stays in the list; nobody has to pick it for new tests.`}
        closeLabel="Close"
        action={
          <Link href={`/tests?pattern=${encodeURIComponent(blocked?.row.id ?? "")}`} className="btn btn-secondary btn-sm">
            Show the {nUsing} test{nUsing === 1 ? "" : "s"}
          </Link>
        }
      />
    </>
  );
}
