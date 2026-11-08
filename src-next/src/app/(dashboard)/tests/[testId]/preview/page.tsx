"use client";

/*
  Test paper preview (legacy route, plan: token restyle only; G19). Every question is drawn with the bank's renderer
  (QuestionBody: KaTeX through MathText, paragraph passages with their questions, matrix List I / List II and key),
  and each sub-section's type is labelled as on Admin-Questions (Single, Multiple, Numerical, Paragraph, Matrix).
  The student links tab moved to the Admin-TestLinks drawer (Tests row menu, builder). "Preview as student" opens the
  real exam screen read only (board Admin-PreviewStudent, lib/student-preview).
*/
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { QuestionBody } from "@/components/question-body";
import { NotFoundState, PageError, PageSkeleton, Segmented, apiError } from "@/components/kit";
import api from "@/lib/api";
import { TYPE_LABEL } from "@/lib/ai-admin";
import type { BankQuestion, QuestionKind } from "@/lib/question-queries";
import { openStudentPreview } from "@/lib/student-preview";

interface PreviewSubSection {
  id: string;
  name: string;
  type: string;
  toBeAttempted?: number;
  markingScheme?: { correct?: number[]; incorrect?: number };
  marking?: { correct?: number; incorrect?: number };
  questions?: Array<Omit<BankQuestion, "_kind"> & { id?: string }>;
}
interface PreviewSection {
  id: string;
  name: string;
  subject?: string | { name?: string };
  subSections: PreviewSubSection[];
}
interface PreviewTest {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  durationInMinutes: number;
  status: string;
  batches?: Array<{ id: string; name: string }>;
  sections: PreviewSection[];
}

const KIND: Record<string, QuestionKind> = { single: "mcq", multiple: "mcq", integer: "numerical", numerical: "numerical", paragraph: "paragraph", matrix: "matrix" };
const kindOf = (subType: string, q: { type?: string }): QuestionKind => KIND[subType] ?? KIND[q.type ?? ""] ?? "mcq";
const typeLabel = (t: string) => TYPE_LABEL[t] ?? TYPE_LABEL[t === "numerical" ? "integer" : t] ?? t;
const subjectName = (s: PreviewSection) => (typeof s.subject === "string" ? s.subject : s.subject?.name) || "";
const marks = (ss: PreviewSubSection) => {
  const c = ss.marking?.correct ?? ss.markingScheme?.correct?.[0] ?? 4;
  const w = Math.abs(ss.marking?.incorrect ?? ss.markingScheme?.incorrect ?? 1);
  return w ? `+${c} · −${w}` : `+${c}`;
};
/** a paragraph set counts each of its questions */
const countOf = (ss: PreviewSubSection) => (ss.questions ?? []).reduce((n, q) => n + (ss.type === "paragraph" ? Math.max(1, q.questions?.length ?? 1) : 1), 0);
const STATUS: Record<string, [string, string]> = { draft: ["b-grey", "Draft"], scheduled: ["b-sky", "Scheduled"], published: ["b-green", "Published"], live: ["b-green", "Live"], ended: ["b-grey", "Ended"] };

interface Flat {
  q: BankQuestion;
  n: number;
  section: string;
  sub: string;
  subId: string;
  type: string;
}

function TestPreview({ testId }: { testId: string }) {
  const res = useQuery({
    queryKey: ["tests", "legacy-preview", testId],
    queryFn: async () => {
      const r = await api.tests.getById(testId);
      return (r.data?.data || r.data) as PreviewTest;
    },
    retry: false,
  });
  const [view, setView] = React.useState<"overview" | "questions">("overview");
  const [cur, setCur] = React.useState(0);

  const flat = React.useMemo<Flat[]>(() => {
    const out: Flat[] = [];
    let n = 1;
    for (const s of res.data?.sections ?? [])
      for (const ss of s.subSections ?? [])
        for (const raw of ss.questions ?? []) {
          const q = { ...raw, _id: raw._id || raw.id || "", _kind: kindOf(ss.type, raw) } as BankQuestion;
          out.push({ q, n, section: subjectName(s) || s.name, sub: ss.name, subId: `${s.id}|${ss.id}`, type: ss.type });
          n += ss.type === "paragraph" ? Math.max(1, q.questions?.length ?? 1) : 1;
        }
    return out;
  }, [res.data]);

  const test = res.data;
  const status = test ? STATUS[test.status] ?? ["b-grey", test.status] : null;
  const total = (test?.sections ?? []).reduce((a, s) => a + s.subSections.reduce((b, ss) => b + countOf(ss), 0), 0);

  const topbar = (
    <Topbar
      title={test ? `${test.name} · paper` : "Test preview"}
      back={{ href: "/tests", label: "Tests" }}
      badge={status ? <span className={`badge ${status[0]}`}>{status[1]}</span> : undefined}
      actions={
        test ? (
          <>
            <Link href={`/tests/${encodeURIComponent(testId)}/edit`} className="btn btn-ghost btn-sm">
              Edit test
            </Link>
            <button type="button" className="btn btn-secondary btn-sm" disabled={!flat.length} onClick={() => openStudentPreview(testId)} data-testid="preview-as-student">
              Preview as student
            </button>
          </>
        ) : undefined
      }
    />
  );

  if (res.isLoading)
    return (
      <>
        {topbar}
        <main className="col gap-4 px-7 pt-5 pb-10">
          <PageSkeleton />
        </main>
      </>
    );
  if (!test) {
    const e = res.error ? apiError(res.error) : null;
    return (
      <>
        {topbar}
        <main className="col gap-4 px-7 pt-5 pb-10">
          {!e || e.status === 404 ? <NotFoundState deleted="This test doesn't exist or was deleted" /> : <PageError what="the test" code={e.code ?? undefined} onRetry={() => res.refetch()} />}
        </main>
      </>
    );
  }

  const current = flat[Math.min(cur, Math.max(0, flat.length - 1))];
  return (
    <>
      {topbar}
      <main className="col gap-4 px-7 pt-5 pb-10" data-testid="test-preview">
        <div className="row between wrap gap-3">
          <Segmented
            ariaLabel="View"
            value={view}
            onChange={setView}
            options={[
              { value: "overview", label: "Overview" },
              { value: "questions", label: "Question by question" },
            ]}
          />
          <span className="xs muted">
            {test.durationInMinutes} min · {total === 1 ? "1 question" : `${total} questions`} · {test.batches?.length ? test.batches.map((b) => b.name).join(", ") : "no batch yet"}
          </span>
        </div>
        {test.description && <p className="sm muted m-0">{test.description}</p>}

        {!flat.length ? (
          <div className="card col items-center gap-1.5 p-12 text-center">
            <span className="h3">No questions picked yet</span>
            <span className="sm muted">Pick them in the test builder.</span>
            <Link href={`/tests/${encodeURIComponent(testId)}/pick`} className="btn btn-secondary btn-sm mt-2">
              Pick questions
            </Link>
          </div>
        ) : view === "overview" ? (
          test.sections.map((s) => (
            <section key={s.id} className="card col" data-testid="preview-section">
              <div className="pad row between border-b border-line-2">
                <span className="h3">{s.name}</span>
                {subjectName(s) && subjectName(s) !== s.name && <span className="badge b-grey">{subjectName(s)}</span>}
              </div>
              {s.subSections.map((ss) => {
                const items = flat.filter((f) => f.subId === `${s.id}|${ss.id}`);
                const count = countOf(ss);
                return (
                  <div key={ss.id} className="col gap-3 border-b border-line-2 px-4 py-3.5 last:border-b-0">
                    <div className="row between wrap gap-2">
                      <span className="col gap-px">
                        <span className="sm font-semibold">{ss.name}</span>
                        <span className="xs muted">
                          {count === 1 ? "1 question" : `${count} questions`}
                          {ss.toBeAttempted && ss.toBeAttempted < count ? ` · attempt any ${ss.toBeAttempted}` : ""}
                        </span>
                      </span>
                      <span className="row gap-1.5">
                        <span className="badge b-grey" data-testid="preview-type">{typeLabel(ss.type)}</span>
                        <span className="badge b-grey num">{marks(ss)}</span>
                      </span>
                    </div>
                    {items.map((f) => (
                      <div key={`${f.n}-${f.q._id}`} className="row items-start gap-3 rounded-control border border-line-2 bg-surface px-3 py-2.5">
                        <span className="mono xs muted shrink-0 pt-1">{f.type === "paragraph" && (f.q.questions?.length ?? 0) > 1 ? `Q${f.n}–${f.n + (f.q.questions?.length ?? 1) - 1}` : `Q${f.n}`}</span>
                        <div className="min-w-0 grow">
                          <QuestionBody q={f.q} showAnswers variant="pane" />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </section>
          ))
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section className="card col" data-testid="preview-question">
              <div className="pad row between wrap gap-2 border-b border-line-2">
                <span className="col gap-px">
                  <span className="h3">{current.type === "paragraph" && (current.q.questions?.length ?? 0) > 1 ? `Questions ${current.n}–${current.n + (current.q.questions?.length ?? 1) - 1}` : `Question ${current.n}`}</span>
                  <span className="xs muted">
                    {current.section} · {current.sub}
                  </span>
                </span>
                <span className="badge b-grey" data-testid="preview-type">{typeLabel(current.type)}</span>
              </div>
              <div className="pad">
                <QuestionBody q={current.q} showAnswers />
              </div>
              <div className="row between border-t border-line-2 px-4 py-3">
                <button type="button" className="btn btn-secondary btn-sm" disabled={cur === 0} onClick={() => setCur((c) => Math.max(0, c - 1))}>
                  Previous
                </button>
                <span className="xs muted num">
                  {cur + 1} of {flat.length}
                </span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={cur >= flat.length - 1} onClick={() => setCur((c) => Math.min(flat.length - 1, c + 1))}>
                  Next
                </button>
              </div>
            </section>
            <aside className="card pad col gap-3" aria-label="Questions">
              <span className="sm font-semibold">Questions</span>
              <div className="row wrap gap-1.5">
                {flat.map((f, i) => (
                  <button
                    type="button"
                    key={`${f.n}-${f.q._id}`}
                    onClick={() => setCur(i)}
                    aria-current={i === cur ? "true" : undefined}
                    className={`btn btn-sm h-8 min-w-8 px-1.5 mono ${i === cur ? "btn-primary" : "btn-secondary"}`}
                  >
                    {f.n}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

export default function Page() {
  const { testId } = useParams<{ testId: string }>();
  return <TestPreview testId={testId} />;
}
