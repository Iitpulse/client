/*
  Sample answers for the test paper and the question picker (areas "paper", "picker"; see ../client.ts and
  ../paper.ts). In-memory: writes last until the page reloads.

  The sample bank mixes real dev-bank questions (single, multiple, integer: GET /questions/admin/search by the
  section's real subject; previews from the legacy question read) with sample paragraph sets and matrix questions
  (the dev bank has almost none), a few with an equation image, no solution or no Hindi. "Recently used" = used in
  the sample world's last ended test. Papers follow the test's pattern (fixtures/patterns-seed.ts).
*/
import { api } from "../../api";
import { questionsAdmin } from "../../ai-admin";
import type {
  ChildType,
  Difficulty,
  FillPreviewRequest,
  FillPreviewResponse,
  LangBlock,
  Pattern,
  PaperView,
  PaperWriteResponse,
  PickerPreview,
  PickerRow,
  PickerSearchRequest,
  PickerSearchResponse,
  QuestionFlags,
  QuestionType,
  Ref,
  SlotSource,
  TestRef,
} from "../../m6-contract";
import { fixtureError, scenario } from "../client";
import type { PaperTestHead } from "../paper";
import { samplePatterns } from "./patterns-seed";
import { sampleWorld, type SampleTest } from "./seed";
import { sampleTests } from "./tests";

/* ─────────────────────────────── sample bank ─────────────────────────────── */

interface SetChild {
  id: string;
  type: ChildType;
  stem: string;
  options: string[];
  answer: string[];
  range?: { from: number; to: number };
}

interface BankQ {
  id: string;
  type: QuestionType;
  subjectId: string;
  stem: string;
  chapter: Ref | null;
  topic: Ref | null;
  difficulty: Difficulty | null;
  flags: QuestionFlags;
  options?: string[];
  key?: string[];
  range?: { from: number; to: number };
  set?: { passage: string; children: SetChild[] };
  matrix?: { listI: string[]; listII: string[]; matches: Record<string, string[]> };
  /** from the dev bank: preview through the legacy question read */
  real: boolean;
  createdAt: string;
  timesUsed: number;
  lastUsed: (TestRef & { at: string }) | null;
  recent: TestRef | null;
}

const bank = new Map<string, BankQ>();
const pools = new Map<string, Promise<BankQ[]>>();

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const DIFF: Difficulty[] = ["easy", "medium", "hard"];

/** Sample stems by subject index on the dev bank (0, 1, 2 cycle). LaTeX inline. */
const STEMS: Record<number, { single: string[]; integer: string[]; multiple: string[]; passages: string[]; matrix: Array<{ q: string; I: string[]; II: string[] }> }> = {
  0: {
    single: [
      "A solid sphere rolls without slipping down an incline of angle $\\theta$. Its acceleration is",
      "A uniform rod of mass $m$ and length $L$ is pivoted at one end. A force $F$ acts perpendicular to the rod at its midpoint. The angular acceleration is",
      "The moment of inertia of a thin square plate of mass $M$ and side $a$ about a diagonal is",
      "A flywheel slows from $600$ rpm to $300$ rpm in $10\\,\\text{s}$. Its angular deceleration is",
      "A disc and a ring of equal mass and radius roll down the same incline from rest. Which reaches the bottom first?",
      "Two masses $m_1$ and $m_2$ hang over a light pulley. The tension in the string is",
    ],
    integer: ["A wheel turns $20$ times in $4\\,\\text{s}$. Its angular speed, in rad/s rounded to the nearest integer, is", "A ball is thrown up at $20\\,\\text{m s}^{-1}$. The maximum height, in metres ($g = 10\\,\\text{m s}^{-2}$), is"],
    multiple: ["For a body in pure rolling on a fixed surface, which of the following are true?", "Which of these quantities are conserved in an elastic collision?"],
    passages: [
      "A block of mass $m = 2\\,\\text{kg}$ rests on a rough incline of angle $37^\\circ$. The coefficient of friction is $\\mu = 0.5$. A force $F$ acts up along the incline. Take $g = 10\\,\\text{m s}^{-2}$.",
      "A uniform disc of radius $R$ spinning at $\\omega_0$ is placed gently on a rough floor. It slips at first, then rolls.",
      "Two blocks joined by a light string pass over a pulley of moment of inertia $I$ and radius $r$.",
    ],
    matrix: [
      { q: "For a uniform rod of mass $m$ and length $L$, match each quantity in List I with its value in List II.", I: ["$I$ about the centre", "$I$ about one end", "Radius of gyration about one end", "KE when rotating at $\\omega$ about one end"], II: ["$\\tfrac{mL^2}{12}$", "$\\tfrac{mL^2}{3}$", "$\\tfrac{L}{\\sqrt3}$", "$\\tfrac{mL^2\\omega^2}{6}$", "$\\tfrac{L}{2}$"] },
      { q: "Match each physical quantity in List I with its dimensions in List II.", I: ["Torque", "Angular momentum", "Moment of inertia"], II: ["$[ML^2T^{-2}]$", "$[ML^2T^{-1}]$", "$[ML^2]$", "$[MLT^{-1}]$"] },
    ],
  },
  1: {
    single: [
      "The hybridisation of the central atom in $\\mathrm{SF_4}$ is",
      "Which of the following has the highest first ionisation enthalpy?",
      "The oxidation state of Cr in $\\mathrm{K_2Cr_2O_7}$ is",
      "The number of moles of $\\mathrm{O_2}$ needed to burn $1$ mol of $\\mathrm{CH_4}$ completely is",
    ],
    integer: ["The number of unpaired electrons in $\\mathrm{Fe^{3+}}$ is", "The pH of a $10^{-3}\\,\\text{M}$ HCl solution is"],
    multiple: ["Which of the following are aromatic?", "Which statements about an ideal gas are correct?"],
    passages: ["$0.1$ mol of a weak acid $\\mathrm{HA}$ ($K_a = 10^{-5}$) is dissolved in $1\\,\\text{L}$ of water at $298\\,\\text{K}$.", "An organic compound $\\mathrm{C_4H_8O}$ gives a positive iodoform test and does not reduce Tollens' reagent."],
    matrix: [{ q: "Match each compound in List I with its shape in List II.", I: ["$\\mathrm{XeF_2}$", "$\\mathrm{SF_4}$", "$\\mathrm{BrF_5}$"], II: ["Linear", "See-saw", "Square pyramidal", "T-shaped"] }],
  },
  2: {
    single: [
      "If $z = 1 + i$, then $z^{8}$ equals",
      "The value of $\\displaystyle\\int_0^{\\pi/2} \\sin^2 x\\,dx$ is",
      "The number of real roots of $x^3 - 3x + 1 = 0$ is",
      "If $\\vec a \\cdot \\vec b = 0$ and $|\\vec a| = |\\vec b| = 1$, then $|\\vec a + \\vec b|$ is",
    ],
    integer: ["The number of ways to arrange the letters of LEVEL is", "If $\\lim_{x\\to0}\\dfrac{\\sin kx}{x} = 4$, then $k$ is"],
    multiple: ["Which of the following functions are continuous at $x = 0$?", "For the matrix $A = \\begin{pmatrix}1&2\\\\2&1\\end{pmatrix}$, which are true?"],
    passages: ["Let $f(x) = x^3 - 6x^2 + 9x + 1$ on $[0, 4]$.", "A bag has $4$ red and $6$ blue balls. Two balls are drawn one after another without replacement."],
    matrix: [{ q: "Match each function in List I with its derivative at $x = 0$ in List II.", I: ["$\\sin x$", "$e^{2x}$", "$\\ln(1+3x)$"], II: ["$1$", "$2$", "$3$", "$0$"] }],
  },
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const COLS = ["P", "Q", "R", "S", "T", "U"];

async function subjectChapters(subjectId: string): Promise<Array<Ref & { topics: Ref[] }>> {
  try {
    const r = await api.subjects.getAll();
    const d = r.data as { data?: unknown } | unknown[];
    const rows = (Array.isArray(d) ? d : (d as { data?: unknown[] }).data ?? []) as Array<{ _id: string; chapters?: Array<{ _id?: string; id?: string; name: string; topics?: Array<string | { name: string }> }> }>;
    const s = rows.find((x) => x._id === subjectId);
    return (s?.chapters ?? [])
      .filter((c) => c.name && !/^QA |Test Chapter|aiits/i.test(c.name))
      .map((c) => ({
        id: c.id ?? c._id ?? c.name,
        name: c.name.trim(),
        topics: (c.topics ?? []).map((t) => (typeof t === "string" ? { id: t, name: t } : { id: t.name, name: t.name })),
      }));
  } catch {
    return [];
  }
}

async function subjectIndex(subjectId: string): Promise<number> {
  const w = await samplePatterns();
  const ids: string[] = [];
  for (const p of w) for (const s of p.sections) if (s.subject && !ids.includes(s.subject.id)) ids.push(s.subject.id);
  const i = ids.indexOf(subjectId);
  return i < 0 ? 0 : i % 3;
}

async function recentAndOlder(): Promise<{ recent: TestRef & { at: string }; older: Array<TestRef & { at: string }> }> {
  const w = await sampleWorld();
  const ended = w.tests.filter((t) => t.state === "ended").sort((a, b) => (b.closesAt ?? "").localeCompare(a.closesAt ?? ""));
  const ref = (t: SampleTest) => ({ testId: t.testId, name: t.shortName ?? t.name, shortName: t.shortName, at: t.closesAt ?? new Date().toISOString() });
  const recent = ended[0] ? ref(ended[0]) : { testId: "sample-old", name: "Earlier test", shortName: null, at: new Date().toISOString() };
  return { recent, older: ended.slice(1).map(ref) };
}

function decorate(q: Omit<BankQ, "timesUsed" | "lastUsed" | "recent">, used: { recent: TestRef & { at: string }; older: Array<TestRef & { at: string }> }): BankQ {
  const h = hash(q.id);
  const timesUsed = h % 5 === 0 ? 0 : h % 4;
  const isRecent = h % 7 === 3;
  const lastUsed = isRecent ? used.recent : timesUsed && used.older.length ? used.older[h % used.older.length] : null;
  return { ...q, timesUsed: isRecent ? Math.max(1, timesUsed) : timesUsed, lastUsed, recent: isRecent ? used.recent : null };
}

/** All bank rows for one subject and one sub-section type (paragraph: every set size, the picker marks the wrong ones). */
async function pool(subjectId: string, type: QuestionType, childType: ChildType | "mixed" | null, setSize: number | null): Promise<BankQ[]> {
  const key = `${subjectId}:${type}:${childType ?? ""}:${setSize ?? ""}`;
  let p = pools.get(key);
  if (!p) {
    p = buildPool(subjectId, type, childType, setSize);
    pools.set(key, p);
  }
  return p;
}

async function buildPool(subjectId: string, type: QuestionType, childType: ChildType | "mixed" | null, setSize: number | null): Promise<BankQ[]> {
  const used = await recentAndOlder();
  const chapters = await subjectChapters(subjectId);
  const ch = (i: number): Ref | null => (chapters.length ? { id: chapters[i % chapters.length].id, name: chapters[i % chapters.length].name } : null);
  const topic = (i: number): Ref | null => {
    const c = chapters.length ? chapters[i % chapters.length] : null;
    return c?.topics.length ? c.topics[i % c.topics.length] : null;
  };
  const si = await subjectIndex(subjectId);
  const S = STEMS[si];
  const out: BankQ[] = [];
  const created = (i: number) => new Date(Date.now() - (i * 3 + 2) * 86_400_000).toISOString();
  const flags = (i: number, base?: Partial<QuestionFlags>): QuestionFlags => ({
    needsLatex: i % 6 === 3 ? 1 : 0,
    hasSolution: i % 5 !== 4,
    hasHindi: i % 4 !== 1,
    ...base,
  });

  if (type === "single" || type === "multiple" || type === "integer") {
    try {
      const r = await questionsAdmin.search({ subjectId, type, pageSize: 100, sort: "updated" });
      r.items.forEach((x) =>
        out.push(
          decorate(
            {
              id: x.id,
              type,
              subjectId,
              stem: x.stemPreview,
              chapter: x.chapters[0] ?? null,
              topic: x.topics[0] ? { id: x.topics[0].id, name: x.topics[0].name } : null,
              difficulty: x.difficulty,
              flags: { needsLatex: (x as { needsLatex?: number }).needsLatex ?? 0, hasSolution: x.hasSolution, hasHindi: x.hasHindi },
              real: true,
              createdAt: x.createdAt,
            },
            used
          )
        )
      );
    } catch {
      /* dev bank unreachable: sample rows only */
    }
    const stems = type === "integer" ? S.integer : type === "multiple" ? S.multiple : S.single;
    const want = Math.max(0, 36 - out.length);
    for (let i = 0; i < want; i++) {
      const id = `sample-q-${subjectId.slice(-4)}-${type}-${i + 1}`;
      out.push(
        decorate(
          {
            id,
            type,
            subjectId,
            stem: stems[i % stems.length] + (i >= stems.length ? ` (variant ${Math.floor(i / stems.length) + 1})` : ""),
            chapter: ch(i),
            topic: topic(i),
            difficulty: i % 9 === 8 ? null : DIFF[i % 3],
            flags: flags(i),
            options: type === "integer" ? undefined : ["$\\tfrac{5}{7} g\\sin\\theta$", "$g\\sin\\theta$", "$\\tfrac{2}{3} g\\sin\\theta$", "$\\tfrac{1}{2} g\\sin\\theta$"],
            key: type === "integer" ? undefined : type === "multiple" ? ["A", "C"] : ["A"],
            range: type === "integer" ? { from: 5, to: 5 } : undefined,
            real: false,
            createdAt: created(i),
          },
          used
        )
      );
    }
  } else if (type === "paragraph") {
    const size = setSize ?? 3;
    const kids = (ct: ChildType | "mixed", n: number): ChildType[] =>
      Array.from({ length: n }, (_, k) => (ct === "mixed" ? (["single", "integer", "multiple"] as ChildType[])[k % 3] : ct));
    const ct = childType ?? "single";
    for (let i = 0; i < 9; i++) {
      // every 4th set has a different size (blocked: "This section takes sets of 3")
      const n = i % 4 === 2 ? size + 1 : size;
      const types = kids(ct, n);
      const id = `sample-ps-${subjectId.slice(-4)}-${i + 1}`;
      out.push(
        decorate(
          {
            id,
            type: "paragraph",
            subjectId,
            stem: S.passages[i % S.passages.length],
            chapter: ch(i),
            topic: topic(i),
            difficulty: DIFF[(i + 1) % 3],
            flags: flags(i),
            set: {
              passage: S.passages[i % S.passages.length],
              children: types.map((t, k) => ({
                id: `${id}-c${k + 1}`,
                type: t,
                stem: t === "integer" ? "Find the value, as an integer." : t === "multiple" ? "Which of the following are true?" : "Which of the following is correct?",
                options: t === "integer" ? [] : ["$2$", "$4$", "$6$", "$8$"],
                answer: t === "integer" ? [] : t === "multiple" ? ["A", "B"] : ["B"],
                range: t === "integer" ? { from: 20, to: 20 } : undefined,
              })),
            },
            real: false,
            createdAt: created(i),
          },
          used
        )
      );
    }
  } else if (type === "matrix") {
    for (let i = 0; i < 6; i++) {
      const m = S.matrix[i % S.matrix.length];
      const matches: Record<string, string[]> = {};
      m.I.forEach((_, r) => (matches[LETTERS[r]] = r === 1 && m.II.length > 3 ? [COLS[r], COLS[r + 2]] : [COLS[r]]));
      out.push(
        decorate(
          {
            id: `sample-mx-${subjectId.slice(-4)}-${i + 1}`,
            type: "matrix",
            subjectId,
            stem: m.q + (i >= S.matrix.length ? ` (variant ${Math.floor(i / S.matrix.length) + 1})` : ""),
            chapter: ch(i),
            topic: topic(i),
            difficulty: DIFF[i % 3],
            flags: flags(i),
            matrix: { listI: m.I, listII: m.II, matches },
            real: false,
            createdAt: created(i),
          },
          used
        )
      );
    }
  }
  out.forEach((q) => bank.set(q.id, q));
  return out;
}

/* ─────────────────────────────── papers ─────────────────────────────── */

interface PaperState {
  testId: string;
  pattern: Pattern;
  revision: number;
  subs: Record<string, string[]>;
  sources: Record<string, SlotSource>;
  history: Array<{ revision: number; subs: Record<string, string[]> }>;
}

const papers = new Map<string, Promise<PaperState>>();
const extraTests = new Map<string, string>();

/** For tests made by another sample flow (TestBuilder create): their pattern. */
export function seedPaper(testId: string, patternId: string) {
  extraTests.set(testId, patternId);
}

async function findTest(testId: string): Promise<SampleTest | null> {
  const list = await sampleTests().catch(() => [] as SampleTest[]);
  return list.find((t) => t.testId === testId) ?? (await sampleWorld()).tests.find((t) => t.testId === testId) ?? null;
}

function subOf(p: Pattern, subId: string) {
  for (const s of p.sections) for (const x of s.subsections) if (x.id === subId) return { section: s, sub: x };
  return null;
}

async function state(testId: string): Promise<PaperState> {
  let p = papers.get(testId);
  if (!p) {
    p = (async () => {
      const t = await findTest(testId);
      const pats = await samplePatterns();
      const patId = t?.pattern.id ?? extraTests.get(testId);
      if (!t && !patId) throw fixtureError(404, "TEST_NOT_FOUND", "This test doesn't exist or was deleted.");
      const pattern = pats.find((x) => x.id === patId) ?? pats[0];
      const ratio = t ? t.questions.filled / Math.max(1, t.questions.needed) : 0;
      const subs: Record<string, string[]> = {};
      const sources: Record<string, SlotSource> = {};
      for (const s of pattern.sections)
        for (const x of s.subsections) {
          const rows = s.subject ? await pool(s.subject.id, x.type, x.paragraph?.childType ?? null, x.paragraph?.setSize ?? null) : [];
          const fit = rows.filter((r) => !r.recent && (x.type !== "paragraph" || r.set?.children.length === x.paragraph?.setSize));
          const per = x.type === "paragraph" ? x.paragraph?.setSize ?? 1 : 1;
          const slots = Math.floor(x.totalQuestions / per);
          const take = Math.min(fit.length, ratio >= 1 ? slots : Math.floor(slots * ratio));
          subs[x.id] = fit.slice(0, take).map((r) => r.id);
          subs[x.id].forEach((id, i) => (sources[`${x.id}:${id}`] = i % 3 === 0 ? "ai" : "manual"));
        }
      return { testId, pattern, revision: 1, subs, sources, history: [] };
    })();
    papers.set(testId, p);
    p.catch(() => papers.delete(testId));
  }
  return p;
}

function childCount(id: string): number {
  return bank.get(id)?.set?.children.length ?? 1;
}

function view(st: PaperState): PaperView {
  let n = 1;
  let filled = 0;
  let needed = 0;
  let withoutSolution = 0;
  let needsLatex = 0;
  const sections = st.pattern.sections.map((s) => ({
    id: s.id,
    name: s.name,
    subject: s.subject,
    subsections: s.subsections.map((x) => {
      const ids = st.subs[x.id] ?? [];
      const mix: Record<Difficulty | "unset", number> = { easy: 0, medium: 0, hard: 0, unset: 0 };
      const chap = new Map<string, number>();
      const slots = ids.map((id) => {
        const q = bank.get(id);
        const count = childCount(id);
        const slot = {
          n,
          questionId: id,
          count,
          type: q?.type ?? x.type,
          source: st.sources[`${x.id}:${id}`] ?? ("manual" as SlotSource),
          stemPreview: q?.stem ?? id,
          difficulty: q?.difficulty ?? null,
          chapter: q?.chapter?.name ?? null,
          flags: q?.flags ?? { needsLatex: 0, hasSolution: true, hasHindi: true },
        };
        n += count;
        mix[q?.difficulty ?? "unset"] += 1;
        if (q?.chapter) chap.set(q.chapter.name, (chap.get(q.chapter.name) ?? 0) + 1);
        if (!slot.flags.hasSolution) withoutSolution += 1;
        needsLatex += slot.flags.needsLatex;
        return slot;
      });
      const have = slots.reduce((a, b) => a + b.count, 0);
      filled += have;
      needed += x.totalQuestions;
      return {
        id: x.id,
        name: x.name,
        type: x.type,
        paragraph: x.paragraph,
        marking: x.marking,
        need: x.totalQuestions,
        have,
        slots,
        mix,
        chapters: [...chap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      };
    }),
  }));
  return { now: new Date().toISOString(), revision: st.revision, filled, needed, sections, warnings: { withoutSolution, needsLatex } };
}

async function lockCheck(testId: string) {
  const t = await findTest(testId);
  if (t && (t.state === "live" || t.state === "ended")) throw fixtureError(409, "TEST_LOCKED", "Students have started this test, so its questions can't change.");
}

export async function getPaper(testId: string): Promise<PaperView> {
  return view(await state(testId));
}

export async function testHead(testId: string): Promise<PaperTestHead> {
  const t = await findTest(testId);
  if (!t) {
    if (extraTests.has(testId)) return { id: testId, name: "New test", state: "draft", locked: false, exam: null, batches: [] };
    throw fixtureError(404, "TEST_NOT_FOUND", "This test doesn't exist or was deleted.");
  }
  return { id: t.testId, name: t.name, state: t.state, locked: t.state === "live" || t.state === "ended", exam: t.exam, batches: t.batches };
}

export async function putSubsection(testId: string, subId: string, questionIds: string[], expectedRevision: number): Promise<PaperWriteResponse> {
  const st = await state(testId);
  await lockCheck(testId);
  if (expectedRevision !== st.revision) throw fixtureError(409, "PAPER_CHANGED", "Someone else changed this paper. Reload to see their changes.", { revision: st.revision });
  const ref = subOf(st.pattern, subId);
  if (!ref) throw fixtureError(404, "SUBSECTION_NOT_FOUND", "This section is no longer in the test.");
  const { section, sub } = ref;
  const rejected: PaperWriteResponse["rejected"] = [];
  const kept: string[] = [];
  const elsewhere = new Set(Object.entries(st.subs).filter(([k]) => k !== subId).flatMap(([, v]) => v));
  let have = 0;
  for (const id of questionIds) {
    const q = bank.get(id);
    if (!q) {
      rejected.push({ questionId: id, reason: "QUESTION_NOT_FOUND" });
      continue;
    }
    if (kept.includes(id) || elsewhere.has(id)) {
      rejected.push({ questionId: id, reason: "DUPLICATE" });
      continue;
    }
    if (q.type !== sub.type) {
      rejected.push({ questionId: id, reason: "WRONG_TYPE" });
      continue;
    }
    if (section.subject && q.subjectId !== section.subject.id) {
      rejected.push({ questionId: id, reason: "WRONG_SUBJECT" });
      continue;
    }
    const c = childCount(id);
    if (sub.type === "paragraph" && c !== sub.paragraph?.setSize) {
      rejected.push({ questionId: id, reason: "SET_SIZE" });
      continue;
    }
    if (have + c > sub.totalQuestions) {
      rejected.push({ questionId: id, reason: "SUBSECTION_FULL" });
      continue;
    }
    have += c;
    kept.push(id);
  }
  const previousRevision = st.revision;
  st.history.push({ revision: st.revision, subs: JSON.parse(JSON.stringify(st.subs)) });
  if (st.history.length > 20) st.history.shift();
  for (const id of kept) if (!st.sources[`${subId}:${id}`]) st.sources[`${subId}:${id}`] = "manual";
  st.subs[subId] = kept;
  st.revision += 1;
  return { now: new Date().toISOString(), paper: view(st), previousRevision, rejected };
}

export async function restorePaper(testId: string, revision: number): Promise<PaperWriteResponse> {
  const st = await state(testId);
  await lockCheck(testId);
  const h = st.history.find((x) => x.revision === revision);
  if (!h) throw fixtureError(404, "REVISION_NOT_FOUND", "That version is no longer kept (the last 20 are).");
  const previousRevision = st.revision;
  st.history.push({ revision: st.revision, subs: JSON.parse(JSON.stringify(st.subs)) });
  st.subs = JSON.parse(JSON.stringify(h.subs));
  st.revision += 1;
  return { now: new Date().toISOString(), paper: view(st), previousRevision, rejected: [] };
}

/* ─────────────────────────────── picker ─────────────────────────────── */

function inTest(st: PaperState, id: string): PickerRow["inThisTest"] {
  const v = view(st);
  for (const s of v.sections) for (const x of s.subsections) for (const sl of x.slots) if (sl.questionId === id) return { n: sl.n, subsectionId: x.id };
  return null;
}

function toRow(st: PaperState, q: BankQ, sub: { id: string; type: QuestionType; totalQuestions: number; paragraph: { setSize: number; childType: ChildType | "mixed" } | null }, slotsLeft: number): PickerRow {
  const here = inTest(st, q.id);
  const c = q.set?.children.length ?? 1;
  let blockedReason: PickerRow["blockedReason"] = null;
  if (!here) {
    if (sub.type === "paragraph" && sub.paragraph && c !== sub.paragraph.setSize) blockedReason = "WRONG_SET_SIZE";
    else if (sub.type === "paragraph" && sub.paragraph && sub.paragraph.childType !== "mixed" && q.set?.children.some((k) => k.type !== sub.paragraph!.childType)) blockedReason = "WRONG_CHILD_TYPE";
    else if (slotsLeft < c) blockedReason = "SUBSECTION_FULL";
  }
  return {
    questionId: q.id,
    type: q.type,
    stemPreview: q.stem,
    difficulty: q.difficulty,
    chapter: q.chapter?.name ?? null,
    flags: q.flags,
    set: q.set ? { count: c, childTypes: q.set.children.map((k) => k.type) } : null,
    inThisTest: here,
    recentTest: q.recent,
    lastUsed: q.lastUsed,
    timesUsed: q.timesUsed,
    blockedReason,
  };
}

async function subContext(testId: string, subId: string) {
  const st = await state(testId);
  const ref = subOf(st.pattern, subId);
  if (!ref) throw fixtureError(404, "SUBSECTION_NOT_FOUND", "This section is no longer in the test.");
  const rows = ref.section.subject ? await pool(ref.section.subject.id, ref.sub.type, ref.sub.paragraph?.childType ?? null, ref.sub.paragraph?.setSize ?? null) : [];
  const have = (st.subs[subId] ?? []).reduce((a, id) => a + childCount(id), 0);
  return { st, ...ref, rows, slotsLeft: Math.max(0, ref.sub.totalQuestions - have) };
}

const DORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2, unset: 3 };

export async function pickerSearch(testId: string, req: PickerSearchRequest): Promise<PickerSearchResponse> {
  const { st, sub, rows: all, slotsLeft } = await subContext(testId, req.subsectionId);
  // scenario "empty" (screenshots): the bank has nothing of this type in this subject
  const rows = scenario() === "empty" ? [] : all;
  const q = (req.q ?? "").trim().toLowerCase();
  let list = rows.filter(
    (r) =>
      (!q || r.stem.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) &&
      (!req.chapterIds?.length || (r.chapter && (req.chapterIds.includes(r.chapter.id) || req.chapterIds.includes(r.chapter.name)))) &&
      (!req.topicIds?.length || (r.topic && (req.topicIds.includes(r.topic.id) || req.topicIds.includes(r.topic.name)))) &&
      (!req.difficulty || (req.difficulty === "unset" ? !r.difficulty : r.difficulty === req.difficulty)) &&
      (!req.hasSolution || r.flags.hasSolution) &&
      (!req.hasHindi || r.flags.hasHindi)
  );
  let hiddenRecent = 0;
  if (req.notInLastTests) {
    const before = list.length;
    list = list.filter((r) => !r.recent || inTest(st, r.id));
    hiddenRecent = before - list.length;
  }
  const sort = req.sort ?? "leastUsed";
  list = [...list].sort((a, b) => {
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    if (sort === "difficulty") return DORDER[a.difficulty ?? "unset"] - DORDER[b.difficulty ?? "unset"];
    if (a.timesUsed !== b.timesUsed) return a.timesUsed - b.timesUsed;
    return (a.lastUsed?.at ?? "").localeCompare(b.lastUsed?.at ?? "");
  });
  const page = req.page ?? 1;
  const pageSize = req.pageSize ?? 25;
  const items = list.slice((page - 1) * pageSize, page * pageSize).map((r) => toRow(st, r, sub, slotsLeft));
  return { now: new Date().toISOString(), items, pageInfo: { page, pageSize, total: list.length }, hiddenRecent, slotsLeft };
}

function lang(question: string, options?: string[], key?: string[]): LangBlock {
  return {
    question: `<p>${question}</p>`,
    options: options?.map((v, i) => ({ id: LETTERS[i], value: `<p>${v}</p>` })),
    solution: key ? `<p>Answer ${key.join(", ")}.</p>` : undefined,
  };
}

export async function pickerPreview(questionId: string): Promise<PickerPreview> {
  const q = bank.get(questionId);
  if (!q) throw fixtureError(404, "QUESTION_NOT_FOUND", "This question no longer exists.");
  const now = new Date().toISOString();
  if (q.real) {
    try {
      const kind = q.type === "integer" ? "numerical" : "mcq";
      const r = await api.questions.getById(questionId, kind);
      const d = (r.data as { data?: Record<string, unknown> }).data ?? (r.data as Record<string, unknown>);
      const en = d.en as LangBlock;
      const hi = (d.hi as LangBlock | undefined) ?? null;
      const correctAnswers = (d.correctAnswers as string[] | undefined) ?? undefined;
      const correctAnswer = (d.correctAnswer as { from: number; to: number } | undefined) ?? undefined;
      return { now, question: { id: questionId, type: q.type, en, hi: hi?.question ? hi : null, correctAnswers, correctAnswer } };
    } catch {
      /* fall through to the stem only */
    }
    return { now, question: { id: questionId, type: q.type, en: { question: `<p>${q.stem}</p>` }, hi: null } };
  }
  if (q.set)
    return {
      now,
      question: {
        id: q.id,
        type: "paragraph",
        en: { question: "" },
        hi: null,
        passage: { en: `<p>${q.set.passage}</p>`, hi: null },
        questions: q.set.children.map((c) => ({
          id: c.id,
          type: c.type,
          en: lang(c.stem, c.options.length ? c.options : undefined),
          hi: null,
          correctAnswers: c.answer.length ? c.answer : undefined,
          correctAnswer: c.range,
        })),
      },
    };
  if (q.matrix)
    return {
      now,
      question: {
        id: q.id,
        type: "matrix",
        en: { question: `<p>${q.stem}</p>` },
        hi: null,
        matrix: {
          listI: q.matrix.listI.map((t, i) => ({ id: LETTERS[i], en: t, hi: null })),
          listII: q.matrix.listII.map((t, i) => ({ id: COLS[i], en: t, hi: null })),
          matches: q.matrix.matches,
        },
      },
    };
  return {
    now,
    question: {
      id: q.id,
      type: q.type,
      en: lang(q.stem, q.options, q.key),
      hi: q.flags.hasHindi ? { question: `<p>${q.stem}</p>` } : null,
      correctAnswers: q.key,
      correctAnswer: q.range,
    },
  };
}

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)), (s >>> 0) / 4294967296);
}

export async function fillPreview(testId: string, req: FillPreviewRequest): Promise<FillPreviewResponse> {
  const { st, sub, rows, slotsLeft } = await subContext(testId, req.subsectionId);
  const seed = req.seed ?? Math.floor(Math.random() * 1e9);
  const per = sub.type === "paragraph" ? sub.paragraph?.setSize ?? 1 : 1;
  const slots = Math.floor(slotsLeft / per);
  const matching = rows.filter(
    (r) =>
      !inTest(st, r.id) &&
      (!req.chapterIds.length || (r.chapter && (req.chapterIds.includes(r.chapter.id) || req.chapterIds.includes(r.chapter.name)))) &&
      (!req.skipRecent || !r.recent) &&
      (!req.onlyWithSolution || r.flags.hasSolution) &&
      (!req.onlyWithHindi || r.flags.hasHindi) &&
      (sub.type !== "paragraph" || r.set?.children.length === sub.paragraph?.setSize)
  );
  const r = rand(seed);
  const shuffled = [...matching].sort(() => r() - 0.5);
  const keep = (req.proposed ?? []).filter((id) => id !== req.swapOut && matching.some((m) => m.id === id));
  const proposed: string[] = [...keep];
  const shortfalls: FillPreviewResponse["shortfalls"] = [];
  const mixEntries = (Object.entries(req.mix) as Array<[Difficulty, number]>).filter(([, n]) => n > 0);
  const want: Array<[Difficulty | null, number]> = mixEntries.length ? mixEntries : [[null, slots]];
  for (const [d, n] of want) {
    const already = keep.filter((id) => !d || bank.get(id)?.difficulty === d).length;
    const cands = shuffled.filter((m) => !proposed.includes(m.id) && m.id !== req.swapOut && (!d || m.difficulty === d));
    const need = Math.max(0, Math.min(n, slots) - already);
    const take = cands.slice(0, Math.max(0, Math.min(need, slots - proposed.length)));
    proposed.push(...take.map((m) => m.id));
    if (take.length < need) {
      const chapterName = req.chapterIds.length === 1 ? rows.find((x) => x.chapter?.id === req.chapterIds[0])?.chapter?.name ?? null : null;
      shortfalls.push({ chapter: chapterName, difficulty: d, wanted: need, available: take.length });
    }
  }
  return {
    now: new Date().toISOString(),
    matching: matching.length,
    slotsLeft,
    proposed: proposed.slice(0, slots).map((id) => toRow(st, bank.get(id)!, sub, slotsLeft)),
    shortfalls,
    seed,
  };
}

/** Chapters (with topics) of a sub-section's subject, for the picker's filters (sample + real names). */
export async function sampleChapters(subjectId: string): Promise<Array<Ref & { topics: Ref[] }>> {
  return subjectChapters(subjectId);
}
