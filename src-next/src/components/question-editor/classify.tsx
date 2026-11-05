"use client";
/*
  "Where it belongs" (board): Subject (combobox), Difficulty (segmented), Chapters (multi-select, creatable "Create
  chapter "rot…" in Physics", counts "12 Qs"), Topics (optional; only topics of the picked chapters; "New topic"
  dialog), Sources (optional, creatable), "Proofread by a second teacher". No class label on chapters (owner).
*/
import * as React from "react";
import { Combobox, type ComboOption } from "@/components/kit/Combobox";
import { MultiSelect } from "@/components/kit/MultiSelect";
import { Segmented } from "@/components/kit/Segmented";
import { KitDialog } from "@/components/kit/Overlay";
import type { ISubject } from "@/types";
import type { Form } from "./form";
import { useEditor } from "./context";
import { FieldErr } from "./ui";

type Level = "easy" | "medium" | "hard";
const chId = (c: { _id?: string; id?: string; name: string }) => c.id || c._id || c.name;

export function Classification({
  form,
  set,
  subjects,
  sources,
  counts,
  errors,
  onCreateChapter,
  onCreateTopic,
  onCreateSource,
}: {
  form: Form;
  set: (p: Partial<Form>) => void;
  subjects: ISubject[];
  sources: string[];
  /** chapter id → questions (taxonomy), when known */
  counts: Record<string, number>;
  errors: Record<string, string>;
  onCreateChapter: (subjectId: string, name: string) => Promise<void>;
  onCreateTopic: (subjectId: string, chapterId: string, name: string) => Promise<void>;
  onCreateSource: (name: string) => Promise<void>;
}) {
  const { ro } = useEditor();
  const subject = subjects.find((s) => s.name.toLowerCase() === form.subject.toLowerCase()) ?? null;
  const [topicDlg, setTopicDlg] = React.useState<{ name: string; chapter: string | null } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [dlgErr, setDlgErr] = React.useState<string | null>(null);

  const subjectOptions: ComboOption[] = subjects.map((s) => ({ value: s.name, label: s.name }));
  const chapterOptions: ComboOption[] = React.useMemo(() => {
    const list = (subject?.chapters ?? []).filter((c) => c.name).map((c) => {
      const n = counts[chId(c)];
      return { value: c.name, label: c.name, group: subject?.name, end: n ? `${n.toLocaleString("en-IN")} Qs` : undefined };
    });
    for (const name of form.chapters) if (!list.some((o) => o.value === name)) list.push({ value: name, label: name, group: subject?.name, end: undefined });
    return list;
  }, [subject, counts, form.chapters]);
  const pickedChapters = (subject?.chapters ?? []).filter((c) => form.chapters.includes(c.name));
  const topicOptions: ComboOption[] = React.useMemo(() => {
    const t = new Set<string>();
    for (const c of pickedChapters) for (const x of c.topics ?? []) t.add(x);
    for (const x of form.topics) t.add(x);
    return [...t].map((x) => ({ value: x, label: x }));
  }, [pickedChapters, form.topics]);
  const sourceOptions: ComboOption[] = React.useMemo(() => [...new Set([...sources, ...form.sources])].map((x) => ({ value: x, label: x })), [sources, form.sources]);

  const openTopic = (name = "") => {
    setDlgErr(null);
    setTopicDlg({ name, chapter: pickedChapters[0]?.name ?? null });
  };
  const dlgChapter = pickedChapters.find((c) => c.name === topicDlg?.chapter) ?? null;

  return (
    <section className={`card pad-lg col gap-3.5 ${ro ? "qe-lock" : ""}`} id="f-class">
      <div className="row between wrap gap-2">
        <span className="h3">Where it belongs</span>
        <span className="xs muted">Teachers find and pick questions by these</span>
      </div>
      <div className="grid gap-x-4 gap-y-3.5" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className="field" id="f-sub" tabIndex={-1}>
          <label className="label" htmlFor="c-sub">
            Subject
          </label>
          <Combobox
            id="c-sub"
            value={form.subject || null}
            onChange={(v) => set({ subject: v ?? "", ...(v !== form.subject ? { chapters: [], topics: [] } : {}) })}
            options={subjectOptions}
            placeholder="Pick a subject"
            noun="subject"
            invalid={!!errors["f-sub"]}
            disabled={ro}
          />
          {errors["f-sub"] && <FieldErr>{errors["f-sub"]}</FieldErr>}
        </div>
        <div className="field" id="f-dl" tabIndex={-1}>
          <span id="c-dl" className="label">
            Difficulty
          </span>
          <Segmented<Level>
            ariaLabelledBy="c-dl"
            value={form.difficulty || null}
            onChange={(v) => set({ difficulty: v })}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
            className="self-start"
          />
          {errors["f-dl"] && <FieldErr>{errors["f-dl"]}</FieldErr>}
        </div>

        <div className="field" id="f-ch" tabIndex={-1}>
          <label className="label" htmlFor="c-ch">
            Chapters
          </label>
          <MultiSelect
            id="c-ch"
            value={form.chapters}
            onChange={(v) => {
              const keep = new Set((subject?.chapters ?? []).filter((c) => v.includes(c.name)).flatMap((c) => c.topics ?? []));
              set({ chapters: v, topics: form.topics.filter((t) => keep.has(t)) });
            }}
            options={chapterOptions}
            placeholder={subject ? "Pick chapters" : "Pick a subject first"}
            disabled={ro || !subject}
            invalid={!!errors["f-ch"]}
            noun="chapter"
            creatable={subject ? { label: (q) => `Create chapter "${q}" in ${subject.name}`, onCreate: (q) => void onCreateChapter(subject._id, q) } : undefined}
            aria-label="Chapters"
          />
          {errors["f-ch"] ? <FieldErr>{errors["f-ch"]}</FieldErr> : <span className="hint">A question can sit in more than one chapter.</span>}
        </div>
        <div className="field">
          <label className="label" htmlFor="c-tp">
            Topics <span className="muted font-normal">(optional)</span>
          </label>
          <MultiSelect
            id="c-tp"
            value={form.topics}
            onChange={(v) => set({ topics: v })}
            options={topicOptions}
            placeholder={form.chapters.length ? "Pick topics" : "Pick a chapter first"}
            disabled={ro || !form.chapters.length}
            noun="topic"
            creatable={pickedChapters.length ? { label: (q) => `New topic "${q}"`, onCreate: (q) => openTopic(q) } : undefined}
            aria-label="Topics"
          />
          <span className="hint">
            Only topics of the picked chapters.{" "}
            {pickedChapters.length > 0 && !ro && (
              <button type="button" className="qe-linkbtn" onClick={() => openTopic()}>
                New topic
              </button>
            )}
          </span>
        </div>
        <div className="field">
          <label className="label" htmlFor="c-src">
            Sources <span className="muted font-normal">(optional)</span>
          </label>
          <MultiSelect
            id="c-src"
            value={form.sources}
            onChange={(v) => set({ sources: v })}
            options={sourceOptions}
            placeholder="Book, paper or your own set"
            disabled={ro}
            noun="source"
            creatable={{ label: (q) => `Add source "${q}"`, onCreate: (q) => void onCreateSource(q) }}
            aria-label="Sources"
          />
        </div>
        <div className="field justify-end">
          <label className="row gap-2.5 text-[13px]" style={{ minHeight: 36 }}>
            <input type="checkbox" className="qe-radio" style={{ accentColor: "var(--navy)" }} checked={form.isProofRead} onChange={(e) => set({ isProofRead: e.target.checked })} disabled={ro} />
            Proofread by a second teacher
          </label>
        </div>
      </div>

      <KitDialog
        open={!!topicDlg}
        onOpenChange={(o) => !o && setTopicDlg(null)}
        title="New topic"
        description="Every teacher sees it in the topic list at once."
        closeButton
        busy={busy}
        initialFocus="tp-n"
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTopicDlg(null)} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || !topicDlg?.name.trim() || !dlgChapter || !subject}
              onClick={async () => {
                if (!topicDlg || !dlgChapter || !subject) return;
                const name = topicDlg.name.trim();
                if ((dlgChapter.topics ?? []).some((t) => t.toLowerCase() === name.toLowerCase())) {
                  setDlgErr(`${dlgChapter.name} already has "${name}"`);
                  return;
                }
                setBusy(true);
                try {
                  await onCreateTopic(subject._id, chId(dlgChapter), name);
                  set({ topics: [...form.topics.filter((t) => t !== name), name] });
                  setTopicDlg(null);
                } catch (e) {
                  setDlgErr((e as Error)?.message || "Couldn't create the topic. Try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Creating…" : "Create topic"}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="label" htmlFor="tp-n">
            Name
          </label>
          <input
            id="tp-n"
            className={`k-input ${dlgErr ? "e" : ""}`}
            value={topicDlg?.name ?? ""}
            onChange={(e) => {
              setDlgErr(null);
              setTopicDlg((d) => (d ? { ...d, name: e.target.value } : d));
            }}
          />
          {dlgErr && <FieldErr>{dlgErr}</FieldErr>}
        </div>
        <div className="field">
          <label className="label" htmlFor="tp-c">
            Chapter
          </label>
          <Combobox
            id="tp-c"
            value={topicDlg?.chapter ?? null}
            onChange={(v) => setTopicDlg((d) => (d ? { ...d, chapter: v } : d))}
            options={pickedChapters.map((c) => ({ value: c.name, label: c.name }))}
            noun="chapter"
          />
          {dlgChapter && subject && (
            <span className="hint">
              {subject.name}. {(dlgChapter.topics ?? []).length === 1 ? "1 topic" : `${(dlgChapter.topics ?? []).length} topics`} already.
            </span>
          )}
        </div>
      </KitDialog>
    </section>
  );
}
