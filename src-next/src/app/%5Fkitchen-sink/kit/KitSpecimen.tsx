"use client";
import { useState, type ReactNode } from "react";
import { Paper } from "@iitpulse/ui";
import {
  Banner,
  BirthdayField,
  BlockedDialog,
  BulkBar,
  Checkbox,
  Combobox,
  ConfirmDialog,
  CopyCode,
  DataTable,
  DateField,
  DateRangeChip,
  DateTimeField,
  Drawer,
  EmptyState,
  ErrorSummary,
  Field,
  FileDrop,
  FileRow,
  FilterBar,
  FilterChip,
  InlineNote,
  MultiSelect,
  NoAccess,
  NumberStepper,
  PageError,
  Pagination,
  PasswordInput,
  PhoneInput,
  RangeFields,
  ReadOnlyValue,
  ReauthDialog,
  SearchBox,
  Segmented,
  ServerErrorBanner,
  SignedMarks,
  Steps,
  StateBox,
  Switch,
  TextInput,
  ToggleChip,
  TypedConfirmDialog,
  UnsavedChangesDialog,
  fmtPhone,
  notify,
  presetRange,
  type ComboOption,
  type DateRange,
} from "@/components/kit";

const CHAPTERS: ComboOption[] = [
  { value: "eq", label: "Equilibrium", group: "Chemistry", end: "28 q" },
  { value: "cq", label: "Complex numbers and quadratic equations", group: "Maths", end: "41 q" },
  { value: "li", label: "Linear inequalities", group: "Maths", end: "12 q" },
  { value: "de", label: "Differential equations", group: "Maths", end: "33 q" },
  { value: "rot", label: "System of particles and rotational motion", group: "Physics", end: "212 q" },
  { value: "kin", label: "Kinematics", group: "Physics", end: "284 q" },
  { value: "lom", label: "Laws of motion", group: "Physics", end: "318 q" },
  { value: "wep", label: "Work, energy and power", group: "Physics", end: "241 q" },
  { value: "grav", label: "Gravitation", group: "Physics", end: "178 q" },
];
const BATCHES: ComboOption[] = [
  { value: "a", label: "JEE 2027 · Indore A", group: "JEE 2027", end: "412" },
  { value: "b", label: "JEE 2027 · Indore B", group: "JEE 2027", end: "386" },
  { value: "d", label: "JEE 2027 · Droppers", group: "JEE 2027", end: "344" },
  { value: "na", label: "NEET 2027 · Indore A", group: "NEET 2027", end: "96" },
  { value: "nb", label: "NEET 2027 · Indore B", group: "NEET 2027", end: "88" },
];
type Row = { id: string; name: string; email: string; batch: string; phone: string; avg: number };
const ROWS: Row[] = [
  { id: "1", name: "Aarav Jain", email: "aarav.jain@example.com", batch: "JEE 2027 · Indore A", phone: "9826012345", avg: 82.7 },
  { id: "2", name: "Ishita Sharma", email: "ishita.sharma.indore.2027@example.com", batch: "JEE 2027 · Indore A", phone: "9826023456", avg: 80.1 },
  { id: "3", name: "Rohan Patidar", email: "rohan.patidar@example.com", batch: "JEE 2027 · Indore B", phone: "9826034567", avg: 77.9 },
];

function Spec({ tag, children, span = 1 }: { tag: string; children: ReactNode; span?: number }) {
  return (
    <div className="card col" style={{ padding: 16, gap: 12, gridColumn: `span ${span}`, minWidth: 0 }}>
      <span className="eyebrow" style={{ fontSize: 11 }}>
        {tag}
      </span>
      {children}
    </div>
  );
}
const grid = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, alignItems: "start" } as const;

export function KitSpecimen() {
  const [ch, setCh] = useState<string | null>("rot");
  const [ch2, setCh2] = useState<string | null>(null);
  const [ms, setMs] = useState<string[]>(["a", "b", "d", "na"]);
  const [topics, setTopics] = useState<string[]>(["Torque"]);
  const [seg, setSeg] = useState<string>("medium");
  const [opens, setOpens] = useState<string | null>(() => new Date(Date.now() + 86400000 * 9).toISOString());
  const [d, setD] = useState<string | null>("2027-05-31");
  const [dob, setDob] = useState<string | null>("2009-03-12");
  const [range, setRange] = useState<DateRange>(presetRange("7d"));
  const [phone, setPhone] = useState("982601234");
  const [n, setN] = useState<number | null>(26);
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(true);
  const [rf, setRf] = useState(["2.52", "2.48"]);
  const [sel, setSel] = useState(new Set(["1", "2"]));
  const [dlg, setDlg] = useState<string | null>(null);
  const [batchF, setBatchF] = useState<string | null>("a");
  const [tg, setTg] = useState(true);
  const [q, setQ] = useState("");
  return (
    <Paper surface="admin" className="admin" style={{ minHeight: "100vh", padding: "40px 48px 120px" }}>
      <div className="col" style={{ gap: 40, maxWidth: 1344, margin: "0 auto" }}>
        <header className="col" style={{ gap: 6 }}>
          <span className="eyebrow">Admin kit · components/kit</span>
          <h1 className="h1">Kit specimen</h1>
          <p className="sm muted" style={{ margin: 0 }}>
            Every component in its states (Kit-Pickers, Forms, Overlays, Feedback, Data, States).
          </p>
        </header>

        <section className="col" style={{ gap: 12 }}>
          <h2 className="h2">K01 Combobox · K02 Multi-select</h2>
          <div style={grid}>
            <Spec tag="Empty">
              <Field label="Subject" htmlFor="s1">
                <Combobox id="s1" options={CHAPTERS} value={ch2} onChange={setCh2} placeholder="Pick a subject" />
              </Field>
            </Spec>
            <Spec tag="Filled · optional, clears">
              <Field label="Chapter" optional htmlFor="s2" hint="Long values cut with … and show in full on hover.">
                <Combobox id="s2" options={CHAPTERS} value={ch} onChange={setCh} clearable noun="chapter" creatable={{ label: (s) => `Create chapter "${s}" in Physics`, onCreate: (s) => notify.success(`Chapter "${s}" created`) }} />
              </Field>
            </Spec>
            <Spec tag="Disabled · says why">
              <Field label="Chapter" htmlFor="s3" dim hint="Chapters load once a subject is picked.">
                <Combobox id="s3" options={[]} value={null} onChange={() => {}} disabled disabledText="Pick a subject first" />
              </Field>
            </Spec>
            <Spec tag="Error">
              <Field label="Subject" htmlFor="s4" error="Pick a subject">
                <Combobox id="s4" options={CHAPTERS} value={null} onChange={() => {}} invalid placeholder="Pick a subject" />
              </Field>
            </Spec>
            <Spec tag="Multi · overflow">
              <Field label="Batches" htmlFor="m1" hint={`${ms.length} batches`}>
                <MultiSelect id="m1" options={BATCHES} value={ms} onChange={setMs} maxChips={2} placeholder="Pick batches" />
              </Field>
            </Spec>
            <Spec tag="Multi · creatable">
              <Field label="Topics" htmlFor="m2">
                <MultiSelect
                  id="m2"
                  options={["Torque", "Moment of inertia", "Angular momentum"].map((t) => ({ value: t, label: t }))}
                  value={topics}
                  onChange={setTopics}
                  noun="topic"
                  creatable={{ label: (s) => `Create topic "${s}"`, onCreate: (s) => setTopics((t) => [...t, s]) }}
                />
              </Field>
            </Spec>
            <Spec tag="Multi · error">
              <Field label="Batches" htmlFor="m3" error="Pick at least one batch">
                <MultiSelect id="m3" options={BATCHES} value={[]} onChange={() => {}} invalid placeholder="Pick batches" />
              </Field>
            </Spec>
            <Spec tag="Segmented">
              <Field label="Difficulty" group>
                <Segmented value={seg} onChange={setSeg} ariaLabel="Difficulty" options={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} />
              </Field>
            </Spec>
          </div>
        </section>

        <section className="col" style={{ gap: 12 }}>
          <h2 className="h2">K03 Dates (IST)</h2>
          <div style={grid}>
            <Spec tag="Date and time">
              <Field label="Opens" htmlFor="d1">
                <DateTimeField id="d1" value={opens} onChange={setOpens} minDate={new Date().toISOString().slice(0, 10)} />
              </Field>
            </Spec>
            <Spec tag="Read-only">
              <Field label="Opens" group hint="Can't change once students have started.">
                <DateTimeField value={opens} onChange={() => {}} readOnly />
              </Field>
            </Spec>
            <Spec tag="Date · clears">
              <Field label="Valid till" optional htmlFor="d2">
                <DateField id="d2" value={d} onChange={setD} clearable />
              </Field>
            </Spec>
            <Spec tag="Birthday · three fields">
              <Field label="Date of birth" group>
                <BirthdayField value={dob} onChange={setDob} />
              </Field>
              <span className="xs muted">{dob ?? "incomplete"}</span>
            </Spec>
          </div>
        </section>

        <section className="col" style={{ gap: 12 }}>
          <h2 className="h2">K09 Fields · K10 Numbers · choice controls</h2>
          <div style={grid}>
            <Spec tag="Phone · error">
              <Field label="Phone" htmlFor="f1" error={phone.length !== 10 ? "Phone numbers have 10 digits" : null}>
                <PhoneInput id="f1" value={phone} onChange={setPhone} invalid={phone.length !== 10} />
              </Field>
              <span className="xs muted">{fmtPhone(phone)}</span>
            </Spec>
            <Spec tag="Promo · counter">
              <Field label="Promo code" htmlFor="f2" counter={{ value: 5, max: 6 }} error="Promo codes are 6 characters">
                <TextInput id="f2" mono invalid defaultValue="IIT20" />
              </Field>
            </Spec>
            <Spec tag="Password · read-only">
              <Field label="Password" htmlFor="f3" hint="At least 8 characters.">
                <PasswordInput id="f3" defaultValue="pulse-2026!" />
              </Field>
              <Field label="Institute" group hint="Read-only: set by the platform.">
                <ReadOnlyValue>IIT-PULSE Indore</ReadOnlyValue>
              </Field>
            </Spec>
            <Spec tag="Stepper · marks · range">
              <Field label="Questions to attempt" htmlFor="n1" error={(n ?? 0) > 25 ? "Can't be more than the 25 questions" : null}>
                <NumberStepper id="n1" value={n} onChange={setN} max={25} of={25} invalid={(n ?? 0) > 25} />
              </Field>
              <div className="row" style={{ gap: 8 }}>
                <SignedMarks value={4} onChange={() => {}} tone="plus" aria-label="Correct" />
                <SignedMarks value={1} onChange={() => {}} tone="minus" aria-label="Wrong" />
              </div>
              <RangeFields idPrefix="rg" from={rf[0]!} to={rf[1]!} onChange={(a, b) => setRf([a, b])} />
            </Spec>
            <Spec tag="Switch · checkbox" span={2}>
              <Switch id="sw1" checked={sw} onChange={setSw} label="Email me when results are out" hint="Saved as you switch" />
              <Checkbox checked={cb} onChange={setCb}>
                Shuffle options
              </Checkbox>
              <Checkbox checked={false} mixed onChange={() => {}}>
                All sections <span className="xs muted">(2 of 3)</span>
              </Checkbox>
            </Spec>
            <Spec tag="Error summary · server banner" span={2}>
              <ErrorSummary fields={[{ id: "f1", label: "Phone" }, { id: "f2", label: "Promo code" }]} />
              <ServerErrorBanner onRetry={() => {}} />
            </Spec>
          </div>
        </section>

        <section className="col" style={{ gap: 12 }}>
          <h2 className="h2">K14 Steps · K11 Upload</h2>
          <div style={grid}>
            <Spec tag="Steps" span={2}>
              <Steps steps={[{ label: "Upload" }, { label: "Check rows", bad: true }, { label: "Import" }]} current={1} onGo={() => {}} />
              <Steps steps={[{ label: "Upload file" }, { label: "Match columns" }, { label: "Review rows" }, { label: "Import" }]} current={1} onGo={() => {}} />
            </Spec>
            <Spec tag="Drop">
              <FileDrop accept={[".xlsx", ".xls", ".csv"]} maxBytes={10 * 1024 * 1024} onFile={(f) => notify.success(`Read ${f.name}`)} rules=".xlsx, .xls or .csv · up to 10 MB" title="Drop the sheet here or" />
            </Spec>
            <Spec tag="File rows">
              <FileRow name="Physics-DPP-14.docx" progress={64} meta="1.5 of 2.4 MB" actions={<button className="btn btn-ghost btn-sm">Cancel</button>} />
              <FileRow name="JEE 2027 B students.xlsx" problem="412 rows · 14 need a fix" actions={<button className="btn btn-ghost btn-sm">Replace</button>} />
              <FileRow name="Scan-chemistry.pdf" failed="Couldn't read this file." />
            </Spec>
          </div>
        </section>

        <section className="col" style={{ gap: 12 }}>
          <h2 className="h2">K07 Confirmations · K08 Toasts · K16 Banners</h2>
          <div className="row wrap" style={{ gap: 8 }}>
            {["confirm", "navy", "reauth", "blocked", "typed", "unsaved", "drawer"].map((k) => (
              <button key={k} className="btn btn-secondary btn-sm" onClick={() => setDlg(k)}>
                Open {k}
              </button>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => notify.success("Batch saved")}>
              Toast
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => notify.undo('Topic "Rolling with slip" deleted', () => notify.success("Topic restored"))}>
              Undo toast
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => notify.error("Couldn't save the question", { description: "No connection. Your changes are kept.", retry: () => {} })}>
              Error toast
            </button>
          </div>
          <div className="col" style={{ gap: 10 }}>
            <Banner tone="warn" title="3 teachers have no batch." action={<button className="btn btn-secondary">Assign teachers</button>}>
              They can&rsquo;t see any students until you assign them.
            </Banner>
            <Banner tone="info" title="Institutes are now called centres." dismissKey="kit-demo">
              Nothing moved: old links to Institutes open this tab.
            </Banner>
            <InlineNote>Admin always has every permission, so nobody can lock the institute out.</InlineNote>
            <CopyCode code="JEE4A7" /> <CopyCode code="BATCH2024" bad />
          </div>
        </section>

        <section className="col" style={{ gap: 12 }}>
          <h2 className="h2">K04 Filter bar · K05 Table</h2>
          <FilterBar
            activeCount={(batchF ? 1 : 0) + (tg ? 1 : 0) + (range.preset !== "7d" ? 1 : 0)}
            onClearAll={() => (setBatchF(null), setTg(false), setRange(presetRange("7d")))}
            search={<SearchBox value={q} onChange={setQ} placeholder="Name, phone or email" label="Search students" />}
            right={<span className="sm muted">3 students</span>}
          >
            <FilterChip label="Batch" noun="batch" options={BATCHES} value={batchF} onChange={setBatchF} />
            <FilterChip label="Status" noun="status" options={[{ value: "active", label: "active" }]} value={null} onChange={() => {}} />
            <DateRangeChip value={range} onChange={setRange} isDefault={range.preset === "7d"} onReset={() => setRange(presetRange("7d"))} />
            <ToggleChip on={tg} onChange={setTg}>
              Missing solution · 214
            </ToggleChip>
          </FilterBar>
          <DataTable<Row>
            ariaLabel="Students"
            status="ready"
            rows={ROWS}
            rowKey={(r) => r.id}
            onRowClick={() => setDlg("drawer")}
            selection={{ selected: sel, onChange: setSel, label: (r) => r.name }}
            sort={{ key: "avg", dir: "desc", onSort: () => {} }}
            rowMenu={() => [
              { label: "Open profile", onSelect: () => {} },
              { label: "Reset password", onSelect: () => {} },
              { label: "Delete user…", danger: true, onSelect: () => setDlg("reauth") },
            ]}
            columns={[
              { key: "name", header: "Name", width: "28%", sortKey: "name", render: (r) => <span className="sm" style={{ fontWeight: 600 }}>{r.name}</span> },
              { key: "email", header: "Email", width: "30%", tablet: "hide", render: (r) => <span className="k-ell" style={{ display: "block" }}>{r.email}</span> },
              { key: "batch", header: "Batch", render: (r) => r.batch },
              { key: "phone", header: "Phone", width: 130, render: (r) => <span className="num">{fmtPhone(r.phone)}</span> },
              { key: "avg", header: "Avg score", width: 120, align: "num", sortKey: "avg", render: (r) => `${r.avg}%` },
            ]}
            footer={<Pagination page={1} pageSize={25} total={128} onPage={() => {}} onPageSize={() => {}} sortLabel="avg score" />}
          />
          <div style={grid}>
            <Spec tag="Loading">
              <DataTable<Row> ariaLabel="Loading" status="loading" rows={[]} rowKey={(r) => r.id} skeletonRows={3} columns={[{ key: "n", header: "Name", render: () => null }, { key: "a", header: "Avg", align: "num", render: () => null }]} />
            </Spec>
            <Spec tag="Empty">
              <EmptyState title="No students yet" body="Add them one by one, or import a sheet from Excel." actions={<button className="btn btn-primary btn-sm">Add student</button>} />
            </Spec>
            <Spec tag="No match">
              <StateBox compact title='No students match "Aarv"' body="in JEE 2027 · Indore A" action={<button className="btn btn-secondary btn-sm">Clear filters</button>} />
            </Spec>
            <Spec tag="Error · no access">
              <PageError what="students" code="USR-503" onRetry={() => {}} />
              <NoAccess what="Users" role="Operator" />
            </Spec>
          </div>
        </section>
      </div>

      <BulkBar count={sel.size} onClear={() => setSel(new Set())} selectAll={{ label: "Select all 128", onClick: () => {} }}>
        <button className="btn btn-ghost">Move to batch</button>
        <button className="btn btn-ghost">Export</button>
        <button className="btn btn-ghost danger">Remove from batch</button>
      </BulkBar>
      <ConfirmDialog open={dlg === "confirm"} onOpenChange={() => setDlg(null)} title="Delete this pattern?" description='"JEE Main · 2026". Tests made from it keep their own copy. This can&apos;t be undone.' confirmLabel="Delete pattern" onConfirm={() => notify.success("Pattern deleted")} />
      <ConfirmDialog
        open={dlg === "navy"}
        onOpenChange={() => setDlg(null)}
        tone="navy"
        title="Re-score JEE Main Mock 11?"
        description="You changed the key for Q14 from (A) to (C)."
        facts={[
          ["Scores", "212 recalculated, ranks too"],
          ["Students", '38 see a "key corrected" note'],
          ["Record", "Saved to the audit log"],
        ]}
        confirmLabel="Re-score 212 students"
        onConfirm={() => {}}
      />
      <ReauthDialog open={dlg === "reauth"} onOpenChange={() => setDlg(null)} title="Delete batch JEE 2027 · Indore B?" description="184 students lose access to its tests and results. This can't be undone." confirmLabel="Delete batch" onConfirm={() => notify.success("Batch deleted")} />
      <BlockedDialog open={dlg === "blocked"} onOpenChange={() => setDlg(null)} title="Can't delete JEE Main Mock 12 yet" description="106 students are writing it now. You can delete it after it closes at 9:00 PM." />
      <TypedConfirmDialog open={dlg === "typed"} onOpenChange={() => setDlg(null)} title="Suspend Momentum Coaching?" word="momentum" confirmLabel="Suspend institute" onConfirm={() => {}} />
      <UnsavedChangesDialog open={dlg === "unsaved"} onOpenChange={() => setDlg(null)} what="You changed the question text and 2 options." onDiscard={() => setDlg(null)} onSave={() => setDlg(null)} />
      <Drawer open={dlg === "drawer"} onOpenChange={() => setDlg(null)} title="Edit batch" dirty footer={<><button className="btn btn-ghost btn-sm" onClick={() => setDlg(null)}>Cancel</button><button className="btn btn-primary btn-sm">Save batch</button></>}>
        <Field label="Name" htmlFor="dn">
          <TextInput id="dn" defaultValue="JEE 2027 · Indore A" />
        </Field>
        <Field label="Promo code" htmlFor="dp" hint="Exactly 6 characters.">
          <TextInput id="dp" mono defaultValue="IND726" />
        </Field>
      </Drawer>
    </Paper>
  );
}
