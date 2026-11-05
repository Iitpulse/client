"use client";

/*
  Admin-TestBuilder section cards: "Physics · 25 of 25 · 100 marks", equation-image and no-solution badges (warnings,
  never blocking), one row per sub-section (have of need, bar, Pick N / Change / View), the difficulty mix and the
  top chapters. Numbering counts child questions: a paragraph sub-section reads "2 sets of 2 · Q21–24".
*/
import type { PaperView } from "@/lib/m6-contract";
import { TYPE_NAME, markingShort } from "@/lib/m6/paper";

type Sec = PaperView["sections"][number];
type Sub = Sec["subsections"][number];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** First paper number of each sub-section (empty slots take numbers too). */
export function firstNumbers(paper: PaperView): Map<string, number> {
  const out = new Map<string, number>();
  let n = 1;
  for (const s of paper.sections)
    for (const x of s.subsections) {
      out.set(x.id, n);
      n += x.need;
    }
  return out;
}

/** "Single correct", or the sub-section's own name when it says more than "Section A". */
function subLabel(x: Sub): string {
  const own = x.name?.trim();
  if (!own || /^(section|part)\s+[a-z0-9]+$/i.test(own) || own.toLowerCase() === TYPE_NAME[x.type]?.toLowerCase()) return TYPE_NAME[x.type] ?? x.type;
  return own;
}

function marksLine(x: Sub, first: number | undefined): string {
  const range = first ? (x.need > 1 ? ` · Q${first}–${first + x.need - 1}` : ` · Q${first}`) : "";
  if (x.type === "paragraph" && x.paragraph) {
    const sets = Math.floor(x.need / Math.max(1, x.paragraph.setSize));
    return `${markingShort(x.marking)} · ${sets} set${sets === 1 ? "" : "s"} of ${x.paragraph.setSize}${range}`;
  }
  const partial = x.marking.partial.length ? " · partial marks" : "";
  return `${markingShort(x.marking)}${partial} · ${x.need} question${x.need === 1 ? "" : "s"}${range}`;
}

export function Sections({
  paper,
  locked,
  onPick,
}: {
  paper: PaperView;
  locked: boolean;
  onPick: (subsectionId: string) => void;
}) {
  const firsts = firstNumbers(paper);
  return (
    <>
      {paper.sections.map((s, i) => {
        const have = s.subsections.reduce((a, x) => a + x.have, 0);
        const need = s.subsections.reduce((a, x) => a + x.need, 0);
        const marks = s.subsections.reduce((a, x) => a + x.need * x.marking.correct, 0);
        const mix = { easy: 0, medium: 0, hard: 0 };
        const chapters = new Map<string, number>();
        let images = 0;
        let noSol = 0;
        for (const x of s.subsections) {
          mix.easy += x.mix.easy;
          mix.medium += x.mix.medium;
          mix.hard += x.mix.hard;
          for (const c of x.chapters) chapters.set(c.name, (chapters.get(c.name) ?? 0) + c.count);
          for (const sl of x.slots) {
            if (sl.flags.needsLatex > 0) images += sl.flags.needsLatex;
            if (!sl.flags.hasSolution) noSol += 1;
          }
        }
        const top = [...chapters.entries()].sort((a, b) => b[1] - a[1]);
        const firstOpen = s.subsections.find((x) => x.have < x.need) ?? s.subsections[0];
        return (
          <article key={s.id} className="card pad-lg col rise" style={{ gap: 10, ["--i" as string]: i }} aria-label={s.name}>
            <div className="row between wrap" style={{ gap: 8 }}>
              <div className="row wrap" style={{ gap: 10 }}>
                <h2 className="h3">{s.name}</h2>
                <span className={`badge ${have < need ? "b-amber" : "b-grey"}`}>
                  {have} of {need} · {marks} marks
                </span>
                {images > 0 && <span className="badge b-amber">{images === 1 ? "1 equation is an image" : `${images} equations are images`}</span>}
                {noSol > 0 && <span className="badge b-grey">{noSol} without a solution</span>}
              </div>
              {firstOpen && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPick(firstOpen.id)}>
                  {locked ? "View questions" : "Pick questions"}
                </button>
              )}
            </div>
            {s.subsections.map((x, k) => {
              const pct = x.need ? Math.round((100 * x.have) / x.need) : 0;
              const act = locked ? "View" : x.have < x.need ? `Pick ${x.need - x.have}` : "Change";
              return (
                <div key={x.id} className="tb-sub">
                  <span className="col" style={{ gap: 1, minWidth: 0 }}>
                    <span className="sm" style={{ fontWeight: 600 }}>
                      {LETTERS[k]} · {subLabel(x)}
                    </span>
                    <span className="xs muted">{marksLine(x, firsts.get(x.id))}</span>
                  </span>
                  <span className="col" style={{ gap: 4 }}>
                    <span className={`xs num ${x.have < x.need ? "" : "muted"}`}>
                      {x.have} of {x.need}
                    </span>
                    <span className="bar" role="progressbar" aria-valuenow={x.have} aria-valuemin={0} aria-valuemax={x.need} aria-label={`${x.name}: ${x.have} of ${x.need}`}>
                      <i style={{ width: `${pct}%`, animation: "none" }} />
                    </span>
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onPick(x.id)}>
                    {act}
                  </button>
                </div>
              );
            })}
            {have > 0 && (
              <div className="col" style={{ gap: 6 }}>
                <div className="row between xs muted">
                  <span>Difficulty</span>
                  <span>
                    {mix.easy} easy · {mix.medium} medium · {mix.hard} hard
                  </span>
                </div>
                <div className="tb-mix" aria-hidden>
                  <span className="e" style={{ flex: mix.easy }} />
                  <span className="m" style={{ flex: mix.medium }} />
                  <span className="h" style={{ flex: mix.hard }} />
                </div>
              </div>
            )}
            {top.length > 0 && (
              <div className="row wrap" style={{ gap: 6 }}>
                {top.slice(0, 3).map(([name, n], j) => (
                  <span key={name} className={`badge ${j === 0 ? "b-navy" : "b-grey"}`}>
                    {name} · {n}
                  </span>
                ))}
                {top.length > 3 && <span className="badge b-grey">+{top.length - 3} chapters</span>}
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}
