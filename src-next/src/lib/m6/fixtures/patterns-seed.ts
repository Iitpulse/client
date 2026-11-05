/*
  Full sample patterns for the shared sample world (seed.ts patterns), all 5 types with labelled partial marking.
  Subjects are the backend's real ones (legacy GET /questions/subject/subjects), never hardcoded names.
*/
import { api } from "../../api";
import type { Marking, Pattern, PatternSection, PatternSubsection, QuestionType, Ref } from "../../m6-contract";
import { sampleWorld } from "./seed";

let subjectsCache: Promise<Ref[]> | null = null;
export function sampleSubjects(): Promise<Ref[]> {
  if (!subjectsCache)
    subjectsCache = (async () => {
      try {
        const r = await api.subjects.getAll();
        const d = r.data as { data?: Array<{ _id: string; name: string }> } | Array<{ _id: string; name: string }>;
        const rows = Array.isArray(d) ? d : d?.data ?? [];
        const refs = rows.filter((s) => s.name && !/^QA /.test(s.name)).map((s) => ({ id: s._id, name: s.name }));
        if (refs.length) return refs;
      } catch {
        /* offline sample */
      }
      return [
        { id: "sample-subject-1", name: "Subject 1" },
        { id: "sample-subject-2", name: "Subject 2" },
        { id: "sample-subject-3", name: "Subject 3" },
      ];
    })();
  return subjectsCache;
}

const M = (correct: number, incorrect: number, partial: Marking["partial"] = []): Marking => ({ correct, incorrect, partial });

let n = 0;
function sub(o: Partial<PatternSubsection> & Pick<PatternSubsection, "name" | "type" | "totalQuestions">): PatternSubsection {
  n += 1;
  return {
    id: `sample-sub-${n}`,
    description: null,
    paragraph: null,
    toAttempt: o.totalQuestions,
    marking: M(4, -1),
    ...o,
  };
}

function totals(sections: PatternSection[]): Pattern["totals"] {
  let questions = 0;
  let toAttempt = 0;
  let marks = 0;
  for (const s of sections)
    for (const x of s.subsections) {
      questions += x.totalQuestions;
      toAttempt += x.toAttempt;
      marks += x.toAttempt * x.marking.correct;
    }
  return { sections: sections.length, questions, toAttempt, marks };
}

let cache: Promise<Pattern[]> | null = null;

/** The sample world's patterns, full shape. Ids match seed.ts. */
export function samplePatterns(): Promise<Pattern[]> {
  if (!cache) cache = build();
  return cache;
}

async function build(): Promise<Pattern[]> {
  const w = await sampleWorld();
  const subj = await sampleSubjects();
  const S = (i: number) => subj[i % subj.length];
  n = 0;
  const base = (i: number) => w.patterns[i];
  const now = Date.now();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

  const fullSections = (): PatternSection[] =>
    [0, 1, 2].map((i) => ({
      id: `sample-sec-full-${i}`,
      name: S(i).name,
      subject: S(i),
      subsections: [
        sub({ name: "Section A", type: "single", totalQuestions: 20, toAttempt: 20, marking: M(4, -1) }),
        sub({ name: "Section B", type: "integer", totalQuestions: 5, toAttempt: 5, marking: M(4, -1) }),
      ],
    }));

  const sectional: PatternSection[] = [
    {
      id: "sample-sec-sect-0",
      name: S(0).name,
      subject: S(0),
      subsections: [
        sub({ name: "Single correct", type: "single", totalQuestions: 15, marking: M(4, -1) }),
        sub({ name: "More than one correct", type: "multiple", totalQuestions: 5, marking: M(4, -2, [{ count: 3, marks: 3 }, { count: 2, marks: 2 }, { count: 1, marks: 1 }]) }),
        sub({ name: "Numerical", type: "integer", totalQuestions: 5, marking: M(4, 0) }),
      ],
    },
  ];

  const advanced: PatternSection[] = [0, 1, 2].map((i) => ({
    id: `sample-sec-adv-${i}`,
    name: S(i).name,
    subject: S(i),
    subsections: [
      sub({ name: "One correct", type: "single", totalQuestions: 4, marking: M(3, -1) }),
      sub({ name: "One or more correct", type: "multiple", totalQuestions: 3, marking: M(4, -2, [{ count: 3, marks: 3 }, { count: 2, marks: 2 }, { count: 1, marks: 1 }]) }),
      sub({ name: "Paragraph", type: "paragraph", paragraph: { setSize: 2, childType: "single" }, totalQuestions: 4, marking: M(3, -1) }),
      sub({ name: "Match the lists", type: "matrix", totalQuestions: 2, marking: M(4, -1, [{ count: 3, marks: 3 }, { count: 2, marks: 2 }, { count: 1, marks: 1 }]) }),
      sub({ name: "Numerical", type: "integer", totalQuestions: 6, toAttempt: 5, marking: M(4, 0) }),
    ],
  }));

  const weekly: PatternSection[] = [
    {
      id: "sample-sec-weekly-0",
      name: S(1).name,
      subject: S(1),
      subsections: [sub({ name: "Questions", type: "single", totalQuestions: 30, marking: M(4, -1) })],
    },
  ];

  const make = (i: number, sections: PatternSection[], usedBy: number, lastUsedDaysAgo: number | null, createdDaysAgo: number): Pattern => ({
    ...base(i),
    sections,
    totals: totals(sections),
    usedBy,
    locked: usedBy > 0,
    lastUsedAt: lastUsedDaysAgo == null ? null : iso(lastUsedDaysAgo),
    createdAt: iso(createdDaysAgo),
    updatedAt: iso(Math.min(createdDaysAgo, 3)),
  });

  return [
    make(0, fullSections(), 41, 1, 120),
    make(1, sectional, 12, 2, 90),
    make(2, advanced, 0, null, 6),
    make(3, weekly, 3, 9, 40),
  ];
}

export function patternTypes(p: Pattern): QuestionType[] {
  const s = new Set<QuestionType>();
  p.sections.forEach((x) => x.subsections.forEach((y) => s.add(y.type)));
  return [...s];
}
export function recomputeTotals(sections: PatternSection[]): Pattern["totals"] {
  return totals(sections);
}
