"use client";
/*
  Admin-Templates board, view=edit (and "+ New template"): Basics, Wording (EN / हिन्दी, ≤ 32 characters, Reset to
  NTA), Instructions page (heading, general instructions with placeholders, the other blocks, declaration), Exam
  tools (calculator Off / Basic / Scientific, off by default; mark for review, view question paper, view
  instructions, language switch, rough sheet) and the live preview of the frozen NTA screens.
*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import "@/components/m6/m6-patterns.css";
import { Topbar } from "@/components/admin/Topbar";
import { Checkbox, Combobox, ErrorSummary, Field, NoAccess, notify, PageError, PageSkeleton, Segmented, TextInput } from "@/components/kit";
import { errorCode, isForbidden, SamplePill } from "@/components/m6/parts";
import { NtaExamScreen, NtaInstructions } from "@/components/m6/templates/NtaPreview";
import { apiError, fieldErrors } from "@/lib/m6/client";
import { SAMPLE_FACTS } from "@/lib/m6/fixtures/templates";
import { cloneContent, NTA_LABELS, NTA_STANDARD, NTA_STANDARD_NAME, PLACEHOLDERS, type TemplateContent, WORDING_KEYS, WORDING_MAX } from "@/lib/m6/nta-standard";
import { examRefs, useM6Exams } from "@/lib/m6/shared";
import { templatesApi, useInvalidateTemplates, useTemplate, useTemplatePreview } from "@/lib/m6/templates";
import type { ExamTemplate, ExamTools, Lang } from "@/lib/m6-contract";

interface Draft extends TemplateContent {
  name: string;
  examId: string;
}
const toDraft = (t: ExamTemplate): Draft => ({ name: t.name, examId: t.exam.id, ...cloneContent({ wording: t.wording, instructions: t.instructions, tools: t.tools }) });
const NEW: Draft = { name: "", examId: "", ...cloneContent(NTA_STANDARD) };

/** Lines → "1. …" text and back (numbers are the page's own). */
const linesToText = (l: string[]) => l.map((x, i) => `${i + 1}. ${x}`).join("\n");
const textToLines = (t: string) =>
  t
    .split("\n")
    .map((x) => x.replace(/^\s*\d+[.)]\s?/, ""))
    .filter((x, i, a) => x.trim() || i < a.length - 1);

const TOOL_ROWS: Array<{ key: Exclude<keyof ExamTools, "calculator">; label: string }> = [
  { key: "markForReview", label: "Mark for review buttons" },
  { key: "viewQuestionPaper", label: "View question paper" },
  { key: "viewInstructions", label: "View instructions during the test" },
  { key: "languageSwitch", label: "Students can switch English / हिन्दी" },
  { key: "roughSheet", label: "Rough sheet (on-screen notepad)" },
];

export function TemplateEditor({ templateId }: { templateId?: string }) {
  const isNew = !templateId;
  const router = useRouter();
  const one = useTemplate(templateId);
  const exams = useM6Exams();
  const invalidate = useInvalidateTemplates();
  const preview = useTemplatePreview(templateId, "en");
  const [draft, setDraft] = useState<Draft | null>(isNew ? structuredClone(NEW) : null);
  const [orig, setOrig] = useState(isNew ? JSON.stringify(NEW) : "");
  const [lang, setLang] = useState<Lang>("en");
  const [pv, setPv] = useState<"ins" | "exam">("ins");
  const [more, setMore] = useState(false);
  const [tried, setTried] = useState(false);
  const [server, setServer] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const generalRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (one.data) {
      const d = toDraft(one.data);
      setDraft(d);
      setOrig(JSON.stringify(d));
    }
  }, [one.data]);
  const dirty = !!draft && JSON.stringify(draft) !== orig;
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const examOptions = useMemo(() => examRefs(exams.data).map((e) => ({ value: e.id, label: e.name })), [exams.data]);
  const facts = preview.data?.test ?? SAMPLE_FACTS;

  const client = useMemo(() => {
    const e: Record<string, string> = {};
    if (!draft) return e;
    if (!draft.name.trim()) e.name = "Give the template a name";
    if (isNew && !draft.examId) e.examId = "Pick the exam";
    for (const l of ["en", "hi"] as Lang[])
      for (const k of WORDING_KEYS) {
        const v = draft.wording[l][k];
        if (!v.trim()) e[`wording.${l}.${k}`] = "Write a label";
        else if (v.trim().length > WORDING_MAX) e[`wording.${l}.${k}`] = `At most ${WORDING_MAX} characters`;
      }
    for (const l of ["en", "hi"] as Lang[]) if (!draft.instructions[l].declaration.trim()) e[`instructions.${l}.declaration`] = "Write the declaration students tick";
    return e;
  }, [draft, isNew]);
  const errors = useMemo(() => {
    const live: Record<string, string> = {};
    for (const [k, v] of Object.entries(client)) if (tried || k.startsWith("wording.")) live[k] = v;
    return { ...live, ...server };
  }, [client, server, tried]);

  if (!isNew && one.isError)
    return (
      <>
        <Topbar title="Template" back={{ href: "/templates", label: "Templates" }} />
        <main className="col" style={{ padding: "22px 28px 40px" }}>
          {isForbidden(one.error) ? (
            <NoAccess what="exam templates" />
          ) : (
            <PageError what="this template" body="Tests keep working with their templates. Try again in a moment." code={errorCode("TPL", one.error)} onRetry={() => one.refetch()} />
          )}
        </main>
      </>
    );
  if (!draft)
    return (
      <>
        <Topbar title="Template" back={{ href: "/templates", label: "Templates" }} />
        <main className="col" style={{ padding: "22px 28px 40px" }}>
          <PageSkeleton rows={8} onRetry={() => one.refetch()} />
        </main>
      </>
    );

  const set = (fn: (d: Draft) => void) =>
    setDraft((d) => {
      const n = structuredClone(d!);
      fn(n);
      return n;
    });
  const ins = draft.instructions[lang];
  const general = ins.blocks.find((b) => b.id === "general") ?? ins.blocks[0];
  const others = ins.blocks.filter((b) => b !== general);
  const hiCls = lang === "hi" ? "m6-hi" : "";
  const t = one.data;

  const insert = (ph: string) => {
    const el = generalRef.current;
    const text = linesToText(general?.lines ?? []);
    const at = el ? el.selectionStart : text.length;
    const next = text.slice(0, at) + ph + text.slice(el ? el.selectionEnd : text.length);
    set((d) => {
      const b = d.instructions[lang].blocks.find((x) => x.id === general?.id);
      if (b) b.lines = textToLines(next);
    });
    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(at + ph.length, at + ph.length);
      }
    });
  };

  const save = async () => {
    setTried(true);
    setServer({});
    if (Object.keys(client).length) return;
    setBusy(true);
    const content = { wording: draft.wording, instructions: draft.instructions, tools: draft.tools };
    try {
      if (isNew) {
        const r = await templatesApi.create({ name: draft.name.trim(), examId: draft.examId, ...content });
        await invalidate();
        setOrig(JSON.stringify(draft));
        notify.success("Template saved", { description: `${r.template.name} · ${r.template.exam.name}` });
        router.replace(`/templates/${r.template.id}`);
      } else {
        const r = await templatesApi.update(templateId!, { name: draft.name.trim(), ...content });
        await invalidate();
        const d = toDraft(r.template);
        setDraft(d);
        setOrig(JSON.stringify(d));
        setTried(false);
        notify.success("Template saved", { description: "Tests that haven't opened use the new wording." });
      }
    } catch (e) {
      const f = fieldErrors(e);
      const err = apiError(e);
      if (err.code === "NAME_TAKEN") f.name = "A template of this exam already has that name";
      if (Object.keys(f).length) setServer(f);
      else notify.error("Couldn't save the template", { description: err.message, retry: save });
    } finally {
      setBusy(false);
    }
  };

  const summary = Object.entries(errors).map(([k, msg]) => ({ id: anchor(k), label: `${where(k)}: ${msg.charAt(0).toLowerCase()}${msg.slice(1)}` }));
  const examName = t?.exam.name ?? examOptions.find((o) => o.value === draft.examId)?.label ?? "";

  return (
    <>
      <Topbar
        title={isNew ? draft.name || "New template" : t?.name ?? draft.name}
        back={{ href: "/templates", label: "Templates" }}
        badge={
          <>
            {dirty && <span className="badge b-amber">Unsaved</span>}
            <SamplePill areas={["templates"]} />
          </>
        }
        actions={
          <>
            {!isNew && (
              <Link href={`/templates/${templateId}/preview`} className="btn btn-secondary btn-sm">
                Full preview
              </Link>
            )}
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save template"}
            </button>
          </>
        }
      />
      <main className="m6-tg">
        <div className="col" style={{ gap: 14, minWidth: 0 }}>
          {tried && summary.length > 0 && <ErrorSummary fields={summary} title={`${summary.length} thing${summary.length === 1 ? "" : "s"} to fix before saving`} />}
          <section className="card pad-lg col" style={{ gap: 12 }}>
            <span className="h3">Basics</span>
            <div className="m6-g2t" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <Field label="Name" htmlFor="tn" error={errors.name}>
                <TextInput
                  id="tn"
                  value={draft.name}
                  invalid={!!errors.name}
                  placeholder={`e.g. ${NTA_STANDARD_NAME} · with calculator`}
                  onChange={(e) => {
                    const v = e.target.value;
                    set((d) => void (d.name = v));
                    setServer((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== "name")));
                  }}
                />
              </Field>
              <Field label="Exam" htmlFor="tx" error={errors.examId} hint={!isNew ? "A template stays with its exam." : undefined}>
                <Combobox
                  id="tx"
                  value={draft.examId || null}
                  options={examOptions}
                  valueLabel={t?.exam.name}
                  placeholder="Pick the exam"
                  noun="exam"
                  disabled={!isNew}
                  invalid={!!errors.examId}
                  loading={exams.isLoading}
                  onChange={(v) => set((d) => void (d.examId = v ?? ""))}
                />
              </Field>
            </div>
            <span className="xs muted">
              {t?.isDefault ? `Default for ${examName} · ` : ""}
              {t ? `used by ${t.usedBy} test${t.usedBy === 1 ? "" : "s"}. ` : ""}
              Changes apply to tests that haven&apos;t opened yet; tests already open keep the wording they started with.
            </span>
          </section>

          <section className="card pad-lg col" style={{ gap: 12 }}>
            <div className="row between wrap" style={{ gap: 8 }}>
              <span className="h3">Wording</span>
              <Segmented<Lang>
                size="sm"
                ariaLabel="Language"
                value={lang}
                onChange={setLang}
                options={[
                  { value: "en", label: "English" },
                  { value: "hi", label: <span className="m6-hi">हिन्दी</span> },
                ]}
              />
            </div>
            <div className="m6-wt">
              <span className="h">On the NTA screen</span>
              <span className="h">Students see</span>
              <span />
              {WORDING_KEYS.map((k) => {
                const v = draft.wording[lang][k];
                const std = NTA_STANDARD.wording[lang][k];
                const err = errors[`wording.${lang}.${k}`];
                return (
                  <div key={k} style={{ display: "contents" }}>
                    <label className="muted" htmlFor={`w-${lang}-${k}`}>
                      {NTA_LABELS[k]}
                    </label>
                    <div className="col" style={{ gap: 2 }}>
                      <TextInput
                        id={`w-${lang}-${k}`}
                        className={hiCls}
                        value={v}
                        invalid={!!err}
                        maxLength={WORDING_MAX + 8}
                        aria-label={`Wording for ${NTA_LABELS[k]}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          set((d) => void (d.wording[lang][k] = val));
                        }}
                      />
                      {err && <span className="m6-err-t">{err}</span>}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "0 6px", visibility: v === std ? "hidden" : "visible" }} onClick={() => set((d) => void (d.wording[lang][k] = std))}>
                      Reset
                    </button>
                  </div>
                );
              })}
            </div>
            <span className="xs muted">Keep labels short: buttons don&apos;t grow on the exam screen. {WORDING_MAX} characters at most.</span>
          </section>

          <section className="card pad-lg col" style={{ gap: 12 }}>
            <div className="row between wrap" style={{ gap: 8 }}>
              <span className="h3">Instructions page</span>
              <span className={`xs muted ${hiCls}`}>{lang === "hi" ? "हिन्दी" : "English"}</span>
            </div>
            <Field label="Heading" htmlFor="it">
              <TextInput id="it" className={hiCls} value={ins.heading} onChange={(e) => set((d) => void (d.instructions[lang].heading = e.target.value))} />
            </Field>
            {general && (
              <div className="field">
                <label className="label" htmlFor="ig">
                  {lang === "en" ? "General instructions" : general.title}
                </label>
                <textarea
                  id="ig"
                  ref={generalRef}
                  className={`m6-ta ${hiCls}`}
                  value={linesToText(general.lines)}
                  rows={Math.max(5, general.lines.length + 1)}
                  onChange={(e) => {
                    const v = e.target.value;
                    set((d) => {
                      const b = d.instructions[lang].blocks.find((x) => x.id === general.id);
                      if (b) b.lines = textToLines(v);
                    });
                  }}
                />
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="xs muted">Insert:</span>
                  {PLACEHOLDERS.map((p) => (
                    <button key={p} type="button" className="m6-chipv" onClick={() => insert(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="row between">
              <span className={`sm ${hiCls}`} style={{ fontWeight: 600 }}>
                {others.map((b) => b.title.replace(/:$/, "")).join(" · ")}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" aria-expanded={more} onClick={() => setMore((m) => !m)}>
                {more ? "Hide" : `Edit ${others.length} more block${others.length === 1 ? "" : "s"}`}
              </button>
            </div>
            {more &&
              others.map((b) => (
                <div key={b.id} className="col" style={{ gap: 6 }}>
                  <TextInput
                    className={hiCls}
                    aria-label="Block title"
                    value={b.title}
                    style={{ fontWeight: 600 }}
                    onChange={(e) => {
                      const v = e.target.value;
                      set((d) => {
                        const x = d.instructions[lang].blocks.find((y) => y.id === b.id);
                        if (x) x.title = v;
                      });
                    }}
                  />
                  <textarea
                    className={`m6-ta ${hiCls}`}
                    aria-label={`${b.title} lines`}
                    value={linesToText(b.lines)}
                    rows={Math.max(3, b.lines.length + 1)}
                    onChange={(e) => {
                      const v = e.target.value;
                      set((d) => {
                        const x = d.instructions[lang].blocks.find((y) => y.id === b.id);
                        if (x) x.lines = textToLines(v);
                      });
                    }}
                  />
                </div>
              ))}
            <Field label="Declaration students tick" htmlFor="id" error={errors[`instructions.${lang}.declaration`]}>
              <TextInput
                id="id"
                className={hiCls}
                value={ins.declaration}
                invalid={!!errors[`instructions.${lang}.declaration`]}
                onChange={(e) => set((d) => void (d.instructions[lang].declaration = e.target.value))}
              />
            </Field>
          </section>

          <section className="card pad-lg col" style={{ gap: 10 }}>
            <span className="h3">Exam tools</span>
            <div className="row between wrap" style={{ gap: 8, minHeight: 36 }}>
              <span className="col">
                <span className="sm" style={{ fontWeight: 600 }}>
                  On-screen calculator
                </span>
                <span className="xs muted">NTA&apos;s virtual calculator</span>
              </span>
              <Segmented<ExamTools["calculator"]>
                size="sm"
                ariaLabel="On-screen calculator"
                value={draft.tools.calculator}
                onChange={(v) => set((d) => void (d.tools.calculator = v))}
                options={[
                  { value: "off", label: "Off" },
                  { value: "basic", label: "Basic" },
                  { value: "scientific", label: "Scientific" },
                ]}
              />
            </div>
            {TOOL_ROWS.map((r) => (
              <Checkbox key={r.key} checked={draft.tools[r.key]} onChange={(on) => set((d) => void (d.tools[r.key] = on))}>
                <span className="sm">{r.label}</span>
              </Checkbox>
            ))}
            <span className="xs muted">Colours, fonts and layout follow NTA and can&apos;t be changed.</span>
          </section>
        </div>

        <aside className="col" style={{ gap: 10, minWidth: 0 }}>
          <div className="row between">
            <span className="eyebrow">Live preview</span>
            <Segmented<"ins" | "exam">
              size="sm"
              ariaLabel="Preview"
              value={pv}
              onChange={setPv}
              options={[
                { value: "ins", label: "Instructions" },
                { value: "exam", label: "Exam screen" },
              ]}
            />
          </div>
          <div className="m6-frame">
            {pv === "ins" ? (
              <NtaInstructions doc={ins} lang={lang} facts={facts} />
            ) : (
              <NtaExamScreen wording={draft.wording[lang]} tools={draft.tools} lang={lang} />
            )}
          </div>
          <span className="xs muted">Highlighted text comes from this template. Everything else is the frozen NTA screen.</span>
        </aside>
      </main>
    </>
  );
}

function anchor(k: string) {
  if (k === "name") return "tn";
  if (k === "examId") return "tx";
  const w = /^wording\.(en|hi)\.(\w+)$/.exec(k);
  if (w) return `w-${w[1]}-${w[2]}`;
  if (k.endsWith("declaration")) return "id";
  return "tn";
}
function where(k: string) {
  if (k === "name") return "Name";
  if (k === "examId") return "Exam";
  const w = /^wording\.(en|hi)\.(\w+)$/.exec(k);
  if (w) return `${w[1] === "hi" ? "हिन्दी" : "English"} · ${NTA_LABELS[w[2] as keyof typeof NTA_LABELS] ?? w[2]}`;
  if (k.includes("declaration")) return `Declaration (${k.includes(".hi.") ? "हिन्दी" : "English"})`;
  return "Template";
}
