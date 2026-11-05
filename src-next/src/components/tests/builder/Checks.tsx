"use client";

/*
  Admin-TestBuilder "Ready to publish?": the readiness checks (GET …/readiness) as ✓ / ! rows with a link to fix.
  Blocking: name/exam/pattern, window, batches, questions. Warnings (never blocking): without a solution, equation
  images ("1 equation is an image (Physics Q7). Students can still answer it.").
*/
import type { ReadinessResponse } from "@/lib/m6-contract";

type Check = ReadinessResponse["checks"][number];

export interface CheckFix {
  /** focus a field by id */
  field?: string;
  /** open the picker */
  pick?: boolean;
  /** open a question's editor */
  questionHref?: string | null;
}

interface Row {
  cls: "ok" | "no" | "warn";
  label: string;
  optional?: boolean;
  fix?: { label: string; go: CheckFix };
}

const n = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

function rowOf(c: Check, locked: boolean, latexHref: string | null): Row | null {
  const f = c.facts ?? {};
  const cls = c.level === "ok" ? "ok" : c.level === "blocking" ? "no" : "warn";
  switch (c.code) {
    case "NAME_EXAM_PATTERN":
      return cls === "ok" ? { cls, label: "Name, exam and pattern set" } : { cls, label: "Name the test", fix: { label: "Fix", go: { field: "tb-name" } } };
    case "WINDOW": {
      if (cls === "ok") return { cls, label: "Opens and closes in the future" };
      const p = String(f.problem ?? "").replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
      if (p === "CLOSES_BEFORE_OPENS" || p === "CLOSESBEFOREOPENS") return { cls, label: "Closes is before Opens", fix: { label: "Fix", go: { field: "tb-closes" } } };
      if (p === "OPENS_IN_PAST" || p === "INPAST") return { cls, label: "Opens is in the past", fix: { label: "Fix", go: { field: "tb-opens" } } };
      return { cls, label: "Set when it opens and closes", fix: { label: "Fix", go: { field: f.opensAt ? "tb-closes" : "tb-opens" } } };
    }
    case "BATCHES":
      return cls === "ok"
        ? { cls, label: `${n(f.batches)} batch${n(f.batches) === 1 ? "" : "es"} · ${n(f.students).toLocaleString("en-IN")} students` }
        : { cls, label: "Pick at least one batch", fix: { label: "Fix", go: { field: "tb-batches" } } };
    case "QUESTIONS": {
      const filled = n(f.filled);
      const needed = n(f.needed);
      return cls === "ok"
        ? { cls, label: `All ${needed} questions picked (pattern needs ${needed})` }
        : { cls, label: `${filled} of ${needed} questions picked`, fix: locked ? undefined : { label: `Pick ${needed - filled}`, go: { pick: true } } };
    }
    case "WITHOUT_SOLUTION": {
      const k = n(f.count);
      if (!k) return null;
      return { cls, label: `${k} question${k === 1 ? "" : "s"} without a solution: no AI review for ${k === 1 ? "it" : "those"}`, optional: true, fix: locked ? undefined : { label: "Review", go: { pick: true } } };
    }
    case "NEEDS_LATEX": {
      const k = n(f.count);
      if (!k) return null;
      const where = Array.isArray(f.where) ? (f.where as string[]) : [];
      const at = where.length ? ` (${where.slice(0, 2).join(", ")}${where.length > 2 ? ` +${where.length - 2}` : ""})` : "";
      return {
        cls,
        label: `${k === 1 ? "1 equation is an image" : `${k} equations are images`}${at}. Students can still answer ${k === 1 ? "it" : "them"}.`,
        fix: locked || !latexHref ? undefined : { label: "Fix", go: { questionHref: latexHref } },
      };
    }
    case "TEMPLATE":
      return cls === "ok" ? null : { cls, label: "The picked exam screen was deleted; students see the exam's default", fix: { label: "Fix", go: { field: "tb-template" } } };
    default:
      return null;
  }
}

const NEW_ROWS: Row[] = [
  { cls: "no", label: "Pick an exam and a pattern, and name the test", fix: { label: "Fix", go: { field: "tb-exam" } } },
  { cls: "no", label: "Set when it opens and closes" },
  { cls: "no", label: "Pick at least one batch" },
  { cls: "no", label: "Questions are checked once a pattern is picked" },
];

export function checksLeft(r: ReadinessResponse | undefined): number {
  return r ? r.checks.filter((c) => c.level === "blocking").length : 4;
}

export function Checks({
  readiness,
  isNew,
  loading,
  locked,
  latexHref,
  onFix,
}: {
  readiness: ReadinessResponse | undefined;
  isNew: boolean;
  loading: boolean;
  locked: boolean;
  latexHref: string | null;
  onFix: (f: CheckFix) => void;
}) {
  const rows = isNew ? NEW_ROWS : (readiness?.checks ?? []).map((c) => rowOf(c, locked, latexHref)).filter((r): r is Row => !!r);
  const left = rows.filter((r) => r.cls === "no").length;
  return (
    <section className="card pad-lg col" style={{ gap: 2 }} aria-labelledby="tb-ready">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 id="tb-ready" className="h3">
          Ready to publish?
        </h2>
        <span className="xs muted">{loading && !isNew ? "Checking…" : left ? `${left} check${left === 1 ? "" : "s"} left` : "All set"}</span>
      </div>
      {loading && !isNew && !readiness
        ? Array.from({ length: 4 }, (_, i) => <div key={i} className="skel" style={{ height: 22, margin: "6px 0" }} />)
        : rows.map((r, i) => (
            <div key={i} className={`tb-chk ${r.cls}`}>
              <i aria-hidden>{r.cls === "ok" ? "✓" : "!"}</i>
              <span>
                {r.label}
                {r.optional && <span className="muted"> (optional)</span>}
                <span className="sr-only">{r.cls === "ok" ? " (done)" : r.cls === "no" ? " (needed before publishing)" : " (warning)"}</span>
              </span>
              {r.fix && (
                <button type="button" className="fx" onClick={() => onFix(r.fix!.go)}>
                  {r.fix.label}
                </button>
              )}
            </div>
          ))}
    </section>
  );
}
