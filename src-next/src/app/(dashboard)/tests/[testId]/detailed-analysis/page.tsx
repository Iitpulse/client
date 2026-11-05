"use client";

/*
  Admin-Analysis board (questions view, canvas v84). Data: GET /test/:id (the paper) and GET /test/result/admin
  (submissions). M5: GET /ai/admin/tests/:id/key-check ("✦ Check answer key": flags only; fixing the key does not
  re-score, M5 has no re-scoring) and GET /ai/admin/tests/:id/questions/:qid/insight ("✦ Why B", fetched for the
  question on screen). "⚠ Negative · check key" in Hardest questions stays client-side (discrimination index).
*/

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MathText } from "@iitpulse/ui";

import { Topbar } from "@/components/admin/Topbar";
import { useKeyCheck, useQuestionInsight } from "@/lib/queries-tests-admin";
import type { KeyCheckFlag } from "@/contracts/m5";
import { api } from "@/lib/api";
import { ACC_BG, analyseQuestions, clock, fmt, sectionMax, type Paper, type QuestionStat, type RawSubmission } from "@/lib/results";
import "../results.css";

const LETTERS = "ABCDEFGHIJ";
const DIFF: Record<string, string> = { easy: "b-green", medium: "b-amber", hard: "b-red" };

function discriminationBadge(d: number | null) {
  if (d === null) return <span className="xs muted">—</span>;
  if (d < 0) return <span className="badge b-amber" title={`Index ${d.toFixed(2)}: weaker students got it right more often than stronger ones`}>⚠ Negative · check key</span>;
  if (d < 0.2) return <span className="badge b-amber" title={`Index ${d.toFixed(2)}`}>Weak</span>;
  return <span className="badge b-green" title={`Index ${d.toFixed(2)}`}>Good</span>;
}

/** "B", "A, C", "12" or "10–11": an answer as the board writes it. */
function answerLabel(a: { letters?: string[]; optionIds?: string[]; value?: number; range?: { min: number; max: number } } | null | undefined): string {
  if (!a) return "?";
  if (a.letters?.length) return a.letters.join(", ");
  if (a.value !== undefined) return String(a.value);
  if (a.range) return a.range.min === a.range.max ? String(a.range.min) : `${a.range.min}–${a.range.max}`;
  return a.optionIds?.join(", ") ?? "?";
}

/** One "✦ Check answer key" row (board: amber strip above the grid). */
function KeyFlag({ f, onReview }: { f: KeyCheckFlag; onReview: () => void }) {
  const popular = answerLabel(f.popular);
  const share = Math.round(f.popular.share * 100);
  return (
    <div className="row gap-3 rounded-[12px] border border-[#F1D29A] bg-warning-50 px-4 py-3.5" data-testid="key-check-flag" data-verdict={f.aiVerdict ?? "none"}>
      <span className="ai-mark flex-none whitespace-nowrap text-[#8A4F00]">✦ Check answer key</span>
      <span className="col grow gap-1">
        <span className="sm">
          Q{f.n}: {share}% of the batch{f.popular.topTenCount > 0 ? `, including ${f.popular.topTenCount} of the top 10,` : ""} chose <b>{popular}</b>, but the key
          says <b>{answerLabel(f.key)}</b>.{f.aiVerdict === "keyLooksWrong" && f.aiAnswer ? ` Working it through also gives ${answerLabel(f.aiAnswer)}.` : ""}
        </span>
        <span className="xs text-[#5C3600]">Fixing the key in the question bank won&apos;t change scores already given.</span>
      </span>
      {f.aiVerdict === "keyLooksWrong" && <span className="badge b-amber flex-none">Key looks wrong</span>}
      <button type="button" className="btn btn-secondary btn-sm flex-none" onClick={onReview}>
        Review Q{f.n}
      </button>
    </div>
  );
}

function options(q: QuestionStat) {
  return q.question.en?.options ?? q.question.options ?? [];
}

/** "B · 47%", "Skipped · 41%" or "—": the most common wrong outcome. */
function mostWrong(q: QuestionStat): string {
  if (!q.total) return "—";
  const correct = new Set((q.question.correctAnswers ?? []).map(String));
  let best: [string, number] = ["", 0];
  options(q).forEach((o, i) => {
    const c = q.optionCounts[o.id] ?? 0;
    if (!correct.has(o.id) && c > best[1]) best = [LETTERS[i] ?? o.id, c];
  });
  if (q.skipped > best[1]) best = ["Skipped", q.skipped];
  if (!best[1] && q.wrong) return `Wrong · ${Math.round((q.wrong / q.total) * 100)}%`;
  return best[1] ? `${best[0]} · ${Math.round((best[1] / q.total) * 100)}%` : "—";
}

export default function DetailedAnalysisPage() {
  const params = useParams();
  const testId = params.testId as string;

  const { data, isLoading } = useQuery({
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
  const stats = React.useMemo(() => analyseQuestions(test, submissions), [test, submissions]);
  const hardest = React.useMemo(() => [...stats].filter((q) => q.total).sort((a, b) => a.accuracy - b.accuracy || a.n - b.n), [stats]);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [tableView, setTableView] = React.useState<"hardest" | "all">("hardest");
  const current = stats.find((q) => q.n === selected) ?? hardest[0] ?? stats[0];
  const detailRef = React.useRef<HTMLElement>(null);
  const keyCheck = useKeyCheck(testId, submissions.length > 0);
  // keyLooksRight: the model agrees with the key, so nothing to flag.
  const flags = (keyCheck.data?.flags ?? []).filter((f) => f.aiVerdict !== "keyLooksRight");
  const hasOptions = !!current && options(current).length > 0;
  const insight = useQuestionInsight(testId, current?.id, hasOptions && submissions.length > 0);
  const review = (n: number) => {
    setSelected(n);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sectionRows = React.useMemo(() => {
    if (!test?.sections) return [];
    return test.sections.map((s) => {
      const mx = sectionMax(s) || 1;
      const scores = submissions
        .map((sub) => sub.sections?.find((x) => x.id === s.id))
        .filter(Boolean)
        .map((sec) => {
          let sum = 0;
          for (const ss of sec!.subSections ?? []) for (const q of Object.values(ss.questions ?? {})) sum += Number((q as { marks?: number }).marks ?? 0);
          return (sum / mx) * 100;
        });
      const qs = stats.filter((q) => q.sectionId === s.id);
      return {
        id: s.id,
        name: s.name,
        questions: qs.length,
        avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        hi: scores.length ? Math.max(...scores) : 0,
        lo: scores.length ? Math.min(...scores) : 0,
        accuracy: qs.length ? qs.reduce((a, q) => a + q.accuracy, 0) / qs.length : 0,
      };
    });
  }, [test, submissions, stats]);

  const title = test ? `${test.name} · question analysis` : "Question analysis";
  const tabs = (
    <div className="seg" aria-label="Analysis views">
      <span className="tab on" aria-current="page">Questions</span>
      <Link href={`/tests/${testId}/result`} className="tab">Students</Link>
    </div>
  );

  if (isLoading) {
    return (
      <>
        <Topbar title="Question analysis" back={{ href: `/tests/${testId}/result`, label: "Results" }} />
        <main className="col gap-4 px-7 pt-5 pb-10">
          <div className="grid gap-3.5 lg:grid-cols-5">
            <span className="skel h-[320px] lg:col-span-2" />
            <span className="skel h-[320px] lg:col-span-3" />
          </div>
        </main>
      </>
    );
  }

  const tableRows = tableView === "hardest" ? hardest.slice(0, 8) : stats;

  return (
    <>
      <Topbar title={title} back={{ href: `/tests/${testId}/result`, label: "Results" }} actions={tabs} />
      <main className="col gap-4 px-7 pt-5 pb-10">
        {!submissions.length || !current ? (
          <div className="card col items-center gap-1.5 p-12 text-center">
            <span className="h3">No submissions yet</span>
            <span className="sm muted">The analysis appears once students submit the test.</span>
          </div>
        ) : (
          <>
            {flags.map((f) => (
              <KeyFlag key={f.questionId} f={f} onReview={() => review(f.n)} />
            ))}
            <section className="grid items-start gap-3.5 lg:grid-cols-5">
              <article className="card pad-lg col rise gap-3 lg:col-span-2">
                <div className="row between wrap gap-2">
                  <span className="h3">Accuracy by question</span>
                  <div className="row xs muted gap-1.5">
                    <span className="size-3 rounded-[3px]" style={{ background: ACC_BG(0) }} />
                    <span>&lt;40</span>
                    <span aria-hidden>·</span>
                    <span className="size-3 rounded-[3px]" style={{ background: ACC_BG(50) }} />
                    <span>40–75</span>
                    <span aria-hidden>·</span>
                    <span className="size-3 rounded-[3px]" style={{ background: ACC_BG(90) }} />
                    <span>&gt;75%</span>
                  </div>
                </div>
                <div className="grid grid-cols-10 gap-[5px]">
                  {stats.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      className={`rs-qc ${q.accuracy < 40 && q.total ? "low" : ""} ${q.n === current.n ? "on" : ""}`}
                      style={{ background: q.total ? ACC_BG(q.accuracy) : "var(--line-2)" }}
                      title={`Q${q.n} · ${q.total ? `${q.accuracy}%` : "no responses"}`}
                      aria-label={`Q${q.n}, ${q.total ? `${q.accuracy}% correct` : "no responses"}`}
                      aria-pressed={q.n === current.n}
                      onClick={() => setSelected(q.n)}
                    >
                      {q.n}
                    </button>
                  ))}
                </div>
                <span className="xs muted">{submissions.length} submissions · select a question to see how the batch answered it</span>
              </article>

              <article ref={detailRef} className="card pad-lg col rise scroll-mt-20 gap-3.5 lg:col-span-3" style={{ ["--i" as string]: 1 }} data-testid="analysis-question">
                <div className="row between wrap gap-2">
                  <div className="row wrap gap-2.5">
                    <span className="h3 mono">Q{current.n}</span>
                    <span className="badge b-grey">{current.sectionName}</span>
                    {current.question.chapters?.[0]?.name && <span className="badge b-grey">{current.question.chapters[0].name}</span>}
                    {current.question.difficulty && (
                      <span className={`badge ${DIFF[current.question.difficulty] ?? "b-grey"}`}>
                        {current.question.difficulty[0].toUpperCase() + current.question.difficulty.slice(1)}
                      </span>
                    )}
                  </div>
                  <span className="sm muted">
                    avg time {clock(current.avgTime)} · batch accuracy {current.accuracy}%
                  </span>
                </div>
                {current.question.en?.question ? (
                  <MathText html as="div" className="font-serif text-[16px] leading-[1.55]" text={current.question.en.question} />
                ) : (
                  <span className="sm muted">The question text is not available.</span>
                )}
                <div className="col gap-2">
                  {options(current).length > 0 ? (
                    options(current).map((o, i) => {
                      const c = current.optionCounts[o.id] ?? 0;
                      const pct = current.total ? Math.round((c / current.total) * 100) : 0;
                      const ok = (current.question.correctAnswers ?? []).map(String).includes(o.id);
                      return (
                        <div key={o.id} className="row gap-2.5">
                          <span className="mono sm w-[22px]">{LETTERS[i]}</span>
                          <MathText html as="div" className="w-[200px] flex-none font-serif text-[14px] leading-snug" text={o.value} />
                          <div className="row grow h-[26px] gap-2 rounded-md bg-ground">
                            <div className="rs-ob" style={{ width: `${pct}%`, background: ok ? "#CDE9D7" : pct >= 25 ? "#F6C9C9" : "var(--navy-100)", animationDelay: `${i * 0.08}s` }} />
                            <span className={`xs num whitespace-nowrap font-semibold ${ok ? "text-success" : "muted"}`}>
                              {pct}%{ok ? " · correct" : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      {[
                        ["✓", "Correct", current.correct, "#CDE9D7"],
                        ["✗", "Wrong", current.wrong, "#F6C9C9"],
                      ].map(([k, label, n, bg]) => {
                        const pct = current.total ? Math.round(((n as number) / current.total) * 100) : 0;
                        return (
                          <div key={label as string} className="row gap-2.5">
                            <span className="mono sm w-[22px]">{k}</span>
                            <span className="w-[200px] flex-none sm">{label}</span>
                            <div className="row grow h-[26px] gap-2 rounded-md bg-ground">
                              <div className="rs-ob" style={{ width: `${pct}%`, background: bg as string }} />
                              <span className="xs num muted font-semibold">{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                  <div className="row gap-2.5">
                    <span className="mono sm w-[22px]">–</span>
                    <span className="w-[200px] flex-none" />
                    <div className="row grow h-[26px] gap-2 rounded-md bg-ground">
                      <div className="rs-ob" style={{ width: `${current.total ? Math.round((current.skipped / current.total) * 100) : 0}%`, background: "var(--line-2)" }} />
                      <span className="xs num muted font-semibold">{current.total ? Math.round((current.skipped / current.total) * 100) : 0}% skipped</span>
                    </div>
                  </div>
                </div>
                {hasOptions && insight.data?.status === "ready" && insight.data.insight && (
                  <div className="ai row gap-2.5 px-3.5 py-3" data-testid="why-insight">
                    <span className="ai-mark flex-none">✦ Why {insight.data.insight.option.letter}</span>
                    <MathText as="span" className="sm" text={[insight.data.insight.text, insight.data.insight.cue].filter(Boolean).join(" ")} />
                  </div>
                )}
                {hasOptions && insight.data?.status === "generating" && (
                  <div className="ai row gap-2.5 px-3.5 py-3" aria-busy="true" data-testid="why-insight-generating">
                    <span className="ai-mark flex-none">✦ Why</span>
                    <span className="skel h-4 grow" />
                  </div>
                )}
              </article>
            </section>

            <section className="card scrollx rise" style={{ ["--i" as string]: 2 }}>
              <div className="pad row between wrap gap-2 border-b border-line-2">
                <span className="h3">{tableView === "hardest" ? "Hardest questions" : "All questions"}</span>
                <div className="seg">
                  <button type="button" className={`tab ${tableView === "hardest" ? "on" : ""}`} onClick={() => setTableView("hardest")}>Hardest</button>
                  <button type="button" className={`tab ${tableView === "all" ? "on" : ""}`} onClick={() => setTableView("all")}>All <span className="count">{stats.length}</span></button>
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Q</th>
                    <th>Chapter</th>
                    <th className="num">Accuracy</th>
                    <th className="num">Correct</th>
                    <th className="num">Wrong</th>
                    <th className="num">Skipped</th>
                    <th>Most chosen wrong</th>
                    <th className="num">Avg time</th>
                    <th>Discrimination</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((q) => (
                    <tr key={q.id} className="cursor-pointer" onClick={() => setSelected(q.n)}>
                      <td className="mono sm">{q.n}</td>
                      <td className="sm">{q.question.chapters?.[0]?.name ?? q.sectionName}</td>
                      <td className="sm num">{q.total ? `${q.accuracy}%` : "—"}</td>
                      <td className="sm num text-success">{q.correct}</td>
                      <td className="sm num text-danger">{q.wrong}</td>
                      <td className="sm num muted">{q.skipped}</td>
                      <td className="sm">{mostWrong(q)}</td>
                      <td className="sm num">{clock(q.avgTime)}</td>
                      <td>{discriminationBadge(q.discrimination)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {sectionRows.length > 0 && (
              <section className="card scrollx rise" style={{ ["--i" as string]: 3 }}>
                <div className="pad border-b border-line-2">
                  <span className="h3">Sections</span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th className="num">Questions</th>
                      <th className="num">Avg score</th>
                      <th className="num">Highest</th>
                      <th className="num">Lowest</th>
                      <th className="num">Avg accuracy</th>
                      <th className="w-[160px]"><span className="sr-only">Average</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((s, i) => (
                      <tr key={s.id}>
                        <td className="sm font-semibold">{s.name}</td>
                        <td className="sm num">{s.questions}</td>
                        <td className="sm num">{fmt(s.avg, 0)}%</td>
                        <td className="sm num">{fmt(s.hi, 0)}%</td>
                        <td className="sm num">{fmt(s.lo, 0)}%</td>
                        <td className="sm num">{fmt(s.accuracy, 0)}%</td>
                        <td>
                          <div className="bar h-1.5">
                            <i style={{ width: `${Math.max(0, Math.min(100, s.avg))}%`, animationDelay: `${i * 0.1}s` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
