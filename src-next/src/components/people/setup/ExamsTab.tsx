"use client";
/*
  Admin-Setup Exams tab: exams with their default exam UI template, patterns and tests. Delete runs at once (soft,
  restorable for 30 days) with Undo; while tests are open or scheduled it is blocked (EXAM_IN_USE) with the date of the
  last close. Edit and New in a drawer.
*/
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  BlockedDialog,
  Combobox,
  DataTable,
  Drawer,
  ErrorSummary,
  Field,
  FilterChip,
  PageError,
  ServerErrorBanner,
  StateBox,
  TextArea,
  TextInput,
  apiError,
  fmtDate,
  inr,
  notify,
  supportCode,
  type Column,
} from "@/components/kit";
import { examsApi, useExamList } from "@/lib/m6/people";
import { useTemplates } from "@/lib/m6/templates";
import type { ExamInUseDetails, ExamListItem } from "@/lib/m6-contract";
import { useQueryClient } from "@tanstack/react-query";
import { fieldErrs, type SetSetup, type SetupState } from "./shared";

function useInvalidateExams() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["m6", "exams"] });
}

export function ExamsTab({ s, set, createNonce, can }: { s: SetupState; set: SetSetup; createNonce: number; can: (...k: string[]) => boolean }) {
  const showAll = s.show === "all";
  const list = useExamList(showAll);
  const invalidate = useInvalidateExams();
  const [form, setForm] = useState<{ exam: ExamListItem | null } | null>(null);
  const [blocked, setBlocked] = useState<{ exam: ExamListItem; d: ExamInUseDetails | null } | null>(null);
  useEffect(() => {
    if (createNonce) setForm({ exam: null });
  }, [createNonce]);
  const rows = list.data ?? [];
  const active = rows.filter((e) => e.status !== "deleted");
  const tests = active.reduce((n, e) => n + e.tests, 0);

  const remove = async (e: ExamListItem) => {
    try {
      await examsApi.remove(e.id);
      invalidate();
      notify.undo(`Exam ${e.shortName} deleted`, async () => {
        await examsApi.restore(e.id);
        invalidate();
      });
    } catch (err) {
      const a = apiError(err);
      if (a.code === "EXAM_IN_USE") setBlocked({ exam: e, d: a.details as ExamInUseDetails | null });
      else notify.error("Couldn't delete the exam", { description: a.message ?? undefined });
    }
  };
  const restore = async (e: ExamListItem) => {
    try {
      await examsApi.restore(e.id);
      invalidate();
      notify.success(`Exam ${e.shortName} restored`);
    } catch (err) {
      notify.error("Couldn't restore the exam", { description: apiError(err).message ?? undefined });
    }
  };

  const columns: Array<Column<ExamListItem>> = [
    { key: "short", header: "Exam", width: 140, render: (e) => <span className="sm k-ell" style={{ fontWeight: 600, display: "block" }}>{e.shortName}</span> },
    { key: "full", header: "Full name", render: (e) => <span className="k-ell" style={{ display: "block" }}>{e.fullName || "—"}</span> },
    {
      key: "tpl",
      header: "Default template",
      width: "20%",
      tablet: "hide",
      render: (e) => (e.defaultTemplate ? <Link href={`/ui-templates?exam=${encodeURIComponent(e.id)}`}>{e.defaultTemplate.name}</Link> : <span className="muted">—</span>),
    },
    { key: "patterns", header: "Patterns", width: 92, align: "num", render: (e) => inr(e.patterns) },
    { key: "tests", header: "Tests", width: 80, align: "num", render: (e) => inr(e.tests) },
    {
      key: "status",
      header: "Status",
      width: 130,
      render: (e) => (e.status === "deleted" ? <span className="badge b-grey">Deleted {e.deletedAt ? fmtDate(e.deletedAt).replace(/ \d{4}$/, "") : ""}</span> : <span className="badge b-green">Active</span>),
    },
    {
      key: "act",
      header: <span className="sr-only">Actions</span>,
      width: 116,
      render: (e) =>
        e.status === "deleted" ? (
          can("UPDATE_EXAM", "CREATE_EXAM") && (!e.restoreUntil || e.restoreUntil > new Date().toISOString()) ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void restore(e)}>
              Restore
            </button>
          ) : null
        ) : (
          <span className="row" style={{ gap: 2 }}>
            {can("UPDATE_EXAM") && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ exam: e })}>
                Edit
              </button>
            )}
            {can("DELETE_EXAM") && (
              <button type="button" className="k-rm" aria-label={`Delete ${e.shortName}`} onClick={() => void remove(e)}>
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </span>
        ),
    },
  ];

  if (list.isError && !list.data) return <PageError what="exams" code={supportCode("EXM", list.error)} onRetry={() => void list.refetch()} />;
  return (
    <>
      <div className="row between wrap" style={{ gap: 10 }}>
        <span className="sm muted">
          {active.length === 1 ? "1 exam" : `${inr(active.length)} exams`} · {tests === 1 ? "1 test" : `${inr(tests)} tests`}. Each exam has a default exam UI template; a test can pick another.
        </span>
        <FilterChip
          label="Show"
          noun="option"
          clearable={false}
          options={[
            { value: "active", label: "active only" },
            { value: "all", label: "active and deleted" },
          ]}
          value={showAll ? "all" : "active"}
          onChange={(v) => set({ show: v ?? "active" })}
        />
      </div>
      <DataTable<ExamListItem>
        ariaLabel="Exams"
        status={list.isLoading ? "loading" : list.isError ? "error" : "ready"}
        rows={rows}
        rowKey={(e) => e.id}
        columns={columns}
        empty={
          <StateBox
            compact
            title="No exams yet"
            body="An exam (JEE Main, NEET…) groups patterns, templates and tests."
            action={
              can("CREATE_EXAM") ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ exam: null })}>
                  + New exam
                </button>
              ) : undefined
            }
          />
        }
        error={{ title: "Couldn't load exams", code: supportCode("EXM", list.error), onRetry: () => void list.refetch() }}
      />
      <span className="xs muted">Deleted exams stay for 30 days and can be restored. Their tests and questions are kept.</span>
      <ExamForm open={!!form} exam={form?.exam ?? null} onClose={() => setForm(null)} onSaved={invalidate} />
      <BlockedDialog
        open={!!blocked}
        onOpenChange={(o) => !o && setBlocked(null)}
        closeLabel="Close"
        title={`Can't delete ${blocked?.exam.shortName ?? "this exam"} yet`}
        description={(() => {
          const n = blocked?.d?.tests.length ?? 0;
          const when = blocked?.d?.lastClosesAt ? ` You can delete it after the last one closes on ${fmtDate(blocked.d.lastClosesAt, true).replace(/ \d{4}$/, "")}.` : "";
          return `${n === 1 ? "1 test is" : `${n || "Some"} tests are`} open or scheduled for it.${when}`;
        })()}
        action={
          blocked ? (
            <Link href={`/tests?exam=${encodeURIComponent(blocked.exam.id)}`} className="btn btn-secondary btn-sm">
              Show the {blocked.d?.tests.length ?? ""} {blocked.d?.tests.length === 1 ? "test" : "tests"}
            </Link>
          ) : undefined
        }
      />
    </>
  );
}

function ExamForm({ open, exam, onClose, onSaved }: { open: boolean; exam: ExamListItem | null; onClose: () => void; onSaved: () => void }) {
  const edit = !!exam;
  const tpls = useTemplates(exam?.id);
  const [short, setShort] = useState("");
  const [full, setFull] = useState("");
  const [desc, setDesc] = useState("");
  const [tpl, setTpl] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [srv, setSrv] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [base, setBase] = useState("");
  useEffect(() => {
    if (!open) return;
    setShort(exam?.shortName ?? "");
    setFull(exam?.fullName ?? "");
    setDesc(exam?.description ?? "");
    setTpl(exam?.defaultTemplate?.id ?? null);
    setBase(JSON.stringify([exam?.shortName ?? "", exam?.fullName ?? "", exam?.description ?? "", exam?.defaultTemplate?.id ?? null]));
    setErrs({});
    setSrv(null);
  }, [open, exam]);
  const dirty = JSON.stringify([short, full, desc, tpl]) !== base;
  const tplOpts = useMemo(
    () => (tpls.data?.items ?? []).filter((t) => !exam || t.exam?.id === exam.id).map((t) => ({ value: t.id, label: t.name, end: t.isDefault ? "Default" : undefined })),
    [tpls.data, exam]
  );
  const save = async () => {
    const e: Record<string, string> = {};
    if (!short.trim()) e.shortName = "Give the exam a short name";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setSrv(null);
    try {
      const body = { shortName: short.trim(), fullName: full.trim() || null, description: desc.trim() || null, ...(edit && tpl ? { defaultTemplateId: tpl } : {}) };
      if (edit) await examsApi.update(exam!.id, body);
      else await examsApi.create(body);
      onSaved();
      notify.success(edit ? "Exam saved" : `Exam ${short.trim()} added`);
      onClose();
    } catch (err) {
      const a = apiError(err);
      const f = fieldErrs(err);
      if (a.code === "NAME_TAKEN") f.shortName = "An exam with this name exists";
      if (Object.keys(f).length) setErrs(f);
      else setSrv(a.message ?? "The server didn't answer.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={edit ? "Edit exam" : "New exam"}
      aria-label={edit ? "Edit exam" : "New exam"}
      dirty={dirty}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
            {busy ? "Saving…" : edit ? "Save exam" : "Add exam"}
          </button>
        </>
      }
    >
      <ErrorSummary fields={Object.keys(errs).map((k) => ({ id: k === "shortName" ? "es" : k === "fullName" ? "ef" : "ed", label: k === "shortName" ? "Short name" : k === "fullName" ? "Full name" : k }))} />
      {srv && <ServerErrorBanner detail={srv} onRetry={save} />}
      <Field label="Short name" htmlFor="es" error={errs.shortName} hint="Shown on tests, filters and the student app." counter={short.length > 24 ? { value: short.length, max: 32 } : undefined}>
        <TextInput id="es" value={short} invalid={!!errs.shortName} placeholder="JEE Main" maxLength={40} onChange={(e) => setShort(e.target.value)} />
      </Field>
      <Field label="Full name" optional htmlFor="ef" error={errs.fullName}>
        <TextInput id="ef" value={full} placeholder="Joint Entrance Examination (Main)" onChange={(e) => setFull(e.target.value)} />
      </Field>
      <Field label="Description" optional htmlFor="ed" error={errs.description}>
        <TextArea id="ed" value={desc} rows={3} style={{ fontSize: 13 }} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      {edit ? (
        <Field label="Default exam UI template" htmlFor="et" hint={`New ${short || "exam"} tests start with it. A new exam gets the NTA standard template.`}>
          <Combobox id="et" aria-label="Default exam UI template" options={tplOpts} value={tpl} onChange={setTpl} valueLabel={exam?.defaultTemplate?.name} noun="template" loading={tpls.isLoading} placeholder="Pick a template" />
        </Field>
      ) : (
        <span className="hint">A new exam gets a copy of the NTA standard template as its default. You can change it on Exam UI templates.</span>
      )}
    </Drawer>
  );
}
