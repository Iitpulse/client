"use client";
/*
  Admin-Setup "Subjects & chapters": the Subject → Chapter → Topic tree in three columns with question counts.
  Create and rename at every level (rename keeps every question linked); delete works only when no question uses it
  (409 TAXONOMY_IN_USE → an inline note) and can be undone for 6 seconds. Search filters chapters and topics.
*/
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageError, RowMenu, SearchBox, apiError, inr, notify, supportCode } from "@/components/kit";
import { taxonomyApi, useTaxonomy } from "@/lib/m6/people";
import type { SetSetup, SetupState } from "./shared";

type Kind = "subjects" | "chapters" | "topics";
const NOUN: Record<Kind, string> = { subjects: "Subject", chapters: "Chapter", topics: "Topic" };
const MOVE: Record<Kind, string> = {
  subjects: "Move its questions to another subject in the question bank first.",
  chapters: "Move them to another chapter in the question bank first.",
  topics: "Move them to another topic in the question bank first.",
};

function InlineAdd({ placeholder, label, onAdd, focusNonce, button = "Add" }: { placeholder: string; label: string; onAdd: (name: string) => Promise<boolean>; focusNonce?: number; button?: string }) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusNonce) ref.current?.focus();
  }, [focusNonce]);
  const go = async () => {
    if (!v.trim()) return;
    setBusy(true);
    if (await onAdd(v.trim())) setV("");
    setBusy(false);
  };
  return (
    <div className="su-node edit" style={{ background: "transparent" }}>
      <input
        ref={ref}
        className="k-input"
        placeholder={placeholder}
        aria-label={label}
        value={v}
        disabled={busy}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void go();
          }
          if (e.key === "Escape") setV("");
        }}
      />
      <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !v.trim()} onClick={() => void go()}>
        {button}
      </button>
    </div>
  );
}

function Rename({ value, label, onSave, onCancel }: { value: string; label: string; onSave: (v: string) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!v.trim() || v.trim() === value) return onCancel();
    setBusy(true);
    await onSave(v.trim());
    setBusy(false);
  };
  return (
    <div className="su-node edit">
      <input
        className="k-input"
        autoFocus
        aria-label={label}
        value={v}
        disabled={busy}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void go();
          }
          if (e.key === "Escape") onCancel();
        }}
      />
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void go()}>
        Save
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export function SubjectsTab({ s, set, createNonce, can }: { s: SetupState; set: SetSetup; createNonce: number; can: (...k: string[]) => boolean }) {
  const tree = useTaxonomy(s.sq);
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["m6", "taxonomy"] });
    void qc.invalidateQueries({ queryKey: ["m6", "subjects"] });
  };
  const [renaming, setRenaming] = useState<{ kind: Kind; id: string } | null>(null);
  const [blocked, setBlocked] = useState<{ kind: Kind; name: string; n: number } | null>(null);
  const data = tree.data;
  const subjects = data?.subjects ?? [];
  const subject = subjects.find((x) => x.id === s.subject) ?? subjects[0] ?? null;
  const chapter = subject?.chapters.find((c) => c.id === s.chapter) ?? subject?.chapters[0] ?? null;
  const topicCount = useMemo(() => subjects.reduce((n, x) => n + x.chapters.reduce((m, c) => m + c.topics.length, 0), 0), [subjects]);
  const canSub = { add: can("CREATE_SUBJECT"), edit: can("UPDATE_SUBJECT"), del: can("DELETE_SUBJECT") };
  const canCh = can("MANAGE_CHAPTER");
  const canTp = can("MANAGE_TOPIC");

  const fail = (what: string) => (e: unknown) => {
    notify.error(`Couldn't ${what}`, { description: apiError(e).message ?? undefined });
  };
  const remove = async (kind: Kind, id: string, name: string) => {
    setBlocked(null);
    try {
      await taxonomyApi.remove(kind, id);
      refresh();
      notify.undo(`${NOUN[kind]} "${name}" deleted`, async () => {
        await taxonomyApi.restore(kind, id);
        refresh();
      });
    } catch (e) {
      const a = apiError(e);
      if (a.code === "TAXONOMY_IN_USE") setBlocked({ kind, name, n: (a.details as { questions?: number } | null)?.questions ?? 0 });
      else fail(`delete the ${NOUN[kind].toLowerCase()}`)(e);
    }
  };
  const rename = async (kind: Kind, run: () => Promise<unknown>, name: string) => {
    try {
      await run();
      refresh();
      setRenaming(null);
      notify.success(`${NOUN[kind]} renamed to "${name}"`);
    } catch (e) {
      fail(`rename the ${NOUN[kind].toLowerCase()}`)(e);
    }
  };
  const add = async (kind: Kind, run: () => Promise<unknown>, name: string) => {
    try {
      await run();
      refresh();
      notify.success(`${NOUN[kind]} "${name}" added`);
      return true;
    } catch (e) {
      const a = apiError(e);
      notify.error(`Couldn't add the ${NOUN[kind].toLowerCase()}`, { description: a.status === 409 ? `"${name}" already exists` : a.message ?? undefined });
      return false;
    }
  };
  const menu = (kind: Kind, id: string, name: string, edit: boolean, del: boolean) =>
    edit || del ? (
      <span onClick={(e) => e.stopPropagation()}>
        <RowMenu
          label={`More for ${name}`}
          items={[...(edit ? [{ label: "Rename", onSelect: () => setRenaming({ kind, id }) }] : []), ...(del ? [{ label: `Delete ${NOUN[kind].toLowerCase()}`, danger: true, onSelect: () => void remove(kind, id, name) }] : [])]}
        />
      </span>
    ) : null;
  const note = (kind: Kind): ReactNode =>
    blocked?.kind === kind ? (
      <div className="su-inl" role="alert">
        <TriangleAlert className="size-4" aria-hidden />
        <span>
          <b>Can&rsquo;t delete {blocked.name}.</b> {blocked.n === 1 ? "1 question uses it." : `${inr(blocked.n)} questions use it.`} {MOVE[kind]}
        </span>
      </div>
    ) : null;

  if (tree.isError && !data) return <PageError what="subjects and chapters" code={supportCode("QST", tree.error)} onRetry={() => void tree.refetch()} />;
  return (
    <>
      <div className="row between wrap" style={{ gap: 10 }}>
        <SearchBox value={s.sq} onChange={(sq) => set({ sq })} placeholder={data ? `Search ${inr(data.totals.chapters)} chapters and ${inr(topicCount)} topics` : "Search chapters and topics"} label="Search chapters and topics" width={320} />
        {data && (
          <span className="sm muted">
            {inr(data.totals.subjects)} subjects · {inr(data.totals.chapters)} chapters · {inr(data.totals.questions)} questions
          </span>
        )}
      </div>
      <div className="su-mill rise" aria-busy={tree.isLoading || undefined}>
        <div className="su-col">
          <div className="su-mh">
            <span className="sm" style={{ fontWeight: 600 }}>
              Subjects
            </span>
            <span className="xs muted">{subjects.length || ""}</span>
          </div>
          {tree.isLoading && [0, 1, 2, 3].map((i) => <span key={i} className="skel" style={{ height: 14, margin: "13px 14px" }} />)}
          {subjects.map((x) =>
            renaming?.kind === "subjects" && renaming.id === x.id ? (
              <Rename key={x.id} value={x.name} label="Rename subject" onCancel={() => setRenaming(null)} onSave={(v) => rename("subjects", () => taxonomyApi.renameSubject(x.id, v), v)} />
            ) : (
              <div key={x.id} role="button" tabIndex={0} className={`su-node ${subject?.id === x.id ? "on" : ""}`} onClick={() => set({ subject: x.id, chapter: "" })} onKeyDown={(e) => e.key === "Enter" && set({ subject: x.id, chapter: "" })}>
                <span className="nm">{x.name}</span>
                <span className="n">{x.chapters.length} ch</span>
                {menu("subjects", x.id, x.name, canSub.edit, canSub.del)}
              </div>
            )
          )}
          {note("subjects")}
          {canSub.add && (
            <InlineAdd focusNonce={createNonce} placeholder="New subject name" label="New subject name" button="Add" onAdd={(name) => add("subjects", () => taxonomyApi.createSubject(name), name)} />
          )}
        </div>
        <div className="su-col">
          <div className="su-mh">
            <span className="sm k-ell" style={{ fontWeight: 600 }}>
              {subject ? `Chapters in ${subject.name}` : "Chapters"}
            </span>
            <span className="xs muted">{subject ? `${subject.chapters.length} · questions` : ""}</span>
          </div>
          {subject && subject.chapters.length === 0 && <span className="su-empty">{s.sq ? `No chapter matches "${s.sq}".` : "No chapters yet."}</span>}
          {subject?.chapters.map((c) =>
            renaming?.kind === "chapters" && renaming.id === c.id ? (
              <Rename key={c.id} value={c.name} label="Rename chapter" onCancel={() => setRenaming(null)} onSave={(v) => rename("chapters", () => taxonomyApi.renameChapter(subject.id, c.id, v), v)} />
            ) : (
              <div key={c.id} role="button" tabIndex={0} className={`su-node ${chapter?.id === c.id ? "on" : ""}`} onClick={() => set({ subject: subject.id, chapter: c.id })} onKeyDown={(e) => e.key === "Enter" && set({ subject: subject.id, chapter: c.id })}>
                <span className="nm" title={c.name}>
                  {c.name}
                </span>
                <span className="n">{inr(c.questions)}</span>
                {menu("chapters", c.id, c.name, canCh, canCh)}
              </div>
            )
          )}
          {note("chapters")}
          {subject && canCh && <InlineAdd placeholder="New chapter name" label="New chapter name" onAdd={(name) => add("chapters", () => taxonomyApi.createChapter(subject.id, name), name)} />}
        </div>
        <div className="su-col">
          <div className="su-mh">
            <span className="sm k-ell" style={{ fontWeight: 600 }}>
              {chapter ? `Topics in ${chapter.name}` : "Topics"}
            </span>
            <span className="xs muted">{chapter ? chapter.topics.length : ""}</span>
          </div>
          {chapter && chapter.topics.length === 0 && <span className="su-empty">No topics yet.</span>}
          {!chapter && subject && <span className="su-empty">Pick a chapter to see its topics.</span>}
          {chapter?.topics.map((t) =>
            renaming?.kind === "topics" && renaming.id === t.id ? (
              <Rename key={t.id} value={t.name} label="Rename topic" onCancel={() => setRenaming(null)} onSave={(v) => rename("topics", () => taxonomyApi.renameTopic(subject!.id, chapter.id, t.name, v), v)} />
            ) : (
              <div key={t.id} className="su-node" style={{ cursor: "default" }}>
                <span className="nm">{t.name}</span>
                <span className="n">{inr(t.questions)}</span>
                {menu("topics", t.id, t.name, canTp, canTp)}
              </div>
            )
          )}
          {note("topics")}
          {chapter && canTp && <InlineAdd placeholder="New topic name" label="New topic name" onAdd={(name) => add("topics", () => taxonomyApi.createTopic(subject!.id, chapter.id, name), name)} />}
        </div>
      </div>
      <span className="xs muted">Rename keeps every question linked. Delete works only when nothing uses it, and you can undo it for 6 seconds.</span>
    </>
  );
}
