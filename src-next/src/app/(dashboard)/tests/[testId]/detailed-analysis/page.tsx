"use client";

/*
  Admin-Analysis board (canvas: question analysis, 5 types, answer-key check, fix and re-score, states).
  Data: GET /test/:id (the paper) and GET /test/result/admin (graded submissions), analysed in the browser (./analysis);
  M5: GET /ai/admin/tests/:id/key-check (banner + the amber card on a flagged question) and …/questions/:qid/insight
  ("✦ Why B"). M6 (owner D6): Fix key… opens the fix drawer (./fix-key: change / accept also / drop → impact preview →
  navy confirm); the re-score runs as a job polled here ("Re-scoring … 128 of 212") and ends with the navy "Key
  corrected" banner + audit link. Corrections so far come from GET /tests/admin/tests/:id/results (keyCorrections).
*/

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { MathText } from "@/components/math-text";

import { Topbar } from "@/components/admin/Topbar";
import { FilterChip, NoAccess, notify, PageError, Segmented, supportCode, useFillHeight, fmtDate, fmtDateTime } from "@/components/kit";
import { useKeyCheck, useQuestionInsight } from "@/lib/queries-tests-admin";
import type { KeyCheckFlag } from "@/lib/m5-contract";
import type { KeyCorrection } from "@/lib/m6-contract";
import { api } from "@/lib/api";
import { useCan } from "@/lib/m6/people";
import { getKeyFix, useKeyCorrections } from "@/lib/m6/keyfix";
import { ACC_BG, clock, type RawSubmission } from "@/lib/results";
import { analyse, flattenPaper, inRange, keyLabel, LETTERS, letterOf, markingLine, TYPE_LABEL, type Item, type ItemStat } from "./analysis";
import { FixKeyDrawer } from "./fix-key";
import "../results.css";
import "./analysis.css";

type Paper = Parameters<typeof flattenPaper>[0] & { _id: string; name: string; validity?: { from?: string; to?: string } | null };

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
/** a bar's width inside its track, leaving room for the label after it */
const barW = (p: number) => `calc((100% - 96px) * ${Math.max(0, Math.min(100, p)) / 100})`;
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : (Math.round(x * 10) / 10).toFixed(1));

function AnBanner({ tone, icon, children, action }: { tone: "info" | "quiet" | "warn" | "navy"; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={`an-bn ${tone}`} role="status" data-testid={`analysis-banner-${tone}`}>
      {icon ?? <Info className="size-4" aria-hidden />}
      <span className="t">{children}</span>
      {action}
    </div>
  );
}

function flagLine(f: KeyCheckFlag): React.ReactNode {
  const popular = f.popular.letters?.join(", ") ?? (f.popular.value !== undefined ? String(f.popular.value) : "?");
  const key = f.key.letters?.join(", ") ?? (f.key.range ? (f.key.range.min === f.key.range.max ? String(f.key.range.min) : `${f.key.range.min}–${f.key.range.max}`) : "?");
  return (
    <>
      Q{f.n}: {Math.round(f.popular.share * 100)}% of the batch{f.popular.topTenCount > 0 ? `, including ${f.popular.topTenCount} of the top 10,` : ""} chose {popular}; the key says {key}.
    </>
  );
}

/** The correction's key change as the board writes it: "C → B", "C → C or B", "dropped". */
function changeLabel(item: Item | undefined, c: KeyCorrection): string {
  if (!item) return "";
  if (c.mode === "drop") return `${keyLabel(item, c.oldKey)} → dropped`;
  if (c.mode === "acceptAlso") return `${keyLabel(item, c.oldKey)} → ${[c.newKey, ...c.acceptKeys].map((k) => keyLabel(item, k)).join(" or ")}`;
  return `${keyLabel(item, c.oldKey)} → ${keyLabel(item, c.newKey)}`;
}

function auditHref(c: KeyCorrection, testName: string) {
  return c.auditEventId ? `/audit-logs?event=${encodeURIComponent(c.auditEventId)}&range=30d` : `/audit-logs?q=${encodeURIComponent(testName)}&range=30d`;
}

/** "B · 47%", "25 · 21%", "A, C · 24%", "Skipped · 41%", "—": the most common wrong answer. */
function mostWrong(s: ItemStat): string {
  if (!s.total) return "—";
  const it = s.item;
  let best: [string, number] = ["", 0];
  if (it.type === "single") {
    const key = new Set([...(it.key.optionIds ?? []), ...it.acceptKeys.flatMap((k) => k.optionIds ?? [])]);
    it.options.forEach((o, i) => {
      const c = s.optionCounts[o.id] ?? 0;
      if (!key.has(o.id) && c > best[1]) best = [LETTERS[i] ?? o.id, c];
    });
  } else if (it.type === "integer") {
    const w = s.values.find((v) => !inRange(it, v.value));
    if (w) best = [fmt(w.value), w.count];
  } else if (it.type === "multiple") {
    const full = it.marking.correct;
    const w = s.combos.find((c) => c.marks < full);
    if (w) best = [w.ids.map((id) => letterOf(it, id)).join(", "), w.count];
  }
  if (s.skipped > best[1]) best = ["Skipped", s.skipped];
  return best[1] ? `${best[0]} · ${pct(best[1], s.total)}%` : "—";
}

function rightWord(t: Item["type"]) {
  return t === "integer" ? "in range" : t === "multiple" ? "all right" : t === "matrix" ? "all rows" : "right";
}

/* ───────────── question panel bodies, one per type ───────────── */

function Bar({ label, w, bg, tone, text, mono, wide }: { label: React.ReactNode; w: number; bg: string; tone?: string; text: string; mono?: boolean; wide?: boolean }) {
  return (
    <div className="an-orow">
      <span className={`an-ot ${wide ? "wide" : ""} ${mono ? "mono sm" : "sm"}`}>{label}</span>
      <div className="an-otrack">
        <span className="rs-ob" style={{ width: barW(w), background: bg }} />
        <span className="an-obl" style={{ color: tone ?? "#575C75" }}>
          {text}
        </span>
      </div>
    </div>
  );
}

function SingleBody({ s, flag, corrected }: { s: ItemStat; flag: KeyCheckFlag | null; corrected: KeyCorrection | null }) {
  const it = s.item;
  const key = new Set([...(it.key.optionIds ?? []), ...it.acceptKeys.flatMap((k) => k.optionIds ?? [])]);
  const wasKey = corrected && corrected.mode === "changeKey" ? keyLabel(it, corrected.oldKey) : null;
  const flaggedIds = new Set(flag && flag.aiVerdict !== "keyLooksRight" ? (flag.popular.optionIds ?? []) : []);
  return (
    <div className="col gap-3">
      {it.stem ? <MathText html as="div" className="font-serif text-[16px] leading-[1.55]" text={it.stem} /> : <span className="sm muted">The question text is not available.</span>}
      <div className="col gap-2">
        {it.options.map((o, i) => {
          const p = pct(s.optionCounts[o.id] ?? 0, s.total);
          const isKey = it.dropped ? false : key.has(o.id);
          const isFlag = flaggedIds.has(o.id) && !isKey;
          return (
            <div key={o.id} className="an-orow">
              <span className="mono sm w-[22px]">{LETTERS[i]}</span>
              <MathText html as="div" className="an-ot wide font-serif text-[14px] leading-snug" text={o.value} />
              <div className="an-otrack">
                <span className="rs-ob" style={{ width: barW(p), background: isKey ? "#CDE9D7" : isFlag ? "#F7E2B5" : p > 30 ? "#F6C9C9" : "#E1E3F8" }} />
                <span className="an-obl" style={{ color: isKey ? "#0B6B35" : isFlag ? "#6B4200" : "#575C75" }}>
                  {p}%{isKey ? " · key" : ""}
                  {isKey && wasKey && LETTERS[i] !== wasKey ? ` · was ${wasKey}` : ""}
                  {isFlag && flag!.popular.topTenCount ? ` · ${flag!.popular.topTenCount} of top 10` : ""}
                </span>
              </div>
            </div>
          );
        })}
        <div className="an-orow">
          <span className="mono sm w-[22px]">–</span>
          <span className="an-ot wide" />
          <div className="an-otrack">
            <span className="rs-ob" style={{ width: barW(pct(s.skipped, s.total)), background: "#EEF0F5" }} />
            <span className="an-obl">{pct(s.skipped, s.total)}% skipped</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumericalBody({ s }: { s: ItemStat }) {
  const it = s.item;
  const r = it.key.range;
  const top = s.values.slice(0, 4);
  const rest = s.values.slice(4);
  const restCount = rest.reduce((a, v) => a + v.count, 0);
  const firstWrong = s.values.find((v) => !inRange(it, v.value))?.value;
  return (
    <div className="col gap-3">
      {it.stem && <MathText html as="div" className="font-serif text-[16px] leading-[1.55]" text={it.stem} />}
      <span className="sm" data-testid="numerical-key">
        {it.dropped ? (
          "This question was dropped: everyone got full marks."
        ) : r ? (
          r.from === r.to ? (
            <>
              Key: <b className="num">{fmt(r.from)}</b>.
            </>
          ) : (
            <>
              Key: any value from <b className="num">{fmt(r.from)}</b> to <b className="num">{fmt(r.to)}</b>.
            </>
          )
        ) : (
          "No key is set."
        )}{" "}
        {s.values.length ? "Answers students typed, most common first:" : "Nobody typed an answer yet."}
      </span>
      <div className="col gap-2" data-testid="numerical-histogram">
        {top.map((v) => {
          const ok = inRange(it, v.value);
          const p = pct(v.count, s.total);
          return <Bar key={v.value} mono label={fmt(v.value)} w={p} bg={ok ? "#CDE9D7" : v.value === firstWrong ? "#F6C9C9" : "#E1E3F8"} tone={ok ? "#0B6B35" : undefined} text={`${p}%${ok ? " · in range" : ""}`} />;
        })}
        {rest.length > 0 && <Bar mono label={`${rest.length} other${rest.length === 1 ? "" : "s"}`} w={pct(restCount, s.total)} bg="#E1E3F8" text={`${pct(restCount, s.total)}%`} />}
        <Bar label={<span className="muted">Skipped</span>} w={pct(s.skipped, s.total)} bg="#EEF0F5" text={`${pct(s.skipped, s.total)}%`} />
      </div>
    </div>
  );
}

function MultipleBody({ s }: { s: ItemStat }) {
  const it = s.item;
  const key = new Set(it.key.optionIds ?? []);
  const m = it.marking;
  const partialMarks = m.partial.filter((p) => p.marks > 0).map((p) => p.marks);
  const sign = (x: number) => (x > 0 ? `+${fmt(x)}` : x < 0 ? `−${fmt(-x)}` : "0");
  return (
    <div className="col gap-3">
      {it.stem && <MathText html as="div" className="font-serif text-[16px] leading-[1.55]" text={it.stem} />}
      <div className="col gap-1.5" data-testid="multiple-buckets">
        <span className="xs font-semibold">Marks: {markingLine(it)}</span>
        <Bar label="All right" w={pct(s.correct, s.total)} bg="#CDE9D7" tone="#0B6B35" text={`${pct(s.correct, s.total)}% · ${sign(m.correct)}`} />
        <Bar
          label="Partly right"
          w={pct(s.partial, s.total)}
          bg="#F7E2B5"
          tone="#6B4200"
          text={`${pct(s.partial, s.total)}%${partialMarks.length ? ` · ${sign(Math.min(...partialMarks))}${partialMarks.length > 1 ? ` to ${sign(Math.max(...partialMarks))}` : ""}` : ""}`}
        />
        <Bar label="A wrong option" w={pct(s.wrong, s.total)} bg="#F6C9C9" text={`${pct(s.wrong, s.total)}%${m.incorrect ? ` · ${sign(m.incorrect)}` : ""}`} />
        <Bar label={<span className="muted">Skipped</span>} w={pct(s.skipped, s.total)} bg="#EEF0F5" text={`${pct(s.skipped, s.total)}%`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col gap-1.5">
          <span className="xs font-semibold">Each option, how often ticked</span>
          {it.options.map((o, i) => {
            const k = key.has(o.id);
            return (
              <span key={o.id} className="sm row gap-2">
                <span className="mono w-4">{LETTERS[i]}</span>
                <MathText html as="span" className="grow font-serif" text={o.value} />
                <span className={`num ${k ? "font-semibold text-[#0B6B35]" : "muted"}`}>
                  {pct(s.optionCounts[o.id] ?? 0, s.total)}%{k ? " · key" : ""}
                </span>
              </span>
            );
          })}
        </div>
        <div className="col gap-1.5" data-testid="multiple-combos">
          <span className="xs font-semibold">Most common answers</span>
          {s.combos.slice(0, 4).map((c) => {
            const full = c.marks >= m.correct && m.correct > 0;
            return (
              <span key={c.ids.join(",")} className="sm row between">
                <span className="mono">{c.ids.map((id) => letterOf(it, id)).sort().join(", ")}</span>
                <span className={`num ${full ? "font-semibold text-[#0B6B35]" : ""}`}>
                  {pct(c.count, s.total)}% · {sign(c.marks)}
                </span>
              </span>
            );
          })}
          {!s.combos.length && <span className="sm muted">Nobody answered yet.</span>}
        </div>
      </div>
    </div>
  );
}

function MatrixBody({ s }: { s: ItemStat }) {
  const it = s.item;
  const mx = it.matrix ?? { rows: [], columns: [] };
  const key = it.key.matches ?? {};
  const cellBg = (isKey: boolean, p: number) => (isKey ? (p >= 60 ? "#CDE9D7" : "#F7E2B5") : p >= 30 ? "#F6C9C9" : p >= 15 ? "#F7E2B5" : "#F5F6FA");
  return (
    <div className="col gap-3">
      {it.stem && <MathText html as="div" className="font-serif text-[16px] leading-[1.55]" text={it.stem} />}
      <div className="an-mx" role="table" aria-label="Share of students who matched each List I row to each List II column; key cells outlined" style={{ gridTemplateColumns: `150px repeat(${mx.columns.length || 1}, minmax(0, 1fr))` }} data-testid="matrix-grid">
        <span className="h" role="columnheader">
          List I \ List II
        </span>
        {mx.columns.map((c) => (
          <span key={c.id} className="h" role="columnheader">
            {c.id}
            {c.en ? (
              <>
                {" · "}
                <MathText as="span" className="font-serif" text={c.en} />
              </>
            ) : null}
          </span>
        ))}
        {mx.rows.map((r) => (
          <React.Fragment key={r.id}>
            <span className="rh">
              <b className="mono">{r.id}</b>
              {r.en && <MathText as="span" className="font-serif" text={r.en} />}
            </span>
            {mx.columns.map((c) => {
              const isKey = (key[r.id] ?? []).includes(c.id);
              const p = pct(s.cells[r.id]?.[c.id] ?? 0, s.total);
              return (
                <span key={c.id} className={`cell ${isKey ? "k" : ""}`} style={{ background: cellBg(isKey, p) }}>
                  {p}%
                </span>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <span className="sm">
        All {mx.rows.length} rows right: <b>{pct(s.correct, s.total)}%</b>.
      </span>
      <span className="xs muted">Marks: {markingLine(it)}. Outlined cells are the key.</span>
    </div>
  );
}

function ParagraphBody({ set, stats, current, onPick }: { set: ItemStat[]; stats: ItemStat; current: number; onPick: (n: number) => void }) {
  const passage = stats.item.set?.passage ?? "";
  const tone = (a: number) => (a < 30 ? "#C40000" : a < 50 ? "#9A5800" : "#0E7A3D");
  return (
    <div className="col gap-3">
      <div className="an-passage">
        <span className="xs mb-1 block font-semibold text-[#575C75]">
          Passage · Q{set[0]?.item.n}–{set[set.length - 1]?.item.n}
        </span>
        {passage ? <MathText html as="div" className="font-serif" text={passage} /> : <span className="sm muted">The passage text is not available.</span>}
      </div>
      {set.map((k) => {
        const it = k.item;
        const r = it.key.range;
        return (
          <button key={it.questionId} type="button" className={`an-kid ${it.n === current ? "on" : ""}`} aria-pressed={it.n === current} onClick={() => onPick(it.n)} data-testid="paragraph-child">
            <span className="row between w-full">
              <span className="sm">
                <b className="mono">Q{it.n}</b> · {TYPE_LABEL[it.type]}
                {it.chapter ? ` · ${it.chapter}` : ""}
              </span>
              <span className="sm num font-semibold" style={{ color: tone(k.accuracy) }}>
                {k.accuracy}% {rightWord(it.type)}
              </span>
            </span>
            <span className="an-thin w-full">
              <i style={{ width: `${k.accuracy}%`, background: tone(k.accuracy) }} />
            </span>
            <span className="xs muted">
              {it.type === "integer" && r ? `Key ${r.from === r.to ? fmt(r.from) : `${fmt(r.from)} to ${fmt(r.to)}`}. ` : ""}
              Most {it.type === "integer" ? "common wrong answer" : "chosen wrong"}: {mostWrong(k)}
            </span>
          </button>
        );
      })}
      <span className="xs muted">Fix key works on each question in the passage separately.</span>
    </div>
  );
}

/* ───────────── page ───────────── */

export default function DetailedAnalysisPage() {
  const params = useParams();
  const testId = params.testId as string;
  const qc = useQueryClient();
  const { can, loading: permLoading, roleName } = useCan();
  const canFix = can("UPDATE_TEST");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["test-analysis", testId],
    queryFn: async () => {
      const [testRes, resultsRes] = await Promise.all([api.tests.getById(testId), api.tests.getAdminResult(testId)]);
      const test = (testRes.data?.data || testRes.data) as Paper;
      const result = resultsRes.data?.data || resultsRes.data;
      return { test, submissions: (result?.submissions || []) as RawSubmission[] };
    },
  });

  const test = data?.test;
  const submissions = React.useMemo(() => data?.submissions ?? [], [data]);
  const items = React.useMemo(() => flattenPaper(test), [test]);
  const stats = React.useMemo(() => analyse(items, submissions), [items, submissions]);
  const topStudent = React.useMemo(() => [...submissions].sort((a, b) => Number(b.obtainedMarks ?? 0) - Number(a.obtainedMarks ?? 0))[0]?.studentId, [submissions]);

  // filters: subject (section) tabs and a type chip
  const [section, setSection] = React.useState<string>("all");
  const [type, setType] = React.useState<string | null>(null);
  const sections = React.useMemo(() => [...new Map(items.map((i) => [i.sectionId, i.sectionName])).entries()], [items]);
  const typeOptions = React.useMemo(() => {
    const present = new Set(items.map((i) => (i.paragraph ? "paragraph" : i.type)));
    return (["single", "multiple", "integer", "paragraph", "matrix"] as const).filter((t) => present.has(t)).map((t) => ({ value: t, label: TYPE_LABEL[t] }));
  }, [items]);
  const shown = React.useMemo(() => stats.filter((s) => (section === "all" || s.item.sectionId === section) && (!type || (type === "paragraph" ? s.item.paragraph : !s.item.paragraph && s.item.type === type))), [stats, section, type]);

  const hardest = React.useMemo(() => [...shown].filter((q) => q.total).sort((a, b) => a.accuracy - b.accuracy || a.item.n - b.item.n), [shown]);
  const [selected, setSelected] = React.useState<number | null>(null);
  const current = stats.find((q) => q.item.n === selected) ?? hardest[0] ?? shown[0] ?? stats[0];
  const detailRef = React.useRef<HTMLElement>(null);

  // AI: answer-key check and "Why B"
  const keyCheck = useKeyCheck(testId, submissions.length > 0);
  const kc = keyCheck.data;
  const flags = (kc?.flags ?? []).filter((f) => f.aiVerdict !== "keyLooksRight");
  const flagOf = React.useMemo(() => new Map(flags.map((f) => [f.questionId, f])), [flags]);
  const curFlag = current ? (flagOf.get(current.item.questionId) ?? null) : null;
  const [keptKeys, setKeptKeys] = React.useState<Set<string>>(new Set());
  const hasOptions = !!current && current.item.type === "single" && current.item.options.length > 0;
  const insight = useQuestionInsight(testId, current?.item.questionId, hasOptions && submissions.length > 0);

  // key corrections: list, the running one (polled), the one finished on this page
  const corrections = useKeyCorrections(testId, submissions.length > 0);
  const [runningId, setRunningId] = React.useState<string | null>(null);
  const [finished, setFinished] = React.useState<KeyCorrection | null>(null);
  const listedRunning = corrections.data?.find((c) => c.status === "running")?.id ?? null;
  const pollId = runningId ?? listedRunning;
  const poll = useQuery({
    queryKey: ["m6", "key-fix", testId, pollId],
    enabled: !!pollId,
    queryFn: () => getKeyFix(testId, pollId!),
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "running" ? false : 1500),
  });
  const running = poll.data?.status === "running" ? poll.data : null;
  const handled = React.useRef(new Set<string>());
  React.useEffect(() => {
    const c = poll.data;
    if (!c || c.status === "running" || c.id !== pollId || handled.current.has(c.id)) return;
    handled.current.add(c.id);
    setRunningId(null);
    if (c.status === "done") {
      setFinished(c);
      notify.success(`Re-scored ${c.rescored} result${c.rescored === 1 ? "" : "s"}`, { description: `${c.scoresChanged} score${c.scoresChanged === 1 ? "" : "s"} changed` });
    } else {
      notify.error("Re-scoring stopped", { description: "Scores are unchanged. Try the fix again." });
    }
    void qc.invalidateQueries({ queryKey: ["test-analysis", testId] });
    void qc.invalidateQueries({ queryKey: ["m6", "key-corrections", testId] });
    void qc.invalidateQueries({ queryKey: ["m5", "key-check", testId] });
    void qc.invalidateQueries({ queryKey: ["test-result-admin", testId] });
  }, [poll.data, pollId, qc, testId]);
  const doneFor = React.useMemo(() => {
    const m = new Map<string, KeyCorrection>();
    for (const c of corrections.data ?? []) if (c.status === "done" && !m.has(c.questionId)) m.set(c.questionId, c);
    return m;
  }, [corrections.data]);
  const curCorrected = current ? (doneFor.get(current.item.questionId) ?? null) : null;

  const [fixOpen, setFixOpen] = React.useState(false);
  const busy = !!pollId && (!poll.data || poll.data.status === "running");

  const [fillRef, fillH] = useFillHeight<HTMLElement>(submissions.length > 0, 320, 0, "panel");
  const review = (n: number) => {
    setSelected(n);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const testName = test?.name ?? "this test";
  const tabs = (
    <div className="seg" aria-label="Analysis views">
      <span className="tab on" aria-current="page">
        Questions
      </span>
      {topStudent ? (
        <Link href={`/tests/${testId}/student/${topStudent}`} className="tab">
          Student report
        </Link>
      ) : (
        <span className="tab" aria-disabled>
          Student report
        </span>
      )}
    </div>
  );
  const back = { href: `/tests/${testId}/result`, label: "Results" };

  if (!permLoading && !can("VIEW_RESULT", "READ_TEST", "READ_GLOBAL_TEST", "UPDATE_TEST")) {
    return (
      <>
        <Topbar title="Question analysis" back={back} />
        <main className="col gap-4 px-7 pt-5 pb-10">
          <NoAccess what="question analysis" role={roleName} />
        </main>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Topbar title="Question analysis" back={back} />
        <main className="col gap-4 px-7 pt-5 pb-10" aria-busy="true" aria-label="Loading analysis">
          <div className="grid gap-3.5 min-[1180px]:grid-cols-5">
            <span className="skel h-[320px] min-[1180px]:col-span-2" />
            <span className="skel h-[320px] min-[1180px]:col-span-3" />
          </div>
        </main>
      </>
    );
  }

  if (error || !test) {
    return (
      <>
        <Topbar title="Question analysis" back={back} />
        <main className="col gap-4 px-7 pt-5 pb-10">
          <PageError what="question analysis" body="Scores and answers are safe. Try again, or share this code with support:" code={supportCode("E", error)} onRetry={() => void refetch()} />
        </main>
      </>
    );
  }

  const set = current?.item.set ? stats.filter((s) => s.item.set?.setId === current.item.set!.setId) : null;
  const kcReason = kc?.reason ?? (keyCheck.error as { code?: string } | null)?.code ?? null;
  const showKcCard = !!curFlag && !busy && !keptKeys.has(curFlag.questionId) && !curCorrected;
  const whyHeld = insight.data?.status === "not_applicable" && insight.data.reason === "KEY_UNDER_QUESTION";
  const latest = finished ?? null;
  const latestItem = latest ? items.find((i) => i.questionId === latest.questionId) : undefined;

  const headerN = set && set.length > 1 ? `Q${set[0].item.n}–${set[set.length - 1].item.n}` : `Q${current?.item.n}`;
  const meta = current
    ? set && set.length > 1
      ? `${set.length} questions · avg ${clock(Math.round(set.reduce((a, s) => a + s.avgTime, 0) / set.length))} each`
      : `avg ${clock(current.avgTime)} · ${current.accuracy}% ${rightWord(current.item.type)}`
    : "";
  const canFixCurrent = canFix && !!current && current.total > 0 && !busy;

  return (
    <>
      <Topbar title={`${testName} · question analysis`} back={back} actions={tabs} />
      <main className="col gap-4 px-7 pt-5 pb-10">
        {!submissions.length || !current ? (
          <div className="card col items-center gap-1.5 p-12 text-center">
            <span className="h3">No submissions yet</span>
            <span className="sm muted">The analysis appears once students submit the test.</span>
          </div>
        ) : (
          <>
            {/* one banner: the re-score first, then the answer-key check */}
            {busy ? (
              <AnBanner tone="info" icon={<LoaderCircle className="size-4 animate-spin" aria-hidden />}>
                <b>
                  Re-scoring {testName} · {running?.progress.done ?? 0} of {running?.progress.total ?? submissions.length}.
                </b>{" "}
                Students keep seeing their old score until it finishes, in about a minute. You can leave this page.
                <span className="sr-only" data-testid="rescore-progress" />
              </AnBanner>
            ) : latest ? (
              <AnBanner
                tone="navy"
                icon={<CircleCheck className="size-4" aria-hidden />}
                action={
                  <Link href={auditHref(latest, testName)} className="btn btn-ghost">
                    See in audit log
                  </Link>
                }
              >
                <b data-testid="key-corrected-banner">
                  Key corrected for Q{latest.n}: {changeLabel(latestItem, latest)}.
                </b>{" "}
                {latest.scoresChanged} score{latest.scoresChanged === 1 ? "" : "s"} and {latest.ranksChanged} rank{latest.ranksChanged === 1 ? "" : "s"} changed
                {latest.averageAfter !== null ? `; the average is now ${fmt(latest.averageAfter)}` : ""}.{" "}
                {latest.studentsNotified ? `Those students see a "key corrected" note on their result${latest.emailed ? ` and ${latest.emailed} got a short email` : ""}. ` : ""}
                Saved to the audit log with your name.
                {latest.reason ? <span className="mt-0.5 block" data-testid="key-corrected-reason">Reason: {latest.reason}</span> : null}
              </AnBanner>
            ) : kc?.status === "generating" ? (
              <AnBanner tone="quiet" icon={<LoaderCircle className="size-4 animate-spin" aria-hidden />}>
                <b>Checking answer keys.</b> AI is working through the {items.length} questions; usually about 2 minutes. You can leave this page.
              </AnBanner>
            ) : kcReason === "AI_PAUSED" ? (
              <AnBanner tone="warn" icon={<TriangleAlert className="size-4" aria-hidden />}>
                <b>AI is paused this month, so answer keys weren&apos;t checked.</b> Accuracy and the hardest-questions list still show keys worth a second look. You can fix any key yourself.
              </AnBanner>
            ) : kcReason === "TOO_FEW_SUBMISSIONS" ? (
              <AnBanner tone="quiet">
                <b>No answer-key check yet.</b> It needs at least 10 submissions to spot a wrong key; there {submissions.length === 1 ? "is 1" : `are ${submissions.length}`}. You can still fix any key yourself from a question.
              </AnBanner>
            ) : kcReason === "NOT_CLOSED" ? (
              <AnBanner tone="quiet">
                <b>Answer keys are checked when the test closes for everyone</b>
                {test.validity?.to ? `, ${fmtDateTime(test.validity.to, "short")}` : ""}. Numbers below fill in as students submit.
              </AnBanner>
            ) : kc?.status === "ready" && flags.length ? (
              <AnBanner
                tone="info"
                action={
                  <button type="button" className="btn btn-secondary" onClick={() => review(flags[0].n)}>
                    Check Q{flags[0].n}
                  </button>
                }
              >
                <b data-testid="key-check-flag">
                  Answer-key check: {flags.length} of {kc.checkedQuestions || items.length} keys look{flags.length === 1 ? "s" : ""} wrong.
                </b>{" "}
                {flagLine(flags[0])} Nothing changes until you decide.
              </AnBanner>
            ) : kc?.status === "ready" ? (
              <KcClear checked={kc.checkedQuestions} skipped={Math.max(0, items.length - kc.checkedQuestions)} testId={testId} />
            ) : null}

            <div className="row between wrap gap-2.5">
              {sections.length > 1 ? (
                <Segmented ariaLabel="Subject" value={section} onChange={setSection} options={[{ value: "all", label: "All" }, ...sections.map(([id, name]) => ({ value: id, label: name }))]} />
              ) : (
                <span />
              )}
              {typeOptions.length > 1 && <FilterChip label="Type" noun="type" anyLabel="Any type" options={typeOptions} value={type} onChange={setType} />}
            </div>

            <section className="grid items-start gap-3.5 min-[1180px]:grid-cols-5">
              <article className="card pad-lg col rise gap-3 min-[1180px]:col-span-2">
                <div className="row between wrap gap-2">
                  <span className="h3">Accuracy by question</span>
                  <div className="row xs muted gap-1.5">
                    <span className="size-3 rounded-[3px]" style={{ background: ACC_BG(0) }} />
                    <span>under 40%</span>
                    <span className="size-3 rounded-[3px]" style={{ background: ACC_BG(50) }} />
                    <span>40–75</span>
                    <span className="size-3 rounded-[3px]" style={{ background: ACC_BG(90) }} />
                    <span>over 75</span>
                  </div>
                </div>
                <div className="grid grid-cols-10 gap-[5px]" data-testid="analysis-map">
                  {shown.map((q) => {
                    const on = q.item.n === current.item.n;
                    const flagged = flagOf.has(q.item.questionId) && !doneFor.has(q.item.questionId);
                    const fixed = doneFor.has(q.item.questionId);
                    return (
                      <button
                        key={q.item.questionId}
                        type="button"
                        className="rs-qc"
                        style={{
                          background: q.total ? ACC_BG(q.accuracy) : "var(--line-2)",
                          boxShadow: on ? "0 0 0 2px var(--navy), inset 0 0 0 1.5px #fff" : flagged ? "inset 0 0 0 2px #9A5800" : undefined,
                        }}
                        title={`Q${q.item.n} · ${q.total ? `${q.accuracy}%` : "no responses"}`}
                        aria-label={`Question ${q.item.n}, ${q.total ? `${q.accuracy}% ${rightWord(q.item.type)}` : "no responses"}${flagged ? ", key looks wrong" : fixed ? ", key corrected" : ""}`}
                        aria-pressed={on}
                        onClick={() => setSelected(q.item.n)}
                      >
                        {q.item.n}
                      </button>
                    );
                  })}
                </div>
                <span className="xs muted">
                  {shown.length !== stats.length ? `${shown.length} of ${stats.length} questions. ` : ""}Click a square to open that question.{flags.length ? " The amber outline marks a key worth checking." : ""}
                </span>
              </article>

              <article ref={detailRef} className="card pad-lg col rise scroll-mt-20 gap-3.5 min-[1180px]:col-span-3" style={{ ["--i" as string]: 1 }} data-testid="analysis-question" data-type={set && set.length > 1 ? "paragraph" : current.item.type}>
                <div className="row between wrap gap-2">
                  <div className="row wrap gap-2">
                    <span className="h3 mono">{headerN}</span>
                    <span className="badge b-grey">{set ? TYPE_LABEL.paragraph : TYPE_LABEL[current.item.type]}</span>
                    {current.item.chapter && <span className="badge b-grey">{current.item.chapter}</span>}
                    {current.item.dropped && <span className="badge b-grey">Dropped</span>}
                    {curCorrected && (
                      <span className="badge b-navy" data-testid="key-corrected-badge">
                        Key corrected {fmtDate(curCorrected.at).replace(/ \d{4}$/, "")}
                      </span>
                    )}
                  </div>
                  <div className="row gap-2">
                    <span className="sm muted num">{meta}</span>
                    {canFixCurrent && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFixOpen(true)} data-testid="fix-key-open">
                        {set && set.length > 1 ? `Fix key for Q${current.item.n}…` : "Fix key…"}
                      </button>
                    )}
                  </div>
                </div>

                {set && set.length > 1 ? (
                  <ParagraphBody set={set} stats={current} current={current.item.n} onPick={setSelected} />
                ) : current.item.type === "integer" ? (
                  <NumericalBody s={current} />
                ) : current.item.type === "multiple" ? (
                  <MultipleBody s={current} />
                ) : current.item.type === "matrix" ? (
                  <MatrixBody s={current} />
                ) : (
                  <SingleBody s={current} flag={curFlag} corrected={curCorrected} />
                )}

                {showKcCard && curFlag && (
                  <div className="an-kc" data-testid="key-check-card">
                    <div className="row between wrap gap-2">
                      <span className="ai-mark text-[#8A4F00]">✦ Answer-key check</span>
                      {curFlag.aiVerdict === "keyLooksWrong" && <span className="badge b-amber">Key looks wrong</span>}
                    </div>
                    <span className="sm">
                      {Math.round(curFlag.popular.share * 100)}% chose {curFlag.popular.letters?.join(", ") ?? curFlag.popular.value}
                      {curFlag.popular.topTenCount ? `, including ${curFlag.popular.topTenCount} of the top 10` : ""}.
                      {curFlag.rule === "negativeDiscrimination" || (curFlag.discrimination ?? 0) < 0
                        ? " Students who did well overall picked the key less often than weaker students, which rarely happens when the key is right."
                        : ""}
                    </span>
                    {curFlag.reasoning && (
                      <span className="sm">
                        Working it through: <MathText as="span" text={curFlag.reasoning} />
                      </span>
                    )}
                    <div className="row wrap gap-2">
                      {canFixCurrent && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setFixOpen(true)}>
                          Fix the key…
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setKeptKeys((s) => new Set(s).add(curFlag.questionId))}>
                        The key is right
                      </button>
                      {curFlag.affectedResults > 0 && (
                        <span className="xs ml-auto">
                          Changing the key re-scores this test: {curFlag.affectedResults} score{curFlag.affectedResults === 1 ? "" : "s"} would change.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {hasOptions && insight.data?.status === "ready" && insight.data.insight && (
                  <div className="ai row gap-2.5 px-3.5 py-3" data-testid="why-insight">
                    <span className="ai-mark flex-none">✦ Why {insight.data.insight.option.letter}</span>
                    <MathText as="span" className="sm" text={[insight.data.insight.text, insight.data.insight.cue].filter(Boolean).join(" ")} />
                  </div>
                )}
                {hasOptions && insight.data?.status === "generating" && (
                  <div className="ai row gap-2.5 px-3.5 py-3" aria-busy="true" data-testid="why-insight-generating">
                    <span className="ai-mark flex-none">✦ Why</span>
                    <span className="sm row gap-2">
                      <LoaderCircle className="size-4 animate-spin" aria-hidden />
                      Working out why so many chose the same wrong option…
                    </span>
                  </div>
                )}
                {hasOptions && insight.data?.status === "not_applicable" && insight.data.reason === "AI_PAUSED" && (
                  <div className="ai row gap-2.5 px-3.5 py-3">
                    <span className="ai-mark flex-none">✦ Why</span>
                    <span className="sm">No explanation while AI is paused this month. The numbers above are complete.</span>
                  </div>
                )}
                {whyHeld && curFlag && (
                  <span className="xs muted">
                    No &quot;Why {curFlag.popular.letters?.join(", ")}&quot; for Q{current.item.n} while its key is in question: {curFlag.popular.letters?.join(", ")} may be the right answer.
                  </span>
                )}
              </article>
            </section>

            <section ref={fillRef} className={`card rise ${fillH !== null ? "k-fill k-fill-panel" : "scrollx"}`} style={{ ["--i" as string]: 2, height: fillH ?? undefined, overflow: fillH !== null ? "hidden" : undefined }}>
              <div className="pad row between wrap gap-2 border-b border-line-2">
                <span className="h3">Hardest questions</span>
                <span className="xs muted">Discrimination: did students who scored well overall get it right more often?</span>
              </div>
              <div className="k-fill-body scrollx">
                <table className="table min-w-[760px]" data-testid="hardest-table">
                  <thead>
                    <tr>
                      <th>Q</th>
                      <th>Chapter</th>
                      <th>Type</th>
                      <th className="num">Right</th>
                      <th>Most chosen wrong</th>
                      <th className="num">Avg time</th>
                      <th>Discrimination</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hardest.slice(0, 8).map((q) => (
                      <tr key={q.item.questionId} className="cursor-pointer" onClick={() => review(q.item.n)}>
                        <td className="mono sm">Q{q.item.n}</td>
                        <td className="sm">{q.item.chapter ?? q.item.sectionName}</td>
                        <td>
                          <span className="badge b-grey">{TYPE_LABEL[q.item.type]}</span>
                        </td>
                        <td className="sm num">{q.accuracy}%</td>
                        <td className="sm">{mostWrong(q)}</td>
                        <td className="sm num">{clock(q.avgTime)}</td>
                        <td>
                          <Discrimination d={q.discrimination} corrected={doneFor.has(q.item.questionId)} />
                        </td>
                      </tr>
                    ))}
                    {!hardest.length && (
                      <tr>
                        <td colSpan={7} className="sm muted py-8 text-center">
                          No answers for these questions yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
      {current && fixOpen && (
        <FixKeyDrawer
          key={current.item.questionId}
          open
          onClose={() => setFixOpen(false)}
          testId={testId}
          testName={testName}
          stat={current}
          submissions={submissions.length}
          onStarted={(c) => {
            setFinished(null);
            setRunningId(c.id);
            qc.setQueryData(["m6", "key-fix", testId, c.id], c);
          }}
        />
      )}
    </>
  );
}

function Discrimination({ d, corrected }: { d: number | null; corrected: boolean }) {
  if (corrected) return <span className="badge b-navy">Key corrected</span>;
  if (d === null) return <span className="xs muted">—</span>;
  if (d < 0) return <span className="badge b-amber" title={`Index ${d.toFixed(2)}: weaker students got it right more often than stronger ones`}>Negative · check key</span>;
  if (d < 0.2) return <span className="badge b-amber" title={`Index ${d.toFixed(2)}`}>Weak</span>;
  return <span className="badge b-green" title={`Index ${d.toFixed(2)}`}>Good</span>;
}

/** key-check-clear: closable (remembered for this tab). */
function KcClear({ checked, skipped, testId }: { checked: number; skipped: number; testId: string }) {
  const k = `iitp:analysis:kc-clear:${testId}`;
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(k) === "1");
    } catch {
      /* storage blocked: show it */
    }
  }, [k]);
  if (hidden) return null;
  return (
    <AnBanner
      tone="quiet"
      icon={<CircleCheck className="size-4" aria-hidden />}
      action={
        <button
          type="button"
          className="an-x"
          aria-label="Hide"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem(k, "1");
            } catch {
              /* ignore */
            }
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      }
    >
      <b>Answer-key check done: nothing looks wrong</b> in {checked} checked question{checked === 1 ? "" : "s"}.
      {skipped > 0 ? ` ${skipped} question${skipped === 1 ? "" : "s"} with no common answer ${skipped === 1 ? "was" : "were"} skipped.` : ""}
    </AnBanner>
  );
}
