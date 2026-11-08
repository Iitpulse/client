"use client";

/*
  IIT-PULSE staff: "Publish N of M to the IIT-PULSE library?" (board Admin-LibraryPublish, states publish-dialog,
  all-blocked, publishing, published). POST /questions/admin/library/publish-check lists each picked question as
  ✓ new / ↑ update / current / ! blocked (with the test and when it frees up); "Publish N to the library" calls
  POST /questions/admin/library/publish. Blocked ones are skipped, not queued. 503 EMBARGO_CHECK_UNAVAILABLE: nothing
  is published.
*/
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KitDialog, notify } from "@/components/kit";
import { apiError } from "@/lib/ai-admin";
import { blockedUntil, blockedWhy, libraryApi, type PublishCheckItem } from "@/lib/m10-library";

const fmt = (n: number) => n.toLocaleString("en-IN");

function Line({ item }: { item: PublishCheckItem }) {
  const b = item.blockedBy[0];
  const look =
    item.status === "blocked"
      ? { ic: "border border-[#F1D29A] bg-[#FFF4E2] text-[#9A5800]", mark: "!", color: "text-[#7A4600]", note: b ? `${blockedWhy(b)} · ${blockedUntil(b)}` : "In an IIT-PULSE test that isn't finished" }
      : item.status === "update"
        ? {
            ic: "border border-[#C3C6EF] bg-[#F1F2FC] text-brand",
            mark: "↑",
            color: "text-brand",
            note: `Updates ${item.libraryId ?? "the library copy"}${item.version ? ` to version ${item.version}` : ""}. Institutes see the new version; their own copies stay as they are.`,
          }
        : item.status === "current"
          ? { ic: "border border-line bg-ground text-muted", mark: "=", color: "text-muted", note: `Already in the library${item.libraryId ? ` as ${item.libraryId}` : ""}${item.version ? ` · v${item.version}` : ""}, unchanged. Skipped.` }
          : { ic: "bg-[#0E7A3D] text-white", mark: "✓", color: "text-[#0B4D27]", note: `New in the library${item.chapter ? `, chapter "${item.chapter}"` : ""}` };
  return (
    <div className={`grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 border-t border-line-2 px-3 py-2.5 text-[13px] first:border-t-0 ${item.status === "blocked" ? "bg-[#FFFBF3]" : ""}`}>
      <i className={`mt-px inline-flex size-[18px] items-center justify-center rounded-full text-[11px] font-semibold not-italic ${look.ic}`} aria-hidden>
        {look.mark}
      </i>
      <span className="col min-w-0 gap-px">
        <span className="truncate">
          <span className="mono">{item.questionId}</span>
          {item.chapter ? ` · ${item.chapter}` : ""}
        </span>
        <span className={`xs ${look.color}`}>{item.status === "blocked" && <span className="sr-only">Blocked: </span>}{look.note}</span>
      </span>
    </div>
  );
}

export function LibraryPublishDialog({
  ids,
  open,
  onClose,
  label,
  institutes,
  onPublished,
}: {
  ids: string[];
  open: boolean;
  onClose: () => void;
  label: string;
  /** from status (the check answer wins when it has them) */
  institutes?: Array<{ id: string; displayName: string }>;
  onPublished: () => void;
}) {
  const qc = useQueryClient();
  const idsKey = [...ids].sort().join(",");
  const check = useQuery({
    queryKey: ["questions", "library", "publish-dialog", idsKey],
    enabled: open && ids.length > 0 && ids.length <= 200,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: () => libraryApi.publishCheck(ids),
  });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setErr(null);
  }

  const items = check.data?.items ?? [];
  const ok = items.filter((i) => i.status === "new" || i.status === "update");
  const blocked = items.filter((i) => i.status === "blocked");
  const inst = check.data?.institutes ?? institutes ?? [];
  const lib = label === "Library" ? "the library" : `the ${label}`;

  const title = !check.data
    ? `Publish ${fmt(ids.length)} to ${lib}?`
    : ok.length
      ? ok.length === items.length
        ? `Publish ${fmt(ok.length)} to ${lib}?`
        : `Publish ${fmt(ok.length)} of ${fmt(items.length)} to ${lib}?`
      : blocked.length
        ? "None of these can be published yet"
        : "Nothing new to publish";
  const lead = !check.data
    ? "Checking which ones can go to the library…"
    : ok.length
      ? blocked.length
        ? `${fmt(blocked.length)} ${blocked.length === 1 ? "is" : "are"} blocked because ${blocked.length === 1 ? "it's" : "they're"} in an IIT-PULSE test that is live, upcoming or not yet published. ${blocked.length === 1 ? "It's" : "They're"} skipped.`
        : "Each one goes to the library with a new ID and a version."
      : blocked.length
        ? "Each one is in an IIT-PULSE test that is live, upcoming or not yet published. Other institutes must not see answers before your own students have finished."
        : "These are already in the library as they are now. Edit one and publish again to update it.";

  const publish = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await libraryApi.publish(ok.map((i) => i.questionId));
      qc.invalidateQueries({ queryKey: ["questions"] });
      const p = r.published.length;
      const b = r.blocked.length + blocked.length;
      notify.success(
        `${fmt(p)} ${p === 1 ? "question" : "questions"} published to the library.${b ? ` ${fmt(b)} ${b === 1 ? "was" : "were"} blocked and ${b === 1 ? "stays" : "stay"} as ${b === 1 ? "it is" : "they are"}.` : ""}`,
        { action: { label: "Audit log", href: "/audit-logs" } }
      );
      onPublished();
    } catch (e) {
      const a = apiError(e);
      setErr(
        a.code === "EMBARGO_CHECK_UNAVAILABLE"
          ? "We couldn't check IIT-PULSE tests just now, so nothing was published. Try again in a minute."
          : a.code === "LIBRARY_OWNER_ONLY"
            ? "Only IIT-PULSE staff can publish to the library."
            : a.message
      );
      // the embargo may have changed since the check
      check.refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <KitDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width="wide"
      busy={busy}
      title={title}
      description={lead}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={publish} disabled={busy || !ok.length} aria-busy={busy}>
            {busy && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
              </svg>
            )}
            {busy ? "Publishing…" : ok.length ? `Publish ${fmt(ok.length)} to the library` : "Nothing to publish"}
          </button>
        </>
      }
    >
      {check.isLoading && (
        <div className="col gap-2" aria-busy>
          <span className="skel h-10 w-full" />
          <span className="skel h-10 w-full" />
          <span className="skel h-10 w-full" />
        </div>
      )}
      {check.isError && (
        <p className="sm m-0 text-danger" role="alert">
          {apiError(check.error).code === "EMBARGO_CHECK_UNAVAILABLE"
            ? "We couldn't check IIT-PULSE tests just now, so we can't tell which questions are safe to publish."
            : `Couldn't check these questions. ${apiError(check.error).message}`}{" "}
          <button type="button" className="underline" onClick={() => check.refetch()}>
            Try again
          </button>
        </p>
      )}
      {items.length > 0 && (
        <div className="col max-h-[280px] overflow-y-auto rounded-[12px] border border-line-2">
          {items.map((i) => (
            <Line key={i.questionId} item={i} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3.5 gap-y-[9px] border-y border-line-2 py-3 text-[13px]">
        <span className="muted">What it does</span>
        <span>Copies each question into the library with a new ID and a version. Your bank keeps its own copy; edits here reach the library only when you publish again.</span>
        <span className="muted">Who sees it</span>
        <span>
          {inst.length
            ? `${fmt(inst.length)} ${inst.length === 1 ? "institute" : "institutes"} with the Question library: ${inst.map((x) => x.displayName).join(", ")}.`
            : "Institutes with the Question library (none yet)."}{" "}
          They can add it to tests or copy it, never edit the library copy.
        </span>
        <span className="muted">Blocked ones</span>
        <span>Skipped, not queued. Publish them after that test&apos;s results are out; each row says when.</span>
        <span className="muted">Audit</span>
        <span>Each question gets an audit entry with your name.</span>
      </div>
      {err && (
        <p className="sm m-0 text-danger" role="alert">
          {err}
        </p>
      )}
    </KitDialog>
  );
}
