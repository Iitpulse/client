/*
  The builder samples' view of a test's paper, on top of the picker's paper sample (./paper.ts): readiness facts
  (filled/needed, without solution, equation images with where) and the AI build sample's fill (fill-by-rule
  proposals written with the sub-section PUT, so Undo = paper restore of the revision before the build).
  The paper sample marks every PUT slot "manual"; slots the sample AI build wrote are remembered here (sampleAiSlots)
  so the builder still counts them as AI picks.
*/
import type { PaperView } from "../../m6-contract";
import { fillPreview, getPaper, putSubsection } from "./paper";
import type { SampleTest } from "./seed";

export interface PaperFacts {
  filled: number;
  needed: number;
  withoutSolution: number;
  /** "Physics Q7" */
  needsLatex: string[];
}

const aiIds = new Map<string, Set<string>>();

/** Question ids the sample AI build placed in this test. */
export function sampleAiSlots(testId: string): Set<string> {
  return aiIds.get(testId) ?? new Set();
}

function isAi(testId: string, slot: PaperView["sections"][number]["subsections"][number]["slots"][number]): boolean {
  return slot.source === "ai" || sampleAiSlots(testId).has(slot.questionId);
}

export async function paperFacts(t: SampleTest): Promise<PaperFacts> {
  const p = await getPaper(t.testId).catch(() => null);
  if (!p) return { filled: t.questions.filled, needed: t.questions.needed, withoutSolution: 0, needsLatex: [] };
  const where: string[] = [];
  for (const s of p.sections) for (const x of s.subsections) for (const sl of x.slots) if (sl.flags.needsLatex > 0) where.push(`${s.name} Q${sl.n}`);
  t.questions = { ...t.questions, filled: p.filled, needed: p.needed };
  return { filled: p.filled, needed: p.needed, withoutSolution: p.warnings.withoutSolution, needsLatex: where };
}

export async function paperState(t: SampleTest): Promise<{ manual: number; ai: number }> {
  const p = await getPaper(t.testId);
  let ai = 0;
  let manual = 0;
  for (const s of p.sections) for (const x of s.subsections) for (const sl of x.slots) (isAi(t.testId, sl) ? (ai += sl.count) : (manual += sl.count));
  return { ai, manual };
}

/** Fills every open slot (and the AI slots, or every slot when !keepManual) by rule; `short` leaves that many open. */
export async function fillByAi(
  t: SampleTest,
  o: { keepManual: boolean; short: number }
): Promise<{ previousRevision: number; shortSubsectionId: string | null; shortChapter: string }> {
  let p = await getPaper(t.testId);
  const firstRevision = p.revision;
  const mine = new Set(sampleAiSlots(t.testId));
  let short = o.short;
  let shortSub: string | null = null;
  let shortChapter = "";
  const subs = p.sections.flatMap((s) => s.subsections);
  for (let i = subs.length - 1; i >= 0; i--) {
    const x = p.sections.flatMap((s) => s.subsections).find((y) => y.id === subs[i].id)!;
    const keep = x.slots.filter((sl) => o.keepManual && !isAi(t.testId, sl)).map((sl) => sl.questionId);
    if (keep.length !== x.slots.length) {
      p = (await putSubsection(t.testId, x.id, keep, p.revision)).paper;
    }
    const after = p.sections.flatMap((s) => s.subsections).find((y) => y.id === x.id)!;
    if (after.have >= after.need) continue;
    const fp = await fillPreview(t.testId, { subsectionId: x.id, chapterIds: [], mix: {}, skipRecent: true, onlyWithSolution: false, onlyWithHindi: false, seed: 7 + i });
    let ids = fp.proposed.map((r) => r.questionId);
    if (short > 0 && ids.length > short && after.type !== "paragraph") {
      ids = ids.slice(0, ids.length - short);
      shortSub = x.id;
      shortChapter = fp.proposed[fp.proposed.length - 1]?.chapter ?? "";
      short = 0;
    }
    if (!ids.length) continue;
    ids.forEach((id) => mine.add(id));
    p = (await putSubsection(t.testId, x.id, [...keep, ...ids], p.revision)).paper;
  }
  aiIds.set(t.testId, mine);
  t.questions = { ...t.questions, filled: p.filled, needed: p.needed };
  return { previousRevision: firstRevision, shortSubsectionId: shortSub, shortChapter };
}
