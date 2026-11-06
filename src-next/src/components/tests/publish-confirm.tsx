"use client";

// Admin-PublishConfirm (batch 7, canvas v180): "Publish <test>?" before a test goes to students, from the test builder
// and the Tests list row menu. Facts from GET /tests/admin/tests/:id/publish-preview (window, batches, who is told and
// how, questions and marks, exam screen); warnings that don't block publishing, with a Fix link; blocking checks keep
// Publish off. Publishing itself is the unchanged POST …/publish (lib/m6/builder publishTest). Students' own "Test
// published" email switch decides who gets an email; there is no switch to suppress them here.
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/kit";
import { m6Call, m6Tests, unwrap } from "@/lib/m6/client";
import { istDateTime } from "@/lib/m6/shared";
import type { PublishPreview, PublishWarningCode } from "@/lib/m6-contract";

const N = (n: number) => n.toLocaleString("en-IN");
const BLOCK: Record<string, string> = {
  NAME_EXAM_PATTERN: "Add the name, exam and pattern.",
  WINDOW: "Set when it opens and closes.",
  BATCHES: "Pick at least one batch with students.",
  QUESTIONS: "Fill every question slot.",
  WITHOUT_SOLUTION: "Some questions need a solution.",
  NEEDS_LATEX: "Some equations are images.",
  TEMPLATE: "Pick an exam screen template.",
};

export function usePublishPreview(testId: string | null) {
  return useQuery({
    // own key (not under ["m6", "tests"]): publishing invalidates the tests lists, and a refetch then would answer
    // 409 NOT_DRAFT for the test just published
    queryKey: ["m6-publish-preview", testId ?? ""],
    enabled: !!testId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: () =>
      m6Call<PublishPreview>(
        "tests",
        async () => unwrap<PublishPreview>((await m6Tests.get(`/admin/tests/${testId}/publish-preview`)).data),
        () => {
          throw new Error("Publish preview is not available on sample data.");
        },
        true
      ),
  });
}

function warningText(w: PublishPreview["warnings"][number]): string {
  const n = w.count;
  const where = w.where.length ? ` (${w.where.slice(0, 3).join(", ")}${w.where.length > 3 ? "…" : ""})` : "";
  const t: Record<PublishWarningCode, string> = {
    NEEDS_LATEX: `${n} ${n === 1 ? "equation is an image" : "equations are images"}${where}. Students can still answer.`,
    WITHOUT_SOLUTION: `${n} ${n === 1 ? "question has" : "questions have"} no solution, so AI review skips ${n === 1 ? "it" : "them"}${where}.`,
    EMPTY_KEY: `${n} ${n === 1 ? "question has" : "questions have"} no answer key${where}. ${n === 1 ? "It" : "They"} can't be marked until you add one.`,
    MISSING_HINDI: `${n} ${n === 1 ? "question has" : "questions have"} no Hindi${where}. Students see the English text.`,
    OVERLAP: `Another test of the same batch overlaps this window${w.tests?.length ? `: ${w.tests.map((x) => x.name).join(", ")}` : ""}.`,
    TEMPLATE_MISSING: "The exam screen template is missing. Students get the NTA standard screen.",
  };
  return t[w.code] ?? w.code;
}

export function PublishConfirmDialog({
  testId,
  open,
  onOpenChange,
  onConfirm,
  fixHref,
}: {
  testId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** publish; a thrown error stays in the dialog ("Not published…") */
  onConfirm: () => Promise<unknown>;
  /** where "Fix" goes (the builder) */
  fixHref?: string;
}) {
  const q = usePublishPreview(open ? testId : null);
  const p = q.data;
  const opensNow = !!p && (!p.test.opensAt || Date.parse(p.test.opensAt) <= Date.parse(p.now));
  const title = p ? `Publish ${p.test.name}?` : "Publish this test?";
  const lead = !p
    ? q.isError
      ? "We couldn't load the summary. You can still publish."
      : "Checking who will be told…"
    : opensNow
      ? "It opens straight away: students can start writing as soon as you publish."
      : `Students see it as upcoming on their Tests page now and can start at ${istDateTime(p.test.opensAt)}. You can still edit it until the first student starts.`;
  const told = p?.notify;
  const facts: Array<[React.ReactNode, React.ReactNode]> = p
    ? [
        ["Test", <span key="t"><b>{p.test.name}</b>{p.test.exam ? ` · ${p.test.exam.name}` : ""}</span>],
        ["Window", `${opensNow ? "Opens now" : istDateTime(p.test.opensAt)}${p.test.closesAt ? ` – ${istDateTime(p.test.closesAt)}` : ""} IST · ${p.test.durationMinutes} min to write`],
        ["Batches", p.batches.length ? p.batches.map((b) => `${b.name}${b.students != null ? ` (${N(b.students)})` : ""}`).join(", ") : "None"],
        [
          "Who is told",
          told?.students != null ? (
            <span key="w">
              <b>{N(told.students)} students</b> are told as soon as you publish
              <br />
              <span className="xs muted">
                {told.emailed != null ? `${N(told.emailed)} by email and in the app` : "In the app"}
                {told.emailOff ? `; ${N(told.emailOff)} turned “Test published” emails off and get the in-app note only` : ""}
                {told.removed ? `; ${N(told.removed)} removed students get nothing` : ""}.{opensNow ? "" : " A reminder goes 1 hour before it opens."}
              </span>
            </span>
          ) : (
            "—"
          ),
        ],
        ["Questions", `${N(p.test.questions)} questions · ${N(p.test.totalMarks)} marks`],
        ["Exam screen", `${p.template.name}${p.template.calculator ? " · calculator on" : " · calculator off"}${p.template.roughSheet ? " · rough sheet" : ""}`],
      ]
    : [];
  const blocked = !!p && !p.canPublish;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      tone="navy"
      title={title}
      description={lead}
      facts={facts}
      confirmLabel={blocked ? "Fix the checks first" : opensNow ? "Publish and open now" : `Publish for ${p ? istDateTime(p.test.opensAt) : "its date"}`}
      onConfirm={async () => {
        if (blocked) throw new Error("This test isn't ready: fix the checks marked ! in the builder.");
        await onConfirm();
      }}
    >
      {p && p.blocking.length > 0 && (
        <div className="rounded-[10px] border border-[#F2B1B1] bg-[#FFF0F0] p-3 text-[13px] text-[#7A0000]" role="alert">
          <b>Not ready to publish.</b> {p.blocking.map((c) => BLOCK[c.code] ?? c.code).join(" ")}
          {fixHref && (
            <>
              {" "}
              <Link href={fixHref}>Fix</Link>
            </>
          )}
        </div>
      )}
      {p && p.warnings.length > 0 && (
        <div className="col gap-1.5 rounded-[10px] border border-[#F3D7A8] bg-[#FFF6E8] p-3 text-[13px] text-[#5C3600]" role="note">
          <b>
            {p.warnings.length} {p.warnings.length === 1 ? "thing" : "things"} to know (they don&apos;t stop publishing)
          </b>
          {p.warnings.map((w) => (
            <div key={w.code} className="row items-start gap-3">
              <span className="grow">{warningText(w)}</span>
              {fixHref && w.code !== "OVERLAP" && w.code !== "TEMPLATE_MISSING" && (
                <Link href={fixHref} className="font-semibold whitespace-nowrap">
                  Fix
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </ConfirmDialog>
  );
}
