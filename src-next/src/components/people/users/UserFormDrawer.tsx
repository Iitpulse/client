"use client";
/*
  Admin-Users drawer: add student / add teacher / add admin, operator or manager / edit, with the owner's ~20 fields
  (D2; no roll no.). Errors: client checks on Save (6-word messages), then the server's VALIDATION_ERROR fields and
  409 EMAIL_TAKEN / PHONE_TAKEN ("Already used by Aarav Jain · open"); a top summary lists what to fix.
*/
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BirthdayField,
  Combobox,
  DateField,
  Drawer,
  ErrorSummary,
  Field,
  MultiSelect,
  PasswordInput,
  PhoneInput,
  Segmented,
  ServerErrorBanner,
  TextInput,
  apiError,
  isPhone,
  notify,
  phoneDigits,
  type ComboOption,
} from "@/components/kit";
import type { TakenDetails, UserDetail, UserType, UserWriteRequest } from "@/lib/m6-contract";
import { useM6Subjects } from "@/lib/m6/shared";
import { useAllBatches, useCentres, useLocations, useRoles, usersApi } from "@/lib/m6/people";
import { cap, isStaffType } from "./shared";

type Kind = "student" | "teacher" | "staff";
interface Form {
  type: UserType;
  status: "active" | "deactivated";
  name: string;
  email: string;
  phone: string;
  dob: string | null;
  gender: "Male" | "Female" | "Other" | "" ;
  address: string;
  city: string | null;
  state: string | null;
  password: string;
  confirm: string;
  centreId: string | null;
  standard: string | null;
  batchIds: string[];
  stream: string;
  medium: string;
  school: string;
  parentName: string;
  parentPhone: string;
  subjectIds: string[];
  roleIds: string[];
  validFrom: string | null;
  validTill: string | null;
}
const ALL_CENTRES = "__all";

function blank(kind: Kind): Form {
  return {
    type: kind === "staff" ? "admin" : kind,
    status: "active",
    name: "",
    email: "",
    phone: "",
    dob: null,
    gender: "",
    address: "",
    city: "Indore",
    state: "Madhya Pradesh",
    password: "",
    confirm: "",
    centreId: kind === "staff" ? ALL_CENTRES : null,
    standard: null,
    batchIds: [],
    stream: "",
    medium: "English",
    school: "",
    parentName: "",
    parentPhone: "",
    subjectIds: [],
    roleIds: [],
    validFrom: null,
    validTill: null,
  };
}
function fromDetail(u: UserDetail): Form {
  return {
    type: u.type,
    status: u.status,
    name: u.name,
    email: u.email,
    phone: phoneDigits(u.phone),
    dob: u.dob,
    gender: u.gender ?? "",
    address: u.address ?? "",
    city: u.city,
    state: u.state,
    password: "",
    confirm: "",
    centreId: u.centre?.id ?? (isStaffType(u.type) ? ALL_CENTRES : null),
    standard: u.standard,
    batchIds: u.type === "student" ? (u.batch ? [u.batch.id] : []) : u.batches.map((b) => b.id),
    stream: u.stream ?? "",
    medium: cap(u.medium) ?? "",
    school: u.school ?? "",
    parentName: u.parentName ?? "",
    parentPhone: phoneDigits(u.parentPhone),
    subjectIds: u.subjects.map((s) => s.id),
    roleIds: u.roles.map((r) => r.id),
    validFrom: u.validFrom,
    validTill: u.validTill,
  };
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LABELS: Record<string, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  password: "Password",
  confirm: "Confirm password",
  centreId: "Centre",
  batchIds: "Batches",
  standard: "Class",
  subjectIds: "Subjects",
  validTill: "Valid till",
  city: "City",
  parentPhone: "Parent's phone",
  dob: "Date of birth",
};
/** server field path → form field */
const SERVER_FIELD: Record<string, string> = {
  "student.batchIds": "batchIds",
  "student.standard": "standard",
  "student.parentPhone": "parentPhone",
  "teacher.subjectIds": "subjectIds",
  "teacher.batchIds": "batchIds",
  confirmPassword: "confirm",
};

export function UserFormDrawer({
  open,
  onOpenChange,
  kind,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** add: which variant; edit: derived from the user */
  kind: Kind;
  /** edit mode */
  user?: UserDetail | null;
  onSaved: (u: UserDetail, created: boolean) => void;
}) {
  const edit = !!user;
  const k: Kind = user ? (user.type === "student" ? "student" : user.type === "teacher" ? "teacher" : "staff") : kind;
  const initial = useMemo(() => (user ? fromDetail(user) : blank(kind)), [user, kind]);
  const [f, setF] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shown, setShown] = useState(false);
  const [taken, setTaken] = useState<TakenDetails | null>(null);
  const [server, setServer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setF(initial);
      setErrors({});
      setShown(false);
      setTaken(null);
      setServer(null);
    }
  }, [open, initial]);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  const set = <K extends keyof Form>(key: K, v: Form[K]) => {
    setF((x) => ({ ...x, [key]: v }));
    if (errors[key as string]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([x]) => x !== key)));
  };

  const loc = useLocations().data;
  const centres = useCentres().data?.items.filter((c) => !c.archivedAt) ?? [];
  const batches = useAllBatches(open).data?.items.filter((b) => !b.archivedAt) ?? [];
  const subjects = useM6Subjects(open && k === "teacher").data ?? [];
  const roles = useRoles().data?.items ?? [];
  const centreName = centres.find((c) => c.id === f.centreId)?.name;

  const centreOpts: ComboOption[] = [
    ...(k === "staff" ? [{ value: ALL_CENTRES, label: "All centres" }] : []),
    ...centres.map((c) => ({ value: c.id, label: c.name, end: c.city })),
  ];
  const batchOpts: ComboOption[] = batches
    .filter((b) => !f.centreId || f.centreId === ALL_CENTRES || !b.centre || b.centre.id === f.centreId)
    .map((b) => ({ value: b.id, label: b.name, end: String(b.students) }));
  const roleOpts: ComboOption[] = roles.filter((r) => r.system !== "student" && !(r.system === "admin" && k !== "staff")).map((r) => ({ value: r.id, label: r.name, end: `${r.members}` }));
  const subjectOpts: ComboOption[] = subjects.map((s) => ({ value: s.name, label: s.name }));

  const check = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Enter the name";
    if (!EMAIL.test(f.email.trim())) e.email = "Enter a valid email";
    if (!isPhone(f.phone)) e.phone = "Phone numbers have 10 digits";
    if (!edit) {
      if (f.password.length < 8) e.password = "Use at least 8 characters";
      if (f.confirm !== f.password) e.confirm = "Passwords don't match";
    }
    if (k !== "staff" && !f.centreId) e.centreId = "Pick a centre";
    if (k === "student" && !f.batchIds.length) e.batchIds = "Pick a batch";
    if (k === "student" && !f.standard) e.standard = "Pick a class";
    if (k === "teacher" && !f.subjectIds.length) e.subjectIds = "Pick at least one subject";
    if (f.parentPhone && !isPhone(f.parentPhone)) e.parentPhone = "Phone numbers have 10 digits";
    if (f.validFrom && f.validTill && f.validTill < f.validFrom) e.validTill = "Valid till must be after Valid from";
    return e;
  };

  const body = (): UserWriteRequest => {
    const b: UserWriteRequest = {
      type: f.type,
      name: f.name.trim(),
      email: f.email.trim().toLowerCase(),
      phone: phoneDigits(f.phone),
      dob: f.dob,
      gender: f.gender || null,
      address: f.address.trim() || null,
      city: f.city,
      state: f.state,
      centreId: f.centreId === ALL_CENTRES ? null : f.centreId,
      validFrom: f.validFrom,
      validTill: f.validTill,
      roleIds: f.roleIds,
    };
    if (!edit) {
      b.password = f.password;
      b.confirmPassword = f.confirm;
    } else b.status = f.status;
    if (k === "student")
      b.student = {
        standard: f.standard,
        batchIds: f.batchIds,
        stream: f.stream || null,
        medium: f.medium || null,
        school: f.school.trim() || null,
        parentName: f.parentName.trim() || null,
        parentPhone: f.parentPhone ? phoneDigits(f.parentPhone) : null,
      };
    if (k === "teacher") b.teacher = { subjectIds: f.subjectIds, batchIds: f.batchIds };
    return b;
  };

  const save = async () => {
    setShown(true);
    setTaken(null);
    setServer(null);
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const u = edit ? await usersApi.update(user!.id, body()) : await usersApi.create(body());
      notify.success(edit ? "Changes saved" : `${f.type === "student" ? "Student" : f.type === "teacher" ? "Teacher" : "Person"} added`, { description: edit ? undefined : f.name.trim() });
      onSaved(u, !edit);
    } catch (err) {
      const a = apiError(err);
      if (a.code === "VALIDATION_ERROR") {
        const fields = (a.details as { fields?: Record<string, { message: string }> } | null)?.fields ?? {};
        setErrors(Object.fromEntries(Object.entries(fields).map(([kk, v]) => [SERVER_FIELD[kk] ?? kk, v.message])));
      } else if (a.code === "EMAIL_TAKEN" || a.code === "PHONE_TAKEN") {
        const d = a.details as TakenDetails | null;
        setTaken(d);
        setErrors({ [a.code === "EMAIL_TAKEN" ? "email" : "phone"]: d ? `Already used by ${d.user.name}` : a.code === "EMAIL_TAKEN" ? "This email is already used" : "This phone is already used" });
      } else if (a.code === "INVALID_CITY") setErrors({ city: "Pick a city from the list" });
      else if (a.code === "BATCH_NOT_AT_CENTRE") setErrors({ batchIds: "Pick a batch at this centre" });
      else if (a.code === "WEAK_PASSWORD") setErrors({ password: "Use at least 8 characters" });
      else setServer(a.message ?? "The server didn't answer.");
    } finally {
      setBusy(false);
    }
  };

  const err = (key: string) => (shown ? errors[key] ?? null : null);
  const takenLink = (key: "email" | "phone") =>
    taken && taken.field === key ? (
      <>
        {" "}
        · <Link href={`/users?tab=${taken.user.type}&id=${encodeURIComponent(taken.user.id)}`}>open</Link>
      </>
    ) : null;
  const summary = shown ? Object.keys(errors).map((key) => ({ id: `uf-${key}`, label: LABELS[key] ?? key })) : [];
  const title = edit ? `Edit ${user!.name}` : k === "student" ? "Add student" : k === "teacher" ? "Add teacher" : "Add admin, operator or manager";
  const saveLabel = edit ? "Save changes" : k === "student" ? "Add student" : k === "teacher" ? "Add teacher" : "Add person";
  const optional = k !== "student";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      aria-label={title}
      dirty={dirty}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={save}>
            {busy ? "Saving…" : saveLabel}
          </button>
        </>
      }
    >
      {summary.length > 0 && <ErrorSummary fields={summary} title={summary.length === 1 ? "1 thing to fix" : `${summary.length} things to fix`} />}
      {server && <ServerErrorBanner detail={server} onRetry={save} />}
      {edit && (
        <div className="col" style={{ gap: 10 }}>
          <span className="k-sec first">Status</span>
          <Segmented
            full
            ariaLabel="Status"
            value={f.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "active", label: "Active" },
              { value: "deactivated", label: "Deactivated" },
            ]}
          />
          <span className="xs muted">
            {k === "student" ? "Deactivated students can't sign in or write tests. Their results stay." : "Deactivated staff can't sign in. Their questions and tests stay."}
          </span>
        </div>
      )}
      <span className={edit ? "k-sec" : "k-sec first"}>Personal</span>
      <Field label="Full name" htmlFor="uf-name" error={err("name")}>
        <TextInput id="uf-name" value={f.name} invalid={!!err("name")} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Email" htmlFor="uf-email" error={err("email") ? <>{err("email")}{takenLink("email")}</> : null}>
        <TextInput id="uf-email" type="email" value={f.email} invalid={!!err("email")} onChange={(e) => set("email", e.target.value)} autoComplete="off" />
      </Field>
      <div className="k-g2">
        <Field label="Phone" htmlFor="uf-phone" error={err("phone") ? <>{err("phone")}{takenLink("phone")}</> : null}>
          <PhoneInput id="uf-phone" value={f.phone} invalid={!!err("phone")} onChange={(v) => set("phone", v)} />
        </Field>
        <Field label="Date of birth" optional={optional} group>
          <BirthdayField idPrefix="uf-dob" value={f.dob} onChange={(v) => set("dob", v)} />
        </Field>
      </div>
      <Field label="Gender" optional={optional} group>
        <Segmented
          full
          ariaLabel="Gender"
          allowNone
          value={f.gender || null}
          onChange={(v) => set("gender", v as Form["gender"])}
          options={[
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Other", label: "Other" },
          ]}
        />
      </Field>
      <Field label="Address" optional htmlFor="uf-address">
        <TextInput id="uf-address" value={f.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <div className="k-g2">
        <Field label="City" optional htmlFor="uf-city" error={err("city")}>
          <Combobox id="uf-city" aria-label="City" clearable options={(loc?.cities ?? ["Indore"]).map((c) => ({ value: c, label: c, end: loc?.states[0] }))} value={f.city} onChange={(v) => set("city", v)} placeholder="Pick a city" noun="city" />
        </Field>
        <Field label="State" optional htmlFor="uf-state">
          <Combobox id="uf-state" aria-label="State" clearable options={(loc?.states ?? ["Madhya Pradesh"]).map((c) => ({ value: c, label: c }))} value={f.state} onChange={(v) => set("state", v)} placeholder="Pick a state" noun="state" />
        </Field>
      </div>

      {!edit && (
        <div className="col" style={{ gap: 12 }}>
          <span className="k-sec">Sign-in</span>
          <div className="k-g2">
            <Field label="Password" htmlFor="uf-password" error={err("password")}>
              <PasswordInput id="uf-password" value={f.password} invalid={!!err("password")} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm password" htmlFor="uf-confirm" error={err("confirm")}>
              <TextInput id="uf-confirm" type="password" value={f.confirm} invalid={!!err("confirm")} onChange={(e) => set("confirm", e.target.value)} autoComplete="new-password" />
            </Field>
          </div>
          <span className="xs muted">At least 8 characters. Give it to them yourself; they can change it later.</span>
        </div>
      )}

      {k === "student" && (
        <div className="col" style={{ gap: 12 }}>
          <span className="k-sec">Study</span>
          <div className="k-g2">
            <Field label="Centre" htmlFor="uf-centreId" error={err("centreId")}>
              <Combobox id="uf-centreId" aria-label="Centre" options={centreOpts} value={f.centreId} invalid={!!err("centreId")} onChange={(v) => (set("centreId", v), set("batchIds", []))} placeholder="Pick a centre" noun="centre" />
            </Field>
            <Field label="Class" htmlFor="uf-standard" error={err("standard")}>
              <Combobox id="uf-standard" aria-label="Class" options={(loc?.standards ?? []).map((s) => ({ value: s, label: s }))} value={f.standard} invalid={!!err("standard")} onChange={(v) => set("standard", v)} placeholder="Pick a class" noun="class" />
            </Field>
          </div>
          <Field label="Batches" htmlFor="uf-batchIds" error={err("batchIds")} hint={centreName ? `Only batches at ${centreName}` : "Pick a centre first"}>
            <MultiSelect id="uf-batchIds" aria-label="Batches" options={batchOpts} value={f.batchIds} invalid={!!err("batchIds")} onChange={(v) => set("batchIds", v.slice(-1))} placeholder="Pick a batch" noun="batch" disabled={!f.centreId} />
          </Field>
          <Field label="Stream" group>
            <Segmented full ariaLabel="Stream" allowNone value={f.stream || null} onChange={(v) => set("stream", v)} options={(loc?.streams ?? ["PCM", "PCB", "PCMB", "Commerce", "Arts"]).map((s) => ({ value: s, label: s }))} />
          </Field>
          <div className="k-g2">
            <Field label="Medium" group>
              <Segmented full ariaLabel="Medium" allowNone value={f.medium || null} onChange={(v) => set("medium", v)} options={(loc?.mediums ?? ["English", "Hindi", "Other"]).map((s) => ({ value: s, label: s }))} />
            </Field>
            <Field label="School" optional htmlFor="uf-school">
              <TextInput id="uf-school" value={f.school} onChange={(e) => set("school", e.target.value)} />
            </Field>
          </div>
          <span className="k-sec">Parent</span>
          <div className="k-g2">
            <Field label="Parent's name" optional htmlFor="uf-parentName">
              <TextInput id="uf-parentName" value={f.parentName} onChange={(e) => set("parentName", e.target.value)} />
            </Field>
            <Field label="Parent's phone" optional htmlFor="uf-parentPhone" error={err("parentPhone")}>
              <PhoneInput id="uf-parentPhone" value={f.parentPhone} invalid={!!err("parentPhone")} onChange={(v) => set("parentPhone", v)} />
            </Field>
          </div>
        </div>
      )}

      {k === "teacher" && (
        <div className="col" style={{ gap: 12 }}>
          <span className="k-sec">Teaching</span>
          <Field label="Centre" htmlFor="uf-centreId" error={err("centreId")}>
            <Combobox id="uf-centreId" aria-label="Centre" options={centreOpts} value={f.centreId} invalid={!!err("centreId")} onChange={(v) => set("centreId", v)} placeholder="Pick a centre" noun="centre" />
          </Field>
          <Field label="Subjects" htmlFor="uf-subjectIds" error={err("subjectIds")}>
            <MultiSelect id="uf-subjectIds" aria-label="Subjects" options={subjectOpts} value={f.subjectIds} invalid={!!err("subjectIds")} onChange={(v) => set("subjectIds", v)} placeholder="Pick subjects" noun="subject" />
          </Field>
          <Field label="Batches" optional htmlFor="uf-batchIds" hint="They see these batches' students and results">
            <MultiSelect id="uf-batchIds" aria-label="Batches" options={batchOpts} value={f.batchIds} onChange={(v) => set("batchIds", v)} placeholder="Pick batches" noun="batch" />
          </Field>
        </div>
      )}

      {k === "staff" && (
        <div className="col" style={{ gap: 12 }}>
          <span className="k-sec">Work</span>
          <Field label="Type" group>
            <Segmented
              full
              ariaLabel="Type"
              value={f.type}
              onChange={(v) => set("type", v)}
              options={[
                { value: "admin", label: "Admin", disabled: edit && f.type !== "admin" },
                { value: "operator", label: "Operator", disabled: edit && f.type !== "operator" },
                { value: "manager", label: "Manager", disabled: edit && f.type !== "manager" },
              ]}
            />
          </Field>
          <Field label="Centre" htmlFor="uf-centreId">
            <Combobox id="uf-centreId" aria-label="Centre" options={centreOpts} value={f.centreId} onChange={(v) => set("centreId", v)} placeholder="All centres" noun="centre" />
          </Field>
        </div>
      )}

      <span className="k-sec">Access</span>
      <Field label="Roles" optional htmlFor="uf-roleIds" hint={<>What they can open. <Link href="/roles">See roles</Link></>}>
        <MultiSelect id="uf-roleIds" aria-label="Roles" options={roleOpts} value={f.roleIds} onChange={(v) => set("roleIds", v)} placeholder={`${k === "student" ? "Student" : k === "teacher" ? "Teacher" : "Their type's"} role is given automatically`} noun="role" valueLabels={Object.fromEntries((user?.roles ?? []).map((r) => [r.id, r.name]))} />
      </Field>
      <Field label="Valid" optional group error={err("validTill")} hint="After this date they can't sign in. Leave empty for no end date.">
        <div className="row" style={{ gap: 8 }}>
          <DateField aria-label="Valid from" value={f.validFrom} onChange={(v) => set("validFrom", v)} clearable placeholder="From" />
          <span className="muted">–</span>
          <DateField id="uf-validTill" aria-label="Valid till" value={f.validTill} onChange={(v) => set("validTill", v)} clearable invalid={!!err("validTill")} minDate={f.validFrom ?? undefined} placeholder="Till" />
        </div>
      </Field>
    </Drawer>
  );
}
