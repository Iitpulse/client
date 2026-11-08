"use client";

/*
  "Copy N questions to your bank?" (board Admin-Library, states copy / copy-unmatched-chapter / copied):
  POST /questions/admin/library/copy-plan maps each library chapter to one of the institute's chapters (by name where
  the server could; a searchable chapter picker for the rest, with "Create chapter …" in the matching subject), the
  licence paragraph, then POST /questions/admin/library/copy. 400 CHAPTER_UNMAPPED marks the rows it names.
*/
import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Combobox, KitDialog, notify, type ComboOption } from "@/components/kit";
import { apiError } from "@/lib/ai-admin";
import { taxonomyApi } from "@/lib/m6/people";
import { libraryApi, type ChapterMapping, type CopyPlan } from "@/lib/m10-library";

const fmt = (n: number) => n.toLocaleString("en-IN");
const keyOf = (c: { librarySubject: string; libraryChapter: string }) => `${c.librarySubject}\u0000${c.libraryChapter}`;

export interface OwnSubject {
  id: string;
  name: string;
  chapters: Array<{ id: string; name: string }>;
}

export function LibraryCopyDialog({
  ids,
  open,
  onClose,
  subjects,
  institute,
  onCopied,
}: {
  ids: string[];
  open: boolean;
  onClose: () => void;
  /** the institute's own taxonomy (the chapter picker) */
  subjects: OwnSubject[];
  institute: string | null;
  onCopied: (copies: Array<{ sourceId: string; id: string }>) => void;
}) {
  const qc = useQueryClient();
  const idsKey = [...ids].sort().join(",");
  const plan = useQuery({
    queryKey: ["questions", "library", "copy-plan", idsKey],
    enabled: open && ids.length > 0 && ids.length <= 100,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: () => libraryApi.copyPlan(ids),
  });
  const [map, setMap] = React.useState<Record<string, string | null>>({});
  const [bad, setBad] = React.useState<Set<string>>(() => new Set());
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [extra, setExtra] = React.useState<OwnSubject[]>([]);

  // a fresh plan seeds the mapping with the server's matches
  const [seeded, setSeeded] = React.useState<CopyPlan | null>(null);
  if (plan.data && plan.data !== seeded) {
    setSeeded(plan.data);
    setMap(Object.fromEntries(plan.data.chapters.map((c) => [keyOf(c), c.match?.chapterId ?? null])));
    setBad(new Set());
    setErr(null);
  }
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setErr(null);
      setBusy(false);
    }
  }

  const allSubjects = React.useMemo(() => {
    const by = new Map<string, OwnSubject>();
    for (const s of [...subjects, ...extra]) {
      const cur = by.get(s.id);
      by.set(s.id, cur ? { ...cur, chapters: [...cur.chapters, ...s.chapters.filter((c) => !cur.chapters.some((x) => x.id === c.id))] } : s);
    }
    return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, extra]);
  const options = React.useMemo<ComboOption[]>(
    () => allSubjects.flatMap((s) => [...s.chapters].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: `${s.name} › ${c.name}`, group: s.name, keywords: [c.name] }))),
    [allSubjects]
  );

  const rows = plan.data?.chapters ?? [];
  const unmapped = rows.filter((c) => !map[keyOf(c)] || bad.has(keyOf(c)));
  const copiedAlready = (plan.data?.questions ?? []).filter((q) => q.copied);
  const n = ids.length;
  const noun = n === 1 ? "question" : "questions";

  const create = async (c: CopyPlan["chapters"][number], name: string) => {
    const subject = allSubjects.find((s) => s.name.trim().toLowerCase() === c.librarySubject.trim().toLowerCase());
    if (!subject) return;
    try {
      const r = await taxonomyApi.createChapter(subject.id, name.trim());
      const body = r.data as { data?: { chapters?: Array<{ id?: string; _id?: string; name: string }> } };
      const made = (body.data?.chapters ?? []).find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase());
      const id = made?.id || made?._id;
      if (!id) throw new Error("The new chapter didn't come back. Pick it from the list.");
      setExtra((x) => [...x, { id: subject.id, name: subject.name, chapters: [{ id, name: made!.name }] }]);
      setMap((m) => ({ ...m, [keyOf(c)]: id }));
      setBad((b) => {
        const nb = new Set(b);
        nb.delete(keyOf(c));
        return nb;
      });
      qc.invalidateQueries({ queryKey: ["questions", "taxonomy"] });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    } catch (e) {
      notify.error(`Couldn't create "${name}"`, { description: apiError(e).message });
    }
  };

  const copy = async () => {
    if (!plan.data || unmapped.length) return;
    setBusy(true);
    setErr(null);
    const chapterMap: ChapterMapping[] = rows.map((c) => ({ librarySubject: c.librarySubject, libraryChapter: c.libraryChapter, chapterId: map[keyOf(c)]! }));
    try {
      const r = await libraryApi.copy(ids, chapterMap);
      qc.invalidateQueries({ queryKey: ["questions"] });
      onCopied(r.copies);
    } catch (e) {
      const a = apiError(e);
      if (a.code === "CHAPTER_UNMAPPED") {
        const named = ((a.details?.chapters as unknown[]) ?? []).map((x) =>
          typeof x === "string" ? x : keyOf(x as { librarySubject: string; libraryChapter: string })
        );
        setBad(new Set(rows.filter((c) => named.includes(keyOf(c)) || named.includes(c.libraryChapter)).map(keyOf)));
        setErr("Some chapters still need one of yours.");
      } else if (a.code === "LIBRARY_NOT_ENTITLED") setErr("Your institute doesn't have the Question library any more, so nothing was copied.");
      else setErr(a.message);
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
      title={`Copy ${fmt(n)} ${noun} to your bank?`}
      description="Each copy gets a new ID in your bank, and you can edit it like your own. The library version stays as it is."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={copy} disabled={busy || !plan.data || unmapped.length > 0} aria-busy={busy}>
            {busy ? "Copying…" : `Copy ${fmt(n)} to my bank`}
          </button>
        </>
      }
    >
      <div className="col gap-2">
        <span className="label">Put them in your chapters</span>
        {plan.isLoading && (
          <div className="col gap-2" aria-busy>
            <span className="skel h-9 w-full" />
            <span className="skel h-9 w-full" />
          </div>
        )}
        {plan.isError && (
          <p className="sm m-0 text-danger" role="alert">
            {apiError(plan.error).code === "LIBRARY_NOT_ENTITLED" ? "Your institute doesn't have the Question library, so these can't be copied." : `Couldn't plan the copy. ${apiError(plan.error).message}`}{" "}
            <button type="button" className="underline" onClick={() => plan.refetch()}>
              Try again
            </button>
          </p>
        )}
        {plan.data && (
          <div className="grid grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 text-[13px]">
            <span className="xs muted">Library chapter</span>
            <span />
            <span className="xs muted">Your chapter</span>
            {rows.map((c) => {
              const k = keyOf(c);
              const isBad = !map[k] || bad.has(k);
              const subject = allSubjects.find((s) => s.name.trim().toLowerCase() === c.librarySubject.trim().toLowerCase());
              return (
                <React.Fragment key={k}>
                  <span className="min-w-0 truncate" title={`${c.librarySubject} › ${c.libraryChapter}`}>
                    {c.libraryChapter} <span className="muted">· {fmt(c.count)}</span>
                  </span>
                  <span aria-hidden>→</span>
                  <Combobox
                    value={map[k] ?? null}
                    onChange={(v) => {
                      setMap((m) => ({ ...m, [k]: v }));
                      setBad((b) => {
                        const nb = new Set(b);
                        nb.delete(k);
                        return nb;
                      });
                    }}
                    options={options}
                    placeholder="Pick a chapter"
                    noun="chapter"
                    invalid={isBad}
                    aria-label={`Your chapter for ${c.libraryChapter}`}
                    creatable={subject ? { label: (q) => `Create chapter "${q}" in ${subject.name}`, onCreate: (q) => void create(c, q) } : undefined}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
        {plan.data &&
          unmapped.map((c) => (
            <span key={keyOf(c)} className="row items-center gap-1.5 text-xs font-semibold text-[#C40000]" role="alert">
              No chapter of yours matches &quot;{c.libraryChapter}&quot;. Pick one, or create it from the list.
            </span>
          ))}
        {plan.data && <span className="hint">Matched by name where we could. Tags and the solution come with the copy.</span>}
        {copiedAlready.length > 0 && (
          <span className="xs muted">
            {copiedAlready.length === 1 ? (
              <>
                <span className="mono">{copiedAlready[0].id}</span> is already in your bank as <span className="mono">{copiedAlready[0].copied}</span>; this makes another copy.
              </>
            ) : (
              `${fmt(copiedAlready.length)} of these are already in your bank; this makes another copy of each.`
            )}
          </span>
        )}
      </div>
      <div className="row items-start gap-2.5 rounded-[10px] bg-[#F5F6FA] px-3 py-2.5 text-[13px] leading-[1.45]" role="note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#575C75" strokeWidth="2" strokeLinecap="round" aria-hidden className="mt-0.5 shrink-0">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </svg>
        <span>
          <b className="font-semibold">Licence, not ownership.</b> Copies stay usable while {institute || "your institute"} has the Question library. If the add-on ends, they leave search and new tests; tests already made keep them. Library questions and their copies can&apos;t be exported in bulk, and test PDFs that use them carry your institute&apos;s name.
        </span>
      </div>
      {err && (
        <p className="sm m-0 text-danger" role="alert">
          {err}
        </p>
      )}
    </KitDialog>
  );
}
