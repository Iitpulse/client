"use client";

/*
  Add to schedule (batch 8, board Admin-AddSchedule): a drawer from the Results page (batch summary header and each
  "Revise" suggestion). Revision class / Doubt session put a class on the tests calendar (no questions, no score):
  title, for (batches, or only the students under 50% here), when (IST) and length with a live clash line, teacher,
  where (centre or online), tell students now and remind them 1 hour before. Retest makes a draft test (new questions
  from the same chapters, or the same questions again) and opens it in the test builder; students hear nothing until
  it is published. Contract api-tests docs/batch8-api.md "Add to schedule".
*/
import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { DateTimeField, Drawer, NumberStepper, Segmented, inr, notify } from "@/components/kit";
import { apiError, m6Tests, source, unwrap } from "@/lib/m6/client";
import { istDateTime, istTime } from "@/lib/m6/shared";
import type { ResultRow } from "@/lib/m6/results-admin";
import { useAllResultRows } from "@/lib/m6/assignments";
import { checkEvent, createEvent, type Clash, type EventKind } from "@/lib/m6/batch8";

type Kind = "revision" | "doubt" | "retest";
const KINDS: Array<{ value: Kind; label: string }> = [
  { value: "revision", label: "Revision class" },
  { value: "doubt", label: "Doubt session" },
  { value: "retest", label: "Retest" },
];
const HINT: Record<Kind, string> = {
  revision: "A class on the calendar. No questions, no score.",
  doubt: "Students bring questions; shows on the calendar and on their Home.",
  retest: "A new short test for the same students.",
};

/** tomorrow 5:00 PM IST */
const tomorrowAt = (h: number) => {
  const d = new Date(Date.now() + 86_400_000);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
  return new Date(`${day}T${String(h).padStart(2, "0")}:00:00+05:30`).toISOString();
};

export interface ScheduleTest {
  testId: string;
  name: string;
  maxScore: number;
  exam: { id: string; name: string } | null;
  pattern: { id: string; name: string } | null;
  batches: Array<{ id: string; name: string }>;
}

export function AddScheduleDrawer({ open, onClose, test, hint }: { open: boolean; onClose: () => void; test: ScheduleTest; hint?: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const all = useAllResultRows(test.testId, open);
  const rows: ResultRow[] = React.useMemo(() => all.data ?? [], [all.data]);
  const [kind, setKind] = React.useState<Kind>("revision");
  const [title, setTitle] = React.useState("");
  const [batchIds, setBatchIds] = React.useState<string[]>([]);
  const [weak, setWeak] = React.useState(false);
  const [at, setAt] = React.useState<string>(() => tomorrowAt(17));
  const [minutes, setMinutes] = React.useState<number | null>(60);
  const [teacher, setTeacher] = React.useState("");
  const [placeKind, setPlaceKind] = React.useState<"centre" | "online">("centre");
  const [place, setPlace] = React.useState("");
  const [tell, setTell] = React.useState(true);
  const [remind, setRemind] = React.useState(true);
  const [same, setSame] = React.useState<"new" | "same">("new");
  const [opens, setOpens] = React.useState<string>(() => tomorrowAt(9));
  const [closes, setCloses] = React.useState<string>(() => tomorrowAt(21));
  const [clashes, setClashes] = React.useState<Clash[]>([]);
  const [ph, setPh] = React.useState<"open" | "busy" | "failed">("open");
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setBatchIds(test.batches.map((b) => b.id));
      setPh("open");
      setErr(null);
    }
  }, [open, test.batches]);

  const weakRows = rows.filter((r) => test.maxScore > 0 && r.score < test.maxScore / 2 && (!batchIds.length || (r.student.batch && batchIds.includes(r.student.batch.id))));
  const inBatches = rows.filter((r) => !batchIds.length || (r.student.batch && batchIds.includes(r.student.batch.id)));
  const autoTitle = kind === "revision" ? `Revision: ${test.name}` : kind === "doubt" ? `Doubt session: ${test.name}` : `Retest: ${test.name}`;
  const batchText = test.batches.filter((b) => batchIds.includes(b.id)).map((b) => b.name).join(", ");

  // the clash line: other tests and classes of these batches at that time
  React.useEffect(() => {
    if (!open || kind === "retest" || !batchIds.length || !minutes) return setClashes([]);
    let live = true;
    const t = setTimeout(() => {
      checkEvent({ batchIds, startsAt: at, minutes })
        .then((r) => live && setClashes(r.clashes))
        .catch(() => live && setClashes([]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, kind, at, minutes, batchIds]);

  const firstFree = () => {
    const c = clashes.at(-1);
    if (c) setAt(c.endsAt);
  };

  const save = async () => {
    setErr(null);
    if (!batchIds.length) return setErr("Pick a batch.");
    setPh("busy");
    try {
      if (kind === "retest") {
        const name = (title.trim() || autoTitle).slice(0, 200);
        const created =
          same === "same"
            ? unwrap<{ test: { id: string } }>((await m6Tests.post(`/admin/tests/${encodeURIComponent(test.testId)}/duplicate`, { name }, source("Results · Add to schedule"))).data).test
            : unwrap<{ test: { id: string } }>((await m6Tests.post("/admin/tests", { name, examId: test.exam?.id, patternId: test.pattern?.id }, source("Results · Add to schedule"))).data).test;
        await m6Tests.patch(`/admin/tests/${encodeURIComponent(created.id)}`, { batchIds, opensAt: opens, closesAt: closes }, source("Results · Add to schedule"));
        notify.success("Draft retest made", { description: "Students hear nothing until you publish it." });
        onClose();
        router.push(`/tests/${encodeURIComponent(created.id)}/edit`);
        return;
      }
      const r = await createEvent({
        kind: kind as EventKind,
        title: (title.trim() || autoTitle).slice(0, 120),
        batchIds,
        studentIds: weak ? weakRows.map((x) => x.student.id) : null,
        startsAt: at,
        minutes: minutes ?? 60,
        placeKind,
        place: place.trim() || null,
        teacher: teacher.trim() ? { name: teacher.trim() } : null,
        sourceTestId: test.testId,
        notify: tell,
        remind,
      });
      await qc.invalidateQueries({ queryKey: ["m6", "schedule-events"] });
      await qc.invalidateQueries({ queryKey: ["m6", "calendar"] });
      notify.success(`Added to the calendar: ${r.event.title}, ${istDateTime(r.event.startsAt)}.`, { description: tell ? `${inr(r.told)} students were told.` : "No student was told." });
      setPh("open");
      onClose();
    } catch (e) {
      const a = apiError(e);
      setPh("failed");
      setErr(
        a.code === "OUT_OF_SCOPE"
          ? "Some of these batches or students are outside your batches."
          : a.code === "VALIDATION_ERROR"
            ? (a.message ?? "Check the fields.")
            : a.code === "TEST_LOCKED"
              ? (a.message ?? "That test can't change now.")
              : "Not added. The calendar didn't answer, so nothing was saved and no student was told. Try again in a moment.",
      );
    }
  };

  const whoN = weak ? weakRows.length : inBatches.length;
  const cta = ph === "busy" ? "Adding…" : ph === "failed" ? "Try again" : kind === "retest" ? "Make draft retest" : "Add to calendar";

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width="wide"
      busy={ph === "busy"}
      title="Add to schedule"
      subtitle={<span className="xs muted">From the batch summary · {test.name}</span>}
      footer={
        <div className="row between w-full gap-2">
          <span className="xs muted">{kind === "retest" ? "This makes a draft test and opens it in the test builder." : "Classes and sessions don't have questions or scores."}</span>
          <div className="row gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={ph === "busy"}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={ph === "busy"} data-testid="schedule-submit">
              {cta}
            </button>
          </div>
        </div>
      }
    >
      <div className="col gap-4" data-testid="schedule-drawer">
        {hint && <span className="sm text-ink-2">Suggested: {hint}</span>}
        <div className="col gap-1.5">
          <span className="sm font-semibold">What</span>
          <Segmented ariaLabel="What" value={kind} onChange={setKind} options={KINDS} />
          <span className="xs muted">{HINT[kind]}</span>
        </div>

        <div className="col gap-1.5">
          <label className="sm font-semibold" htmlFor="se-title">
            Title
          </label>
          <input id="se-title" className="input" value={title} placeholder={autoTitle} maxLength={120} onChange={(e) => setTitle(e.target.value)} data-testid="schedule-title" />
          <span className="xs muted">Students see this on Home and in the reminder.</span>
        </div>

        <fieldset className="col gap-1.5">
          <legend className="sm font-semibold">For</legend>
          <div className="row wrap gap-3">
            {test.batches.map((b) => (
              <label key={b.id} className="row gap-2 sm">
                <input type="checkbox" checked={batchIds.includes(b.id)} onChange={(e) => setBatchIds((s) => (e.target.checked ? [...s, b.id] : s.filter((x) => x !== b.id)))} />
                {b.name}
              </label>
            ))}
          </div>
          {kind !== "retest" && (
            <label className="row gap-2 sm">
              <input type="checkbox" checked={weak} onChange={(e) => setWeak(e.target.checked)} data-testid="schedule-weak" />
              Only students under 50% in this test <span className="muted">({weakRows.length})</span>
            </label>
          )}
          <span className="xs muted">{weak ? `${whoN} of ${inBatches.length} students${batchText ? ` in ${batchText}` : ""}, picked from this test` : `${batchText || "No batch picked"}`}</span>
        </fieldset>

        {kind !== "retest" ? (
          <>
            <div className="row wrap items-start gap-4">
              <div className="col gap-1.5">
                <span className="sm font-semibold">When</span>
                <DateTimeField value={at} onChange={(v) => v && setAt(v)} aria-label="When" slots={[10 * 60, 16 * 60, 17 * 60, 18 * 60]} />
                <span className="xs muted">India time (IST)</span>
              </div>
              <div className="col gap-1.5">
                <span className="sm font-semibold">Length</span>
                <NumberStepper value={minutes} onChange={setMinutes} min={5} max={600} step={15} aria-label="Length in minutes" />
                <span className="xs muted">minutes</span>
              </div>
            </div>
            {clashes.length > 0 && (
              <div className="k-bn round warn row wrap gap-2" role="status" data-testid="schedule-clash">
                <span className="t grow">
                  <b>Clashes with {clashes.map((c) => c.name).join(", ")}</b> for {batchText}, {istDateTime(clashes[0]!.startsAt)}–{istTime(clashes[0]!.endsAt)}. You can still add it.
                </span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={firstFree}>
                  Move to {istTime(clashes.at(-1)!.endsAt)}
                </button>
              </div>
            )}
            <div className="row wrap items-start gap-4">
              <div className="col gap-1.5">
                <label className="sm font-semibold" htmlFor="se-teacher">
                  Teacher
                </label>
                <input id="se-teacher" className="input" value={teacher} maxLength={80} placeholder="Name" onChange={(e) => setTeacher(e.target.value)} />
              </div>
              <div className="col gap-1.5">
                <span className="sm font-semibold">Where</span>
                <Segmented ariaLabel="Where" value={placeKind} onChange={setPlaceKind} options={[{ value: "centre", label: "At a centre" }, { value: "online", label: "Online" }]} />
                <input className="input" value={place} maxLength={120} placeholder={placeKind === "centre" ? "Centre and room" : "Meeting link or note"} onChange={(e) => setPlace(e.target.value)} aria-label="Place" />
              </div>
            </div>
            <fieldset className="col gap-1.5">
              <legend className="sm font-semibold">Tell students</legend>
              <label className="row gap-2 sm">
                <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} data-testid="schedule-tell" />
                Email and app note now <span className="muted">({whoN} students)</span>
              </label>
              <label className="row gap-2 sm">
                <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
                Remind them 1 hour before
              </label>
            </fieldset>
          </>
        ) : (
          <>
            <div className="col gap-1.5">
              <span className="sm font-semibold">Pattern</span>
              <span className="sm">{test.pattern?.name ?? "The same pattern"}</span>
              <span className="xs muted">The pattern {test.name} used. You can change it in the test builder.</span>
            </div>
            <div className="col gap-1.5">
              <span className="sm font-semibold">Questions</span>
              <Segmented ariaLabel="Questions" value={same} onChange={setSame} options={[{ value: "new", label: "New questions, same chapters" }, { value: "same", label: "The same questions again" }]} />
              <span className="xs muted">{same === "new" ? "Pick them in the builder from the same chapters; questions in a live or upcoming test are never offered." : "A copy of this test's paper."}</span>
            </div>
            <div className="row wrap items-start gap-4">
              <div className="col gap-1.5">
                <span className="sm font-semibold">Opens</span>
                <DateTimeField value={opens} onChange={(v) => v && setOpens(v)} aria-label="Opens" />
              </div>
              <div className="col gap-1.5">
                <span className="sm font-semibold">Closes</span>
                <DateTimeField value={closes} onChange={(v) => v && setCloses(v)} aria-label="Closes" />
              </div>
            </div>
            <span className="xs muted">
              This makes a <b>draft test</b> on the calendar and opens it in the test builder. Students hear nothing until you publish it there.
            </span>
          </>
        )}
        {err && (
          <span className="sm text-danger" role="alert" data-testid="schedule-error">
            {err}
          </span>
        )}
      </div>
    </Drawer>
  );
}
