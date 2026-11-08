"use client";

/*
  Admin-Analysis fix-key → fix-impact → fix-confirm (owner D6). Step 1 picks the new key (change / accept another
  answer as well / drop), step 2 shows what the re-score changes (POST …/key-fix/preview), then a navy confirm starts the
  re-score (POST …/key-fix, 202). The page polls the correction and shows fix-progress / fix-done.
*/
import * as React from "react";
import { MathText } from "@/components/math-text";
import { ConfirmDialog, Drawer, RangeFields } from "@/components/kit";
import type { AnswerKey, KeyCorrection, KeyFixPreview, KeyFixPreviewRequest } from "@/lib/m6-contract";
import { previewKeyFix, startKeyFix } from "@/lib/m6/keyfix";
import { keyLabel, LETTERS, sameIds, type ItemStat } from "./analysis";

type Mode = "changeKey" | "acceptAlso" | "drop";

interface Props {
  open: boolean;
  onClose: () => void;
  testId: string;
  testName: string;
  stat: ItemStat;
  /** submissions on the paper (fallback before the preview answers) */
  submissions: number;
  onStarted: (c: KeyCorrection) => void;
}

const fmt = (x: number) => (Number.isInteger(x) ? String(x) : (Math.round(x * 10) / 10).toFixed(1));

function errorText(e: unknown): { field: string | null; text: string } {
  const err = e as { code?: string | null; message?: string | null; details?: { fields?: Record<string, { message?: string }> } | null };
  const fields = err?.details?.fields;
  if (err?.code === "VALIDATION_ERROR" && fields) {
    const [k, v] = Object.entries(fields)[0] ?? [];
    if (k) return { field: k, text: v?.message ?? "Check this" };
  }
  if (err?.code === "KEY_FIX_RUNNING") return { field: null, text: "A re-score is already running for this test. Wait for it to finish, then try again." };
  return { field: null, text: err?.message || "Couldn't check what changes. Try again." };
}

export function FixKeyDrawer({ open, onClose, testId, testName, stat, submissions, onStarted }: Props) {
  const item = stat.item;
  const isNum = item.type === "integer";
  const current = item.key.optionIds ?? [];
  const [step, setStep] = React.useState<1 | 2>(1);
  const [mode, setMode] = React.useState<Mode>("changeKey");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [updateBank, setUpdateBank] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<{ field: string | null; text: string } | null>(null);
  const [preview, setPreview] = React.useState<KeyFixPreview | null>(null);
  const [confirm, setConfirm] = React.useState(false);

  const currentLabel = keyLabel(item, item.key);
  const typedKey: AnswerKey | null = isNum
    ? from.trim() !== "" && Number.isFinite(Number(from))
      ? { range: { from: Number(from), to: to.trim() === "" ? Number(from) : Number(to) } }
      : null
    : picked.length
      ? { optionIds: [...picked].sort() }
      : null;
  const typedLabel = typedKey ? keyLabel(item, typedKey) : "";

  const pick = (id: string) => {
    if (mode === "drop") setMode("changeKey");
    setErr(null);
    if (item.type === "multiple") setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    else if (!current.includes(id)) setPicked([id]);
  };

  const ready = mode === "drop" || (!!typedKey && !(mode === "changeKey" && !isNum && sameIds(picked, current)));

  const check = async () => {
    if (!ready) {
      setErr({ field: "newKey", text: isNum ? "Enter the answer (a number, or a range from–to)" : "Pick the correct option" });
      return;
    }
    const body: KeyFixPreviewRequest =
      mode === "drop"
        ? { questionId: item.questionId, mode, newKey: item.key }
        : mode === "acceptAlso"
          ? { questionId: item.questionId, mode, newKey: item.key, acceptKeys: [typedKey!] }
          : { questionId: item.questionId, mode, newKey: typedKey!, updateBank };
    setBusy(true);
    setErr(null);
    try {
      setPreview(await previewKeyFix(testId, body));
      setStep(2);
    } catch (e) {
      setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!preview) return;
    const c = await startKeyFix(testId, preview.previewId);
    setConfirm(false);
    onStarted(c);
    onClose();
  };

  const n = `Q${item.n}`;
  const changeWords =
    mode === "drop" ? `${n} is dropped` : mode === "acceptAlso" ? `${n} accepts ${typedLabel} as well as ${currentLabel}` : `Key for ${n} goes from ${currentLabel} to ${typedLabel}`;
  const total = preview?.submissions ?? submissions;
  const biggest = preview?.examples.reduce((m, x) => Math.max(m, Math.abs(x.rank.after - x.rank.before)), 0) ?? 0;

  return (
    <>
      <Drawer
        open={open && !confirm}
        onOpenChange={(o) => !o && onClose()}
        width="wide"
        busy={busy}
        aria-label={`Fix the answer key for ${n}`}
        title={`Fix the answer key · ${n}`}
        subtitle={
          <span className="an-steps mt-1.5" aria-label={`Step ${step} of 2`}>
            <span className={`row gap-1.5 ${step === 1 ? "on" : "dn"}`}>
              <span className="n">1</span>New key
            </span>
            <span aria-hidden>—</span>
            <span className={`row gap-1.5 ${step === 2 ? "on" : ""}`}>
              <span className="n">2</span>Check what changes
            </span>
          </span>
        }
        footer={
          step === 1 ? (
            <div className="row between w-full">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={check} disabled={busy} data-testid="fix-next">
                {busy ? "Checking…" : "Next: check what changes"}
              </button>
            </div>
          ) : (
            <div className="row between w-full">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setConfirm(true)} data-testid="fix-rescore">
                Re-score {total} result{total === 1 ? "" : "s"}…
              </button>
            </div>
          )
        }
      >
        {step === 1 ? (
          <div className="col gap-4" data-testid="fix-step-1">
            {item.stem && <MathText html as="div" className="font-serif text-[15px] leading-[1.55]" text={item.stem} />}
            {!isNum && item.options.length > 0 && (
              <div className="row wrap sm gap-3.5">
                {item.options.map((o, i) => (
                  <span key={o.id} className="row gap-1">
                    <b className="mono">{LETTERS[i]}</b>
                    <MathText html as="span" className="font-serif" text={o.value} />
                  </span>
                ))}
              </div>
            )}
            <div className="col gap-2" role="radiogroup" aria-label="What to change">
              <label className={`an-choice ${mode === "changeKey" ? "on" : ""}`}>
                <input type="radio" name="fx" checked={mode === "changeKey"} onChange={() => setMode("changeKey")} />
                <span className="col grow gap-2">
                  <span className="sm font-semibold">Change the key</span>
                  {isNum ? (
                    <span className="col gap-1.5">
                      <span className="xs muted">Now {currentLabel}. A single answer goes in From; a range in both.</span>
                      <RangeFields
                        idPrefix="fx-range"
                        from={from}
                        to={to}
                        onChange={(f, t) => {
                          setFrom(f);
                          setTo(t);
                          setErr(null);
                          if (mode === "drop") setMode("changeKey");
                        }}
                      />
                    </span>
                  ) : (
                    <span className="an-keys">
                      {item.options.map((o, i) => {
                        const on = picked.includes(o.id);
                        const cur = current.includes(o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className={`an-kb ${on ? "on" : ""} ${cur ? "cur" : ""}`}
                            aria-pressed={on}
                            onClick={(e) => {
                              e.preventDefault();
                              pick(o.id);
                            }}
                          >
                            {LETTERS[i]}
                            {cur && <span className="xs font-medium">now</span>}
                          </button>
                        );
                      })}
                    </span>
                  )}
                </span>
              </label>
              <label className={`an-choice ${mode === "acceptAlso" ? "on" : ""}`}>
                <input type="radio" name="fx" checked={mode === "acceptAlso"} onChange={() => setMode("acceptAlso")} />
                <span className="col gap-0.5">
                  <span className="sm font-semibold">{typedLabel ? `Accept ${typedLabel} or ${currentLabel}` : `Accept another answer as well as ${currentLabel}`}</span>
                  <span className="xs muted">Both get full marks. For a question with two defensible answers.</span>
                </span>
              </label>
              <label className={`an-choice ${mode === "drop" ? "on" : ""}`}>
                <input type="radio" name="fx" checked={mode === "drop"} onChange={() => setMode("drop")} />
                <span className="col gap-0.5">
                  <span className="sm font-semibold">Drop the question</span>
                  <span className="xs muted">
                    Everyone who wrote the test gets {fmt(item.marking.correct)} mark{item.marking.correct === 1 ? "" : "s"} for it, answered or not.
                  </span>
                </span>
              </label>
            </div>
            {err && (
              <span className="sm text-danger" role="alert" data-testid="fix-error">
                {err.text}
              </span>
            )}
            {mode === "changeKey" && (
              <label className="an-chk">
                <input type="checkbox" checked={updateBank} onChange={(e) => setUpdateBank(e.target.checked)} />
                <span className="col gap-0.5">
                  <span>
                    Also fix it in the question bank (<span className="mono">{item.slotId.slice(0, 7)}</span>)
                  </span>
                  <span className="xs muted">So future tests use the right key. Ended tests that used it keep their scores unless you fix them too.</span>
                </span>
              </label>
            )}
          </div>
        ) : preview ? (
          <div className="col gap-4" data-testid="fix-step-2">
            <span className="sm">
              {changeWords}.{" "}
              {preview.resultPublished
                ? `This test is published, so scores and ranks are worked out again for all ${preview.submissions} students.`
                : `Scores and ranks are worked out again for all ${preview.submissions} students before results go out.`}
            </span>
            <div className="an-tiles">
              <div className="an-tile">
                <span className="xs muted">Scores that change</span>
                <b data-testid="fix-scores-change">{preview.scoresChange}</b>
                <span className="xs muted">
                  {preview.marksUp} gain · {preview.marksDown} lose
                </span>
              </div>
              <div className="an-tile">
                <span className="xs muted">Ranks that change</span>
                <b>{preview.ranksChange}</b>
                <span className="xs muted">{biggest ? `Biggest move: ${biggest} place${biggest === 1 ? "" : "s"}` : "No rank moves"}</span>
              </div>
              <div className="an-tile">
                <span className="xs muted">Batch average</span>
                <b>
                  {fmt(preview.averageBefore)} → {fmt(preview.averageAfter)}
                </b>
              </div>
            </div>
            {preview.examples.length > 0 && (
              <div className="col gap-1.5">
                <span className="xs font-semibold">Examples</span>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th className="num">Score</th>
                      <th className="num">Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.examples.slice(0, 6).map((x) => (
                      <tr key={x.student.id}>
                        <td className="sm">{x.student.name}</td>
                        <td className="num sm">
                          {fmt(x.score.before)} → {fmt(x.score.after)}
                        </td>
                        <td className="num sm">
                          {x.rank.before} → {x.rank.after}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="col gap-1.5 text-[13px]">
              <span className="xs font-semibold">Also happens</span>
              <span>
                {preview.studentsNotified
                  ? `The ${preview.studentsNotified} student${preview.studentsNotified === 1 ? "" : "s"} whose mark changes see "Key corrected for ${n}" with their old and new score on their result${preview.emailed ? `, and ${preview.emailed} get a short email with the new score and rank` : ""}.`
                  : `No student's mark on ${n} changes, so nobody gets a "key corrected" note.`}
              </span>
              <span>The batch summary and their AI reviews are written again.</span>
              <span>Results stay visible while this runs, about a minute.</span>
            </div>
          </div>
        ) : null}
      </Drawer>
      {preview && (
        <ConfirmDialog
          open={confirm}
          onOpenChange={(o) => !o && setConfirm(false)}
          tone="navy"
          title={`Re-score ${testName}?`}
          description={
            mode === "drop"
              ? `You dropped ${n}: everyone gets full marks for it.`
              : mode === "acceptAlso"
                ? `You accepted (${typedLabel}) as well as (${currentLabel}) for ${n}.`
                : `You changed the key for ${n} from (${currentLabel}) to (${typedLabel}).`
          }
          facts={[
            ["Scores", `${preview.submissions} recalculated, ranks too`],
            ["Students", `${preview.studentsNotified} see a "key corrected" note`],
            ["Record", "Saved to the audit log"],
          ]}
          confirmLabel={`Re-score ${preview.submissions} student${preview.submissions === 1 ? "" : "s"}`}
          onConfirm={run}
        />
      )}
    </>
  );
}
