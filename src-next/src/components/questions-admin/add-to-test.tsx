"use client";

/* Admin-Questions "Add to test": the test picker (with the optional Section, canvas v85) and the result dialog. */
import * as React from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { questionCount, testState, useAllTests, type AdminTest } from "@/lib/queries";
import { apiError, testsAdmin, TYPE_LABEL } from "@/lib/ai-admin";
import type { AddToTestResponse } from "@/lib/m5-contract";
import { AlertIcon, BoardDialog, Note, TickIcon, plural } from "./parts";

const SKIP_TEXT: Record<AddToTestResponse["skipped"][number]["reason"], string> = {
  ALREADY_IN_TEST: "is already in this test.",
  NO_MATCHING_SUBSECTION: "has no section of its subject and type in this test.",
  SUBSECTIONS_FULL: "didn't fit: its sections are full.",
  QUESTION_NOT_FOUND: "was not found in the bank.",
};

function sectionLabel(s: NonNullable<AdminTest["sections"]>[number]): string {
  let filled = 0;
  let needed = 0;
  const types = new Set<string>();
  for (const ss of s.subSections ?? []) {
    filled += ss.questions?.length ?? 0;
    needed += ss.totalQuestions ?? 0;
    if (ss.type) types.add(TYPE_LABEL[ss.type] ?? ss.type);
  }
  const parts = [s.subject && !s.name?.toLowerCase().includes(s.subject.toLowerCase()) ? s.subject : null, s.name, [...types].join(", ") || null, `${filled} of ${needed}`];
  return parts.filter(Boolean).join(" · ");
}

export function AddToTest({ ids, open, onClose, onDone }: { ids: string[]; open: boolean; onClose: () => void; onDone: () => void }) {
  const qc = useQueryClient();
  const tests = useAllTests();
  const [q, setQ] = React.useState("");
  const [testId, setTestId] = React.useState<string | null>(null);
  const [sectionId, setSectionId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ test: AdminTest; res: AddToTestResponse } | null>(null);

  React.useEffect(() => {
    if (open) {
      setQ("");
      setSectionId("");
      setError(null);
      setResult(null);
    }
  }, [open]);

  const now = dayjs();
  const candidates = React.useMemo(
    () =>
      (tests.data ?? [])
        .map((t) => ({ t, state: testState(t, now), ...questionCount(t) }))
        .filter((x) => x.state === "draft" || x.state === "scheduled")
        .sort((a, b) => (a.t.validity?.from ?? "9").localeCompare(b.t.validity?.from ?? "9")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tests.data]
  );
  const shown = candidates.filter((x) => !q.trim() || x.t.name.toLowerCase().includes(q.trim().toLowerCase()));
  const picked = candidates.find((x) => x.t._id === testId && x.filled < x.needed) ?? null;
  React.useEffect(() => {
    if (!open || testId) return;
    const first = candidates.find((x) => x.filled < x.needed);
    if (first) setTestId(first.t._id);
  }, [open, candidates, testId]);

  const add = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      const merged: AddToTestResponse = { now: "", added: [], skipped: [], filled: 0, needed: 0 };
      for (let i = 0; i < ids.length; i += 100) {
        const r = await testsAdmin.addToTest(picked.t._id, ids.slice(i, i + 100), sectionId || null);
        merged.added.push(...r.added);
        merged.skipped.push(...r.skipped);
        merged.filled = r.filled;
        merged.needed = r.needed;
        merged.now = r.now;
      }
      setResult({ test: picked.t, res: merged });
      qc.invalidateQueries({ queryKey: ["tests"] });
    } catch (e) {
      const err = apiError(e);
      setError(err.code === "TEST_LOCKED" ? "This test has opened, so its questions can't change. Pick another test." : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const { res, test } = result;
    const pct = res.needed ? Math.round((res.filled / res.needed) * 100) : 0;
    return (
      <BoardDialog open={open} onClose={onDone} labelledBy="ad-title" title={`Added ${res.added.length} to ${test.name}`}>
        <div className="row gap-2.5">
          <TickIcon color="#0E7A3D" size={20} />
          <h2 id="ad-title" className="h3 m-0">
            Added {res.added.length} to {test.name}
          </h2>
        </div>
        <div className="col gap-1.5">
          <div className="row between sm">
            <span>Questions filled</span>
            <span className="num">
              {res.filled} of {res.needed}
            </span>
          </div>
          <div className="bar h-1.5">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        {res.skipped.length > 0 && (
          <Note tone="warn">
            <AlertIcon color="#9A5800" />
            <span className="col gap-0.5">
              <span className="sm font-semibold">{res.skipped.length} not added</span>
              {res.skipped.slice(0, 6).map((s) => (
                <span key={s.questionId} className="sm">
                  <span className="mono">{s.questionId}</span> {SKIP_TEXT[s.reason] ?? s.reason}
                </span>
              ))}
              {res.skipped.length > 6 && <span className="sm">and {res.skipped.length - 6} more.</span>}
            </span>
          </Note>
        )}
        <div className="row justify-end gap-2">
          <Link href={`/tests/${test._id}/edit`} className="btn btn-secondary">
            Open test
          </Link>
          <button type="button" className="btn btn-primary" onClick={onDone}>
            Done
          </button>
        </div>
      </BoardDialog>
    );
  }

  return (
    <BoardDialog open={open} onClose={onClose} labelledBy="at-title" title={`Add ${ids.length} questions to a test`}>
      <div className="col gap-1">
        <h2 id="at-title" className="h3 m-0">
          Add {plural(ids.length, "question")} to a test
        </h2>
        <span className="sm muted">Draft tests, and tests that haven&apos;t opened yet.</span>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-[15px] -translate-y-1/2 text-muted" aria-hidden />
        <label htmlFor="ats" className="sr-only">
          Search tests
        </label>
        <input id="ats" className="input h-9 w-full pl-[34px] text-[13px]" placeholder="Search tests" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="col max-h-[300px] gap-2 overflow-y-auto" role="radiogroup" aria-label="Test">
        {tests.isLoading && Array.from({ length: 3 }, (_, i) => <div key={i} className="skel h-[58px] rounded-xl" />)}
        {!tests.isLoading && !shown.length && <span className="sm muted px-1 py-2">No draft or upcoming tests{q ? " match" : ""}.</span>}
        {shown.map(({ t, state, filled, needed }) => {
          const full = filled >= needed;
          const on = t._id === testId && !full;
          const opens = t.validity?.from ? `opens ${dayjs(t.validity.from).format("D MMM")}` : "no date yet";
          return (
            <label
              key={t._id}
              className={`row gap-3 rounded-xl border px-3 py-2.5 transition-colors ${full ? "cursor-not-allowed border-line bg-[#FAFBFD]" : on ? "cursor-pointer border-brand bg-brand-50" : "cursor-pointer border-line hover:border-brand-200"}`}
            >
              <input
                type="radio"
                name="addto"
                className="size-[18px] shrink-0 accent-[var(--navy)]"
                checked={on}
                disabled={full}
                onChange={() => {
                  setTestId(t._id);
                  setSectionId("");
                }}
              />
              <span className="col min-w-0 grow gap-0.5">
                <span className="sm truncate font-semibold">{t.name}</span>
                <span className="xs muted">
                  {filled} of {needed} questions · {opens}
                </span>
              </span>
              <span className={`badge ${full ? "b-grey" : state === "draft" ? "b-sky" : "b-navy"}`}>{full ? "Full" : state === "draft" ? "Draft" : "Scheduled"}</span>
            </label>
          );
        })}
      </div>
      <div className="col gap-1.5">
        <label className="label" htmlFor="atsec">
          Section <span className="muted font-normal">(optional)</span>
        </label>
        <select id="atsec" className="input h-9 w-full text-[13px]" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!picked}>
          <option value="">Any section with room</option>
          {(picked?.t.sections ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {sectionLabel(s)}
            </option>
          ))}
        </select>
      </div>
      <span className="xs muted">No section picked: each question goes into the first section of its type that has room.</span>
      {error && (
        <Note tone="warn" role="alert">
          <AlertIcon color="#9A5800" />
          <span className="sm">{error}</span>
        </Note>
      )}
      <div className="row justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={add} disabled={!picked || busy || !ids.length}>
          {busy ? "Adding…" : `Add ${plural(ids.length, "question")}`}
        </button>
      </div>
    </BoardDialog>
  );
}
