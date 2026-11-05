"use client";
/*
  Admin-Setup Centres (replaces Institutes): name, code, city (the tenant's list: Indore), mode, batch and student
  counts. Archive runs at once with Undo; a centre with batches can't be archived (CENTRE_HAS_BATCHES → blocked).
*/
import { useEffect, useMemo, useState } from "react";
import {
  Banner,
  BlockedDialog,
  Combobox,
  DataTable,
  Drawer,
  ErrorSummary,
  Field,
  PageError,
  Segmented,
  ServerErrorBanner,
  StateBox,
  TextInput,
  apiError,
  inr,
  notify,
  supportCode,
  type Column,
} from "@/components/kit";
import { centresApi, useCentres, useInvalidatePeople, useLocations } from "@/lib/m6/people";
import type { Centre } from "@/lib/m6-contract";
import { fieldErrs, type SetSetup, type SetupState } from "./shared";

export function CentresTab({ s, set, createNonce }: { s: SetupState; set: SetSetup; createNonce: number }) {
  const list = useCentres();
  const invalidate = useInvalidatePeople();
  const [form, setForm] = useState<{ centre: Centre | null } | null>(null);
  const [blocked, setBlocked] = useState<{ c: Centre; n: number } | null>(null);
  useEffect(() => {
    if (createNonce) setForm({ centre: null });
  }, [createNonce]);
  const rows = useMemo(() => [...(list.data?.items ?? [])].sort((a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt) || a.name.localeCompare(b.name)), [list.data]);

  const archive = async (c: Centre) => {
    try {
      if (c.archivedAt) {
        await centresApi.restore(c.id);
        invalidate();
        notify.success(`${c.name} restored`);
        return;
      }
      await centresApi.archive(c.id);
      invalidate();
      notify.undo(`${c.name} archived`, async () => {
        await centresApi.restore(c.id);
        invalidate();
      });
    } catch (e) {
      const a = apiError(e);
      if (a.code === "CENTRE_HAS_BATCHES") setBlocked({ c, n: (a.details as { batches?: number } | null)?.batches ?? c.batches });
      else notify.error("Couldn't archive the centre", { description: a.message ?? undefined });
    }
  };

  const columns: Array<Column<Centre>> = [
    {
      key: "name",
      header: "Centre",
      render: (c) => (
        <span className="col" style={{ minWidth: 0 }}>
          <span className="sm k-ell" style={{ fontWeight: 600 }}>
            {c.name} {c.archivedAt && <span className="badge b-grey" style={{ height: 20, marginLeft: 4 }}>Archived</span>}
          </span>
          <span className="xs muted k-ell">{c.address || "—"}</span>
        </span>
      ),
    },
    { key: "code", header: "Code", width: 120, tdClass: "idc", render: (c) => <span className="k-ell" style={{ display: "block" }}>{c.code || "—"}</span> },
    { key: "city", header: "City", width: 110, render: (c) => c.city },
    { key: "mode", header: "Mode", width: 100, render: (c) => <span className="badge b-grey">{c.mode === "online" ? "Online" : "Offline"}</span> },
    { key: "batches", header: "Batches", width: 90, align: "num", render: (c) => inr(c.batches) },
    { key: "students", header: "Students", width: 96, align: "num", render: (c) => inr(c.students) },
  ];

  if (list.isError && !list.data) return <PageError what="centres" code={supportCode("ORG", list.error)} onRetry={() => void list.refetch()} />;
  return (
    <>
      <Banner tone="info" title="Institutes are now called centres." dismissKey={s.moved ? undefined : "setup-centres-renamed"}>
        Nothing moved: old links to Institutes open this tab.
      </Banner>
      <DataTable<Centre>
        ariaLabel="Centres"
        status={list.isLoading ? "loading" : list.isError ? "error" : "ready"}
        rows={rows}
        rowKey={(c) => c.id}
        columns={columns}
        onRowClick={(c) => setForm({ centre: c })}
        rowMenuLabel={(c) => `More for ${c.name}`}
        rowMenu={(c) => [
          { label: "Edit", onSelect: () => setForm({ centre: c }) },
          { label: "Show its batches", onSelect: () => set({ tab: "batches", centre: c.id }) },
          { label: c.archivedAt ? "Restore" : "Archive", danger: !c.archivedAt, onSelect: () => void archive(c) },
        ]}
        empty={
          <StateBox
            compact
            title="No centres yet"
            body="A centre is where students study: a branch or online. Batches belong to a centre."
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ centre: null })}>
                + New centre
              </button>
            }
          />
        }
        error={{ title: "Couldn't load centres", code: supportCode("ORG", list.error), onRetry: () => void list.refetch() }}
      />
      <span className="xs muted">A centre with batches can&rsquo;t be archived. Move its batches to another centre first.</span>
      <CentreForm open={!!form} centre={form?.centre ?? null} onClose={() => setForm(null)} onSaved={invalidate} />
      <BlockedDialog
        open={!!blocked}
        onOpenChange={(o) => !o && setBlocked(null)}
        closeLabel="Close"
        title={`Can't archive ${blocked?.c.name ?? "this centre"} yet`}
        description={`${blocked?.n === 1 ? "1 batch is" : `${inr(blocked?.n ?? 0)} batches are`} at this centre. Move them to another centre first.`}
        action={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const id = blocked!.c.id;
              setBlocked(null);
              set({ tab: "batches", centre: id });
            }}
          >
            Show the {blocked?.n === 1 ? "batch" : "batches"}
          </button>
        }
      />
    </>
  );
}

function CentreForm({ open, centre, onClose, onSaved }: { open: boolean; centre: Centre | null; onClose: () => void; onSaved: () => void }) {
  const edit = !!centre;
  const loc = useLocations();
  const cities = loc.data?.cities ?? ["Indore"];
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState<string | null>(null);
  const [mode, setMode] = useState<"offline" | "online">("offline");
  const [base, setBase] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [srv, setSrv] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const v = [centre?.name ?? "", centre?.code ?? "", centre?.address ?? "", centre?.city ?? (cities.length === 1 ? cities[0]! : null), centre?.mode ?? "offline"] as const;
    setName(v[0]);
    setCode(v[1]);
    setAddress(v[2]);
    setCity(v[3]);
    setMode(v[4]);
    setBase(JSON.stringify(v));
    setErrs({});
    setSrv(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, centre]);
  const dirty = JSON.stringify([name, code, address, city, mode]) !== base;
  const save = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Give the centre a name";
    if (!city) e.city = "Pick a city";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setSrv(null);
    try {
      const body = { name: name.trim(), code: code.trim() || null, address: address.trim() || null, city: city!, mode };
      if (edit) await centresApi.update(centre!.id, body);
      else await centresApi.create(body);
      onSaved();
      notify.success(edit ? "Centre saved" : `Centre ${name.trim()} added`);
      onClose();
    } catch (err) {
      const a = apiError(err);
      const f = fieldErrs(err);
      if (a.code === "INVALID_CITY") f.city = `Pick ${((a.details as { allowed?: string[] } | null)?.allowed ?? cities).join(" or ")}`;
      if (a.code === "NAME_TAKEN") f.name = "A centre with this name exists";
      if (Object.keys(f).length) setErrs(f);
      else setSrv(a.message ?? "The server didn't answer.");
    } finally {
      setBusy(false);
    }
  };
  const ids: Record<string, [string, string]> = { name: ["cn", "Name"], code: ["cc", "Code"], address: ["ca", "Address"], city: ["cy", "City"], mode: ["cm", "Mode"] };
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={edit ? "Edit centre" : "New centre"}
      aria-label={edit ? "Edit centre" : "New centre"}
      dirty={dirty}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
            {busy ? "Saving…" : edit ? "Save centre" : "Add centre"}
          </button>
        </>
      }
    >
      <ErrorSummary fields={Object.keys(errs).map((k) => ({ id: ids[k]?.[0] ?? k, label: ids[k]?.[1] ?? k }))} />
      {srv && <ServerErrorBanner detail={srv} onRetry={save} />}
      <Field label="Name" htmlFor="cn" error={errs.name}>
        <TextInput id="cn" value={name} invalid={!!errs.name} placeholder="Vijay Nagar centre" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Code" optional htmlFor="cc" error={errs.code} hint="A short code for reports and exports.">
        <TextInput id="cc" value={code} mono placeholder="IND-VJN" style={{ textTransform: "none" }} onChange={(e) => setCode(e.target.value)} />
      </Field>
      <Field label="Address" optional htmlFor="ca" error={errs.address}>
        <TextInput id="ca" value={address} placeholder="Scheme 54, Vijay Nagar" onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <Field label="City" htmlFor="cy" error={errs.city}>
        <Combobox id="cy" aria-label="City" options={cities.map((c) => ({ value: c, label: c, end: loc.data?.states[0] }))} value={city} onChange={setCity} invalid={!!errs.city} noun="city" placeholder="Pick a city" />
      </Field>
      <Field label="Mode" group>
        <Segmented
          id="cm"
          ariaLabel="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "offline", label: "Offline" },
            { value: "online", label: "Online" },
          ]}
        />
      </Field>
    </Drawer>
  );
}
