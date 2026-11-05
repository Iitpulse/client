"use client";
/*
  Admin-Setup `batch-form`: New / Edit batch drawer. Promo codes are exactly 6 letters or digits (owner D1): typed
  codes are upper-cased, "Make one for me" asks the server for an unused one, legacy codes of another length show
  amber with Regenerate. Teachers are optional (they see this batch's students and results).
*/
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  Combobox,
  CopyCode,
  Drawer,
  ErrorSummary,
  Field,
  FieldError,
  MultiSelect,
  Segmented,
  ServerErrorBanner,
  TextInput,
  apiError,
  notify,
} from "@/components/kit";
import { batchesApi, useBatch, useCentres, useExamList, useInvalidatePeople, useUsers } from "@/lib/m6/people";
import type { BatchWriteRequest } from "@/lib/m6-contract";
import { PROMO_RE, fieldErrs, mediumLabel } from "./shared";

interface Draft {
  name: string;
  centreId: string | null;
  medium: "English" | "Hindi" | null;
  examIds: string[];
  codes: string[];
  teacherIds: string[];
}
const EMPTY: Draft = { name: "", centreId: null, medium: "English", examIds: [], codes: [], teacherIds: [] };

export function BatchForm({ open, onClose, batchId, onSaved }: { open: boolean; onClose: () => void; batchId: string | null; onSaved?: (id: string | null) => void }) {
  const edit = !!batchId;
  const detail = useBatch(open ? batchId : null);
  const centres = useCentres();
  const exams = useExamList(false);
  const teachers = useUsers({ type: "teacher", pageSize: 100, status: "active" }, open);
  const invalidate = useInvalidatePeople();
  const [d, setD] = useState<Draft>(EMPTY);
  const [base, setBase] = useState<string>(JSON.stringify(EMPTY));
  const [newCode, setNewCode] = useState("");
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [srv, setSrv] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  // load the draft (edit: from the detail; new: one generated code, the only centre preselected)
  useEffect(() => {
    if (!open) return;
    setErrs({});
    setSrv(null);
    setNewCode("");
    setCodeErr(null);
    setTried(false);
    if (edit) {
      const b = detail.data;
      if (!b) return;
      const next: Draft = {
        name: b.name,
        centreId: b.centre?.id ?? null,
        medium: (mediumLabel(b.medium) as Draft["medium"]) ?? null,
        examIds: b.exams.map((e) => e.id),
        codes: b.promoCodes.map((c) => c.code),
        teacherIds: b.teacherList.map((t) => t.id),
      };
      setD(next);
      setBase(JSON.stringify(next));
    } else {
      const live = (centres.data?.items ?? []).filter((c) => !c.archivedAt);
      const next = { ...EMPTY, centreId: live.length === 1 ? live[0]!.id : null };
      setD(next);
      setBase(JSON.stringify(next));
      void batchesApi.generate(1).then(
        (r) => setD((x) => (x.codes.length ? x : { ...x, codes: r.codes.slice(0, 1) })),
        () => {}
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit, detail.data]);

  const dirty = JSON.stringify(d) !== base || newCode !== "";
  const centreOpts = useMemo(() => (centres.data?.items ?? []).filter((c) => !c.archivedAt || c.id === d.centreId).map((c) => ({ value: c.id, label: c.name, end: c.mode === "online" ? "Online" : undefined })), [centres.data, d.centreId]);
  const examOpts = useMemo(() => (exams.data ?? []).filter((e) => e.status !== "deleted").map((e) => ({ value: e.id, label: e.shortName, end: e.fullName && e.fullName !== e.shortName ? e.fullName : undefined })), [exams.data]);
  const teacherOpts = useMemo(
    () =>
      (teachers.data?.items ?? []).map((t) => ({
        value: t.id,
        label: t.name,
        sub: t.subjects.map((s) => s.name).join(", ") || undefined,
        keywords: [t.email, ...t.subjects.map((s) => s.name)],
      })),
    [teachers.data]
  );
  const teacherChip = (id: string) => {
    const t = teachers.data?.items.find((x) => x.id === id);
    return t ? `${t.name}${t.subjects[0] ? ` · ${t.subjects[0].name}` : ""}` : id;
  };

  const addCode = (raw: string) => {
    const c = raw.trim().toUpperCase();
    if (!PROMO_RE.test(c)) {
      setCodeErr("Promo codes are exactly 6 characters");
      return false;
    }
    if (d.codes.includes(c)) {
      setCodeErr(`${c} is already on this batch`);
      return false;
    }
    setD((x) => ({ ...x, codes: [...x.codes, c] }));
    setNewCode("");
    setCodeErr(null);
    return true;
  };
  const generate = async (replace?: string) => {
    try {
      const r = await batchesApi.generate(1);
      const c = r.codes[0];
      if (!c) return;
      setD((x) => ({ ...x, codes: replace ? x.codes.map((k) => (k === replace ? c : k)) : [...x.codes, c] }));
      setNewCode("");
      setCodeErr(null);
    } catch {
      notify.error("Couldn't make a code", { description: "Try again, or type one." });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!d.name.trim()) e.name = "Give the batch a name";
    if (!d.centreId) e.centreId = "Pick a centre";
    if (!d.medium) e.medium = "Pick a medium";
    const bad = d.codes.find((c) => !PROMO_RE.test(c));
    if (bad) e.promoCodes = `${bad} isn't 6 characters · regenerate it`;
    if (newCode && !PROMO_RE.test(newCode.toUpperCase())) e.promoCodes = "Promo codes are exactly 6 characters";
    return e;
  };
  const save = async () => {
    setTried(true);
    const pending = newCode && PROMO_RE.test(newCode.toUpperCase()) && !d.codes.includes(newCode.toUpperCase()) ? [...d.codes, newCode.toUpperCase()] : d.codes;
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    const body: BatchWriteRequest = { name: d.name.trim(), centreId: d.centreId!, medium: d.medium!, examIds: d.examIds, promoCodes: pending, teacherIds: d.teacherIds };
    setBusy(true);
    setSrv(null);
    try {
      const r = (edit ? await batchesApi.update(batchId!, body) : await batchesApi.create(body)) as { batch?: { id: string }; id?: string } | null;
      invalidate();
      notify.success(edit ? "Batch saved" : `Batch ${d.name.trim()} added`);
      onSaved?.(r?.batch?.id ?? r?.id ?? batchId);
      onClose();
    } catch (err) {
      const a = apiError(err);
      const f = fieldErrs(err);
      if (a.code === "PROMO_TAKEN") f.promoCodes = `${(a.details as { code?: string } | null)?.code ?? "That code"} is used by another batch`;
      if (a.code === "PROMO_LENGTH") f.promoCodes = f.promoCodes ?? "Promo codes are exactly 6 characters";
      if (a.code === "NAME_TAKEN") f.name = "A batch with this name exists";
      if (Object.keys(f).length) setErrs(f);
      else setSrv(a.message ?? "The server didn't answer.");
    } finally {
      setBusy(false);
    }
  };

  const summary = tried
    ? Object.keys(errs).map((k) => ({ id: { name: "bn", centreId: "bc", medium: "bm", promoCodes: "bp", examIds: "bx", teacherIds: "bt" }[k] ?? k, label: { name: "Name", centreId: "Centre", medium: "Medium", promoCodes: "Promo codes", examIds: "Exams", teacherIds: "Teachers" }[k] ?? k }))
    : [];

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={edit ? "Edit batch" : "New batch"}
      aria-label={edit ? "Edit batch" : "New batch"}
      dirty={dirty}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy || (edit && !detail.data)}>
            {busy ? "Saving…" : edit ? "Save batch" : "Add batch"}
          </button>
        </>
      }
    >
      {edit && detail.isLoading ? (
        <div className="col" style={{ gap: 12 }} aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="skel" style={{ height: 36 }} />
          ))}
        </div>
      ) : (
        <>
          <ErrorSummary fields={summary} />
          {srv && <ServerErrorBanner detail={srv} onRetry={save} />}
          <Field label="Name" htmlFor="bn" error={errs.name} hint="Students see this name.">
            <TextInput id="bn" value={d.name} invalid={!!errs.name} placeholder="JEE 2027 · Indore A" onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="Centre" htmlFor="bc" error={errs.centreId}>
            <Combobox id="bc" aria-label="Centre" options={centreOpts} value={d.centreId} onChange={(v) => setD({ ...d, centreId: v })} invalid={!!errs.centreId} placeholder="Pick a centre" noun="centre" loading={centres.isLoading} />
          </Field>
          <Field label="Medium" group error={errs.medium}>
            <Segmented
              id="bm"
              ariaLabel="Medium"
              value={d.medium}
              onChange={(v) => setD({ ...d, medium: v })}
              options={[
                { value: "English", label: "English" },
                { value: "Hindi", label: "Hindi" },
              ]}
            />
          </Field>
          <Field label="Exams" optional htmlFor="bx" hint="Tests for these exams can be given to this batch.">
            <MultiSelect id="bx" aria-label="Exams" options={examOpts} value={d.examIds} onChange={(v) => setD({ ...d, examIds: v })} placeholder="Pick exams" noun="exam" maxChips={3} />
          </Field>
          <div className="field">
            <div className="row between">
              <span className="label">Promo codes</span>
              <span className="xs muted">Students type one when they sign up</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              {d.codes.map((c) =>
                PROMO_RE.test(c) ? (
                  <div key={c} className="row" style={{ gap: 8 }}>
                    <CopyCode code={c} large />
                    <button type="button" className="k-rm" aria-label={`Remove ${c}`} onClick={() => setD({ ...d, codes: d.codes.filter((x) => x !== c) })}>
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <div key={c} className="col" style={{ gap: 6, padding: 10, borderRadius: 10, background: "var(--amber-50)", border: "1px solid #F1D29A" }}>
                    <div className="row" style={{ gap: 8 }}>
                      <CopyCode code={c} bad large />
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void generate(c)}>
                        Regenerate
                      </button>
                    </div>
                    <span className="xs" style={{ color: "#5C3600" }}>
                      {c.length} characters, so students can&rsquo;t use it. Regenerate makes a 6-character code; tell students the new one.
                    </span>
                  </div>
                )
              )}
              <div className="row" style={{ gap: 8 }}>
                <TextInput
                  id="bp"
                  mono
                  maxLength={6}
                  aria-label="New promo code"
                  placeholder={d.codes.length ? "Add another code" : "6 letters or numbers"}
                  invalid={!!(codeErr ?? errs.promoCodes)}
                  value={newCode}
                  style={{ flex: 1 }}
                  onChange={(e) => {
                    setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                    setCodeErr(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCode(newCode);
                    }
                  }}
                  onBlur={() => newCode.length === 6 && addCode(newCode)}
                />
                {newCode.length === 6 ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => addCode(newCode)}>
                    Add
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => void generate()}>
                    Make one for me
                  </button>
                )}
              </div>
              {(codeErr ?? errs.promoCodes) && <FieldError id="bp-e">{codeErr ?? errs.promoCodes}</FieldError>}
            </div>
          </div>
          <Field label="Teachers" optional htmlFor="bt" hint={`${d.teacherIds.length} ${d.teacherIds.length === 1 ? "teacher" : "teachers"} · they see this batch's students and results`}>
            <MultiSelect id="bt" aria-label="Teachers" options={teacherOpts} value={d.teacherIds} onChange={(v) => setD({ ...d, teacherIds: v })} chipLabel={(o) => teacherChip(o.value)} placeholder="Pick teachers" noun="teacher" maxChips={2} loading={teachers.isLoading} />
          </Field>
        </>
      )}
    </Drawer>
  );
}
