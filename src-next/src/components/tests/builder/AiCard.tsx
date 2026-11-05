"use client";

/*
  Admin-TestBuilder "Describe the test" (AI test builder): description, the three chips, Build draft / busy stages /
  Rebuild (+ keep-hand-picked confirm), the shortfall note ("Built 72 of 75 …"), AI paused and daily-limit notes.
  The model only writes a spec; tests fills the bank by rule (contract "AI test builder"). "Credits used up" is M9.
*/
import { useRef, useState } from "react";
import { CircleAlert, Clock, Loader2, Pause, Sparkles } from "lucide-react";
import type { TestBuild, TestBuildStage, TestRef } from "@/lib/m6-contract";
import { apiError, errCode } from "@/lib/m6/client";
import { buildWithAi } from "@/lib/m6/builder";
import { Checkbox, ConfirmDialog, InlineNote, notify, TextArea } from "@/components/kit";

export type AiBlock = "paused" | "daily" | null;

const STAGE: Record<TestBuildStage, (picked?: number, total?: number) => string> = {
  readingPattern: () => "Reading the pattern…",
  picking: (_p, total) => (total ? `Picking ${total} questions…` : "Picking questions…"),
  balancing: () => "Balancing difficulty…",
};

export function AiCard({
  testId,
  revision,
  hasQuestions,
  manualCount,
  aiCount,
  disabled,
  block,
  onBlock,
  weakFrom,
  onBusy,
  onBuilt,
  onUndo,
  onPickShort,
}: {
  testId: string | null;
  revision: number | null;
  hasQuestions: boolean;
  manualCount: number;
  aiCount: number;
  /** new test (no pattern yet) or locked */
  disabled: boolean;
  block: AiBlock;
  onBlock: (b: AiBlock) => void;
  /** the exam's latest ended test ("Weak topics from Mock 11") */
  weakFrom: TestRef | null;
  onBusy: (busy: boolean) => void;
  onBuilt: (b: TestBuild) => void;
  onUndo: (revision: number) => Promise<void>;
  onPickShort: (subsectionId: string | null) => void;
}) {
  const [text, setText] = useState("");
  const [weak, setWeak] = useState(true);
  const [skipRecent, setSkipRecent] = useState(true);
  const [label, setLabel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [replaceManual, setReplaceManual] = useState(false);
  const [last, setLast] = useState<TestBuild | null>(null);
  const [undoRev, setUndoRev] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const fail = (title: string, description: string) => notify.error(title, { description });
  const busy = label !== null;
  const off = disabled || !!block || !testId || revision === null;

  const run = async (keepManual: boolean) => {
    if (!testId || revision === null) return;
    setConfirm(false);
    setLast(null);
    setLabel("Reading the pattern…");
    onBusy(true);
    abort.current = new AbortController();
    try {
      const b = await buildWithAi(
        testId,
        {
          description: text.trim().slice(0, 1000),
          options: { weakTopicsFromTestId: weak && weakFrom ? weakFrom.testId : null, skipRecentTests: skipRecent ? 4 : null },
          keepManual,
          expectedRevision: revision,
        },
        (e) => {
          if (e.event === "stage") setLabel(STAGE[e.data.stage](e.data.picked, e.data.total));
        },
        abort.current.signal
      );
      if (!b) {
        fail("Connection dropped during the build", "Reload the page to see what was built.");
      } else if (b.status === "failed") {
        fail("AI build didn't finish", b.error?.message ?? "Nothing changed and no credits were used. Try again in a moment.");
      } else {
        setLast(b);
        setUndoRev(b.previousRevision);
        onBuilt(b);
        if (b.previousRevision !== null) {
          const rev = b.previousRevision;
          notify.undo(`Built ${b.built} of ${b.total} questions`, () => doUndo(rev));
        }
      }
    } catch (e) {
      const code = errCode(e);
      if (code === "AI_PAUSED") onBlock("paused");
      else if (code === "ADMIN_AI_DAILY_LIMIT") onBlock("daily");
      else if (code === "AI_RATE_LIMITED") fail("Too many AI builds just now", "Wait a minute, then build again.");
      else if (code === "BUILD_RUNNING") fail("A build is already running", "It finishes in a few seconds; the questions appear when it does.");
      else if (code === "PAPER_CHANGED") fail("Questions changed meanwhile", "We loaded the other changes. Build again if you still want to.");
      else if (code === "TEST_LOCKED") fail("Test is locked", "Students have started it, so its questions can't change.");
      else if ((e as Error)?.name !== "AbortError") fail("Draft not built", apiError(e).message);
      if (code === "PAPER_CHANGED" || code === "TEST_LOCKED") onBuilt({ status: "failed" } as TestBuild);
    } finally {
      setLabel(null);
      onBusy(false);
    }
  };

  const doUndo = async (rev: number) => {
    try {
      await onUndo(rev);
      setUndoRev(null);
      setLast(null);
    } catch (e) {
      fail("Build not undone", apiError(e).message);
    }
  };

  const short = last?.shortfalls?.[0] ?? null;
  const missing = last ? last.total - last.built : 0;
  const replaceCount = aiCount + (replaceManual ? manualCount : 0);

  return (
    <section className="ai pad-lg col" style={{ gap: 12 }} aria-label="AI test builder">
      <span className="ai-mark">
        <Sparkles className="size-[13px]" aria-hidden />
        Describe the test <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
      </span>
      <label htmlFor="tb-prompt" className="sr-only">
        Test description for AI
      </label>
      <TextArea
        id="tb-prompt"
        rows={3}
        style={{ background: "#fff" }}
        disabled={off || busy}
        maxLength={1000}
        value={text}
        placeholder={
          weakFrom
            ? `e.g. Medium overall, more from the weak topics of ${weakFrom.shortName ?? weakFrom.name}, nothing used in the last 4 tests.`
            : "e.g. Medium overall, nothing used in the last 4 tests."
        }
        onChange={(e) => setText(e.target.value)}
      />
      {short && missing > 0 && (
        <div className="tb-note warn">
          <CircleAlert className="size-4" style={{ color: "#9A5800" }} aria-hidden />
          <span className="col grow" style={{ gap: 2 }}>
            <span className="sm" style={{ fontWeight: 600 }}>
              Built {last!.built} of {last!.total}. {short.chapter || "One chapter"} has only {short.available} unused question{short.available === 1 ? "" : "s"}; you asked for {short.wanted}.
            </span>
            <span className="sm">Pick {missing} more yourself, or ask for less from that chapter.</span>
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onPickShort(short.subsectionId || null)}>
            Pick {missing}
          </button>
        </div>
      )}
      {block === "paused" && (
        <InlineNote icon={<Pause className="size-4 text-muted" aria-hidden />}>
          <b>AI is paused for your institute.</b> Pick questions section by section below; everything else works as usual.
        </InlineNote>
      )}
      {block === "daily" && (
        <InlineNote tone="warn" icon={<Clock className="size-4" aria-hidden />}>
          Today&apos;s AI test builds are used up. Build again after midnight, or pick questions yourself.
        </InlineNote>
      )}
      <div className="row between wrap" style={{ gap: 8 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          <button type="button" className="chip on" aria-pressed="true" disabled>
            Use the pattern above
          </button>
          {weakFrom && (
            <button type="button" className={`chip ${weak ? "on" : ""}`} aria-pressed={weak} disabled={off || busy} onClick={() => setWeak(!weak)}>
              Weak topics from {weakFrom.shortName ?? weakFrom.name}
            </button>
          )}
          <button type="button" className={`chip ${skipRecent ? "on" : ""}`} aria-pressed={skipRecent} disabled={off || busy} onClick={() => setSkipRecent(!skipRecent)}>
            Skip recently used
          </button>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {busy ? (
            <button type="button" className="btn btn-primary tb-ai-busy" disabled aria-busy="true">
              <Loader2 className="spin size-3.5" aria-hidden />
              <span aria-live="polite">{label}</span>
            </button>
          ) : !hasQuestions ? (
            <button type="button" className="btn btn-primary" disabled={off} onClick={() => void run(true)}>
              <Sparkles className="size-[13px]" aria-hidden />
              Build draft
            </button>
          ) : (
            <>
              {undoRev !== null && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void doUndo(undoRev)}>
                  Undo build
                </button>
              )}
              <button type="button" className="btn btn-secondary" disabled={off} onClick={() => (manualCount > 0 ? (setReplaceManual(false), setConfirm(true)) : void run(true))}>
                ↻ Rebuild
              </button>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="navy"
        title="Rebuild the draft?"
        description={`You picked ${manualCount} question${manualCount === 1 ? "" : "s"} by hand since the last build.`}
        confirmLabel={`Rebuild ${replaceCount}`}
        onConfirm={() => void run(!replaceManual)}
        facts={[
          ["Hand-picked", replaceManual ? `${manualCount} replaced too` : `${manualCount} kept where they are`],
          ["AI picks", `${aiCount} replaced with new ones`],
          ["Undo", "One click, until you leave the page"],
        ]}
      >
        <Checkbox checked={replaceManual} onChange={setReplaceManual}>
          Replace my {manualCount} hand-picked question{manualCount === 1 ? "" : "s"} too
        </Checkbox>
      </ConfirmDialog>
    </section>
  );
}
