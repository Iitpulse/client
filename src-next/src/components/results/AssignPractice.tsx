"use client";

/*
  Assign practice (batch 8, board Admin-AssignPractice): a drawer from the Results page (batch summary header and each
  "Practise" suggestion) and the "Practice from this test" tracking card. Chapters come from this test, weakest first;
  who = whole batch / under 50% here / picked students; questions each, difficulty, practice or timed drill, due date
  (late allowed), "also the questions they got wrong here". The count line reads the bank (live / upcoming tests'
  questions never used). States: open, not enough questions (switch to Mixed / give n each), assigning, failed, assigned.
*/
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, DateTimeField, NumberStepper, Segmented, inr, notify } from "@/components/kit";
import { apiError } from "@/lib/m6/client";
import { istDate, istDateTime } from "@/lib/m6/shared";
import type { ResultRow } from "@/lib/m6/results-admin";
import { cancelAssign, changeDue, createAssign, previewAssign, useAllResultRows, useTestAssignments, useTestChapters, type AssignRequest, type PracticeAssignment } from "@/lib/m6/assignments";

type Who = "all" | "weak" | "pick";
const DIFF: Array<{ value: AssignRequest["difficulty"]; label: string }> = [
  { value: "mixed", label: "Mixed" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const defaultDue = () => {
  const d = new Date(Date.now() + 4 * 86_400_000);
  // 9:00 PM IST that day
  const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  return new Date(`${ist}T21:00:00+05:30`).toISOString();
};

export function AssignPracticeDrawer({
  open,
  onClose,
  testId,
  testName,
  maxScore,
  hint,
}: {
  open: boolean;
  onClose: () => void;
  testId: string;
  testName: string;
  maxScore: number;
  /** the suggestion's text, used for the title */
  hint?: string | null;
}) {
  const qc = useQueryClient();
  const ch = useTestChapters(testId, open);
  const all = useAllResultRows(testId, open);
  const rows: ResultRow[] = React.useMemo(() => all.data ?? [], [all.data]);
  const chapters = React.useMemo(() => (ch.data?.chapters ?? []).filter((c) => c.chapter !== "Other"), [ch.data]);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    if (open && chapters.length && !picked.size) setPicked(new Set(chapters.slice(0, 2).map((c) => `${c.subject}\u0000${c.chapter}`)));
  }, [open, chapters, picked.size]);
  const [who, setWho] = React.useState<Who>("weak");
  const [pick, setPick] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [count, setCount] = React.useState<number | null>(15);
  const [diff, setDiff] = React.useState<AssignRequest["difficulty"]>("mixed");
  const [mode, setMode] = React.useState<AssignRequest["mode"]>("practice");
  const [due, setDue] = React.useState<string>(defaultDue);
  const [wrong, setWrong] = React.useState(true);
  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");
  const [ph, setPh] = React.useState<"open" | "busy" | "failed">("open");
  const [err, setErr] = React.useState<string | null>(null);
  const [avail, setAvail] = React.useState<{ available: number; enough: boolean } | null>(null);

  const chosen = chapters.filter((c) => picked.has(`${c.subject}\u0000${c.chapter}`));
  const weak = rows.filter((r) => maxScore > 0 && r.score < maxScore / 2);
  const students = who === "all" ? rows : who === "weak" ? weak : rows.filter((r) => pick.has(r.student.id));
  const autoTitle = chosen.map((c) => c.chapter).join(" + ") || "Practice";

  // "148 questions match" for the chosen chapters
  const key = chosen.map((c) => c.chapter).join("|") + `|${count}`;
  React.useEffect(() => {
    if (!open || !chosen.length || !count) return setAvail(null);
    let live = true;
    previewAssign({ chapters: chosen.map((c) => ({ subject: c.subject, chapter: c.chapter })), count })
      .then((p) => live && setAvail({ available: p.available, enough: p.enough }))
      .catch(() => live && setAvail(null));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  const assign = async () => {
    setErr(null);
    if (!chosen.length) return setErr("Pick at least one chapter.");
    if (!students.length) return setErr("Pick the students.");
    setPh("busy");
    try {
      const r = await createAssign({
        title: (title.trim() || autoTitle).slice(0, 120),
        note: note.trim() || null,
        sourceTestId: testId,
        chapters: chosen.map((c) => ({ subject: c.subject, chapter: c.chapter })),
        count: count ?? 15,
        difficulty: diff,
        mode,
        minutes: mode === "timed" ? Math.max(1, (count ?? 15) * 2) : null,
        includeWrong: wrong,
        dueAt: due,
        studentIds: students.map((s) => s.student.id),
      });
      await qc.invalidateQueries({ queryKey: ["m6", "practice-assignments", testId] });
      notify.success(`Practice assigned to ${inr(r.assignment.tracking.assigned)} students, due ${istDateTime(r.assignment.dueAt)}.`, { description: "They see it on Home now." });
      setPh("open");
      onClose();
    } catch (e) {
      const a = apiError(e);
      setPh("failed");
      setErr(a.code === "OUT_OF_SCOPE" ? "Some of these students are outside your batches." : a.code === "VALIDATION_ERROR" ? (a.message ?? "Check the fields.") : "Not assigned. The server didn't answer, so no student got the set. Try again in a moment.");
    }
  };

  const needle = q.trim().toLowerCase();
  const pickList = rows.filter((r) => !needle || r.student.name.toLowerCase().includes(needle) || (r.student.phone ?? "").includes(needle)).slice(0, 50);

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width="wide"
      busy={ph === "busy"}
      title="Assign practice"
      subtitle={<span className="xs muted">From {testName} · chapters the batch found hardest</span>}
      footer={
        <div className="row between w-full gap-2">
          <span className="xs muted">Students see it on Home and under Practice, with your name and the due date. It never counts towards a rank.</span>
          <div className="row gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={ph === "busy"}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={assign} disabled={ph === "busy"} data-testid="assign-submit">
              {ph === "busy" ? "Assigning…" : ph === "failed" ? "Try again" : `Assign to ${students.length} student${students.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      }
    >
      <div className="col gap-4" data-testid="assign-drawer">
        {hint && <span className="sm text-ink-2">Suggested: {hint}</span>}
        <fieldset className="col gap-2">
          <legend className="sm font-semibold">Chapters</legend>
          {ch.isLoading && <span className="skel block h-10 w-full" />}
          {chapters.slice(0, 8).map((c) => {
            const k = `${c.subject}\u0000${c.chapter}`;
            return (
              <label key={k} className="row gap-2.5 sm">
                <input type="checkbox" checked={picked.has(k)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(k); else n.delete(k); return n; })} />
                <span className="col grow">
                  <span className="font-semibold">{c.chapter}</span>
                  <span className="xs muted">{c.subject} · {c.questions} in the test</span>
                </span>
                <span className="num xs">{c.accuracyPercent ?? "—"}% correct in this test</span>
              </label>
            );
          })}
          <label className="row gap-2.5 sm">
            <input type="checkbox" checked={wrong} onChange={(e) => setWrong(e.target.checked)} />
            <span className="col">
              <span>Also give each student the questions they got wrong here</span>
              <span className="xs muted">Up to 5 each, from these chapters</span>
            </span>
          </label>
        </fieldset>

        <div className="col gap-2">
          <span className="sm font-semibold">Who</span>
          <Segmented
            ariaLabel="Who"
            value={who}
            onChange={setWho}
            options={[
              { value: "all", label: "Whole batch", count: rows.length },
              { value: "weak", label: "Under 50% here", count: weak.length },
              { value: "pick", label: "Pick students", count: who === "pick" ? pick.size : undefined },
            ]}
          />
          {who === "pick" && (
            <div className="col gap-1.5">
              <input className="input" placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
              <div className="col max-h-48 overflow-auto">
                {pickList.map((r) => (
                  <label key={r.student.id} className="row gap-2 sm py-1" data-student={r.student.id}>
                    <input type="checkbox" checked={pick.has(r.student.id)} onChange={(e) => setPick((s) => { const n = new Set(s); if (e.target.checked) n.add(r.student.id); else n.delete(r.student.id); return n; })} />
                    <span className="grow">{r.student.name}</span>
                    <span className="xs muted">{r.student.batch?.name ?? ""} · {r.score}</span>
                  </label>
                ))}
              </div>
              <span className="xs muted">{pick.size} students picked. The score is from this test.</span>
            </div>
          )}
        </div>

        <div className="row wrap gap-4">
          <div className="col gap-1.5">
            <span className="sm font-semibold">Questions each</span>
            <NumberStepper value={count} onChange={setCount} min={1} max={50} aria-label="Questions each" />
          </div>
          <div className="col gap-1.5">
            <span className="sm font-semibold">Difficulty</span>
            <Segmented ariaLabel="Difficulty" value={diff} onChange={setDiff} options={DIFF} />
          </div>
          <div className="col gap-1.5">
            <span className="sm font-semibold">How</span>
            <Segmented ariaLabel="How" value={mode} onChange={setMode} options={[{ value: "practice", label: "Practice" }, { value: "timed", label: "Timed drill" }]} />
            <span className="xs muted">{mode === "practice" ? "Practice shows the solution after each answer." : `About ${Math.max(1, (count ?? 15) * 2)} minutes, the solution at the end.`}</span>
          </div>
        </div>

        <div className="col gap-1.5">
          <span className="sm font-semibold">Due</span>
          <DateTimeField value={due} onChange={setDue} aria-label="Due" slots={[18 * 60, 21 * 60]} />
          <span className="xs muted">They can still finish it late; you&rsquo;ll see it as late.</span>
        </div>

        <div className="col gap-1.5">
          <label className="sm font-semibold" htmlFor="ap-title">
            Title <span className="muted font-normal">(students see this)</span>
          </label>
          <input id="ap-title" className="input" value={title} placeholder={autoTitle} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <label className="sm font-semibold" htmlFor="ap-note">
            Note <span className="muted font-normal">(optional)</span>
          </label>
          <input id="ap-note" className="input" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </div>

        {avail &&
          (avail.enough ? (
            <span className="sm" data-testid="assign-available">
              <b>{inr(avail.available)} questions match</b> in your bank. Each student gets {count}, different from the next student&rsquo;s where possible. Questions in a live or upcoming test are never used.
            </span>
          ) : (
            <div className="k-bn round warn row wrap gap-2" role="status" data-testid="assign-short">
              <span className="t grow">
                <b>Only {avail.available} questions match</b> in {chosen.map((c) => c.chapter).join(" and ")}. Each student would get {avail.available}, not {count}.
              </span>
              {diff !== "mixed" && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDiff("mixed")}>
                  Switch to Mixed
                </button>
              )}
              {avail.available > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCount(avail.available)}>
                  Give {avail.available} each
                </button>
              )}
            </div>
          ))}
        {err && (
          <span className="sm text-danger" role="alert" data-testid="assign-error">
            {err}
          </span>
        )}
      </div>
    </Drawer>
  );
}

/** "Practice from this test": tiles per assignment, Change due date, Cancel. */
export function PracticeTracking({ testId }: { testId: string }) {
  const q = useTestAssignments(testId);
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState<string | null>(null);
  const [due, setDue] = React.useState<string | null>(null);
  const items = q.data?.items ?? [];
  if (!items.length) return null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["m6", "practice-assignments", testId] });
  return (
    <section className="col gap-3" data-testid="practice-tracking">
      {items.map((a: PracticeAssignment) => (
        <article key={a.id} className="card pad-lg col gap-3">
          <div className="row between wrap gap-2">
            <span className="col">
              <span className="h3">Practice from this test</span>
              <span className="xs muted">
                {a.title} · {a.questionCount} questions · set by {a.by.name ?? "staff"} on {istDate(a.createdAt)} · due {istDateTime(a.dueAt)}
              </span>
            </span>
            <span className="row gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(a.id); setDue(a.dueAt); }}>
                Change due date
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm danger-hover"
                onClick={async () => {
                  try {
                    await cancelAssign(a.id);
                    notify.success("Practice cancelled", { description: "Students no longer see it." });
                    await refresh();
                  } catch (e) {
                    notify.error("Couldn't cancel", { description: apiError(e).message });
                  }
                }}
              >
                Cancel practice
              </button>
            </span>
          </div>
          {editing === a.id && (
            <div className="row wrap gap-2">
              <DateTimeField value={due} onChange={setDue} aria-label="New due date" slots={[18 * 60, 21 * 60]} />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  try {
                    await changeDue(a.id, due!);
                    setEditing(null);
                    await refresh();
                  } catch (e) {
                    notify.error("Couldn't change the due date", { description: apiError(e).message });
                  }
                }}
              >
                Save
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <span className="col"><span className="xs muted">Assigned</span><b className="num text-[22px]">{a.tracking.assigned}</b><span className="xs muted">students</span></span>
            <span className="col"><span className="xs muted">Started</span><b className="num text-[22px]">{a.tracking.started}</b><span className="xs muted">{a.tracking.notStarted} not yet</span></span>
            <span className="col"><span className="xs muted">Finished</span><b className="num text-[22px]">{a.tracking.finished}</b><span className="xs muted">of {a.tracking.assigned}{a.tracking.finishedLate ? ` · ${a.tracking.finishedLate} late` : ""}</span></span>
            <span className="col"><span className="xs muted">Average so far</span><b className="num text-[22px]">{a.tracking.averageCorrect ?? "—"}</b><span className="xs muted">/ {a.questionCount}{a.tracking.finished ? ` from the ${a.tracking.finished} who finished` : ""}</span></span>
          </div>
          <span className="xs muted">Practice doesn&rsquo;t change scores or ranks.</span>
        </article>
      ))}
    </section>
  );
}
