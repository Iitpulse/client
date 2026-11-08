"use client";

/*
  "N of these are already in the library" (board Admin-LibraryPublish, state added-to-test-warning). One dialog,
  mounted in the dashboard layout, answers lib/m10-library-warning.ts: every paper write on an IIT-PULSE paper that
  adds questions already published to the shared library asks here first. Cancel / "Swap these N for others" /
  "Add all M anyway" (the add is recorded in the audit log by api-tests).
*/
import { KitDialog, notify } from "@/components/kit";
import { answerLibraryWarning, swappedNote, useLibraryWarning, type LibraryWarningChoice, type LibraryWarningQuestion } from "@/lib/m10-library-warning";

const IST = "Asia/Kolkata";
const fmt = (n: number) => n.toLocaleString("en-IN");
/** "3 Nov" */
const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-IN", { timeZone: IST, day: "numeric", month: "short" }).format(new Date(iso)) : null);
/** "Sun 6 Dec" */
const opensDay = (iso: string) => new Intl.DateTimeFormat("en-IN", { timeZone: IST, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(",", "");
/** "QS_4b68" (bank ids are long) */
const shortQ = (id: string) => /^([A-Z]{2})_([0-9a-f]{4})/i.exec(id)?.slice(1, 3).join("_") ?? id;

function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** "LIB-PH-0412 (from QS_c865) and LIB-MA-1180 (from QS_e902) were published on 3 Nov." */
function publishedLine(qs: LibraryWarningQuestion[]): string {
  const shown = qs.slice(0, 6);
  const more = qs.length - shown.length;
  const days = new Set(qs.map((q) => day(q.publishedAt)));
  const oneDay = days.size === 1 ? [...days][0] : null;
  const items = shown.map((q) => {
    const d = oneDay ? null : day(q.publishedAt);
    return `${q.libraryId} (from ${shortQ(q.questionId)}${d ? `, published ${d}` : ""})`;
  });
  if (more > 0) items.push(`${fmt(more)} more`);
  const verb = qs.length === 1 ? "was" : "were";
  return `${joinList(items)} ${verb} published${oneDay ? ` on ${oneDay}` : ""}.`;
}

export function LibraryWarningDialog() {
  const req = useLibraryWarning();
  if (!req) return null;
  const n = req.questions.length;
  const m = req.picked;
  const others = m != null ? Math.max(0, m - n) : null;
  const title = (m ?? n) === 1 ? "This question is already in the library" : m === n ? `These ${fmt(n)} are already in the library` : `${fmt(n)} of these ${n === 1 ? "is" : "are"} already in the library`;
  const lead = req.test ? `Adding to ${req.test.name}${req.test.opensAt ? ` (opens ${opensDay(req.test.opensAt)})` : ""}` : undefined;
  const answer = (c: LibraryWarningChoice) => {
    // swapping every picked one leaves nothing to add: say what to do next (the write is skipped)
    if (c === "swap" && others === 0) notify.success("Nothing was added", { description: swappedNote(n) });
    answerLibraryWarning(c);
  };
  return (
    <KitDialog
      open
      alert
      width="wide"
      onOpenChange={(o) => !o && answer("cancel")}
      title={title}
      description={lead}
      initialFocus="lib-warn-cancel"
      footer={
        <>
          <button id="lib-warn-cancel" type="button" className="btn btn-ghost" onClick={() => answer("cancel")}>
            Cancel
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => answer("swap")}>
            {n === 1 ? "Swap it for another" : `Swap these ${fmt(n)} for others`}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => answer("add")}>
            {m == null ? (n === 1 ? "Add it anyway" : "Add them anyway") : m === 1 ? "Add it anyway" : `Add all ${fmt(m)} anyway`}
          </button>
        </>
      }
    >
      <div className="row items-start gap-2.5 rounded-[10px] border border-[#F1D29A] bg-[#FFF4E2] px-3 py-2.5 text-[13px] leading-[1.45] text-[#5C3600]" role="note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0">
          <path d="M12 3 2 20h20z" />
          <path d="M12 10v4M12 17h.01" />
        </svg>
        <span className="min-w-0">
          <b className="font-semibold">Other institutes can already see {n === 1 ? "this answer" : "these answers"}.</b> {publishedLine(req.questions)} A student who also studies at one of
          those institutes may have seen {n === 1 ? "it" : "them"}.
        </span>
      </div>
      <span className="xs muted">
        If you add {n === 1 ? "it" : "them"} anyway, it&apos;s saved in the audit log.
        {others ? ` The other ${others === 1 ? "question" : `${fmt(others)} questions`} you picked ${others === 1 ? "isn't" : "aren't"} in the library.` : ""}
      </span>
    </KitDialog>
  );
}
