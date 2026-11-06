"use client";
/*
  Admin-Users board (views list, teachers, selected, detail, history, add-student/teacher/staff, edit, errors, delete,
  deactivate-teacher, anonymise-teacher, erase, no-match, empty, error, no-access; desktop + 1024 tablet).
  One list for all types (`tab` = type); search, filters, sort and page in the URL; the drawers too (`id`, `add`,
  `edit`), so old links (/users/new, /users/:id, /users/:id/edit) redirect here.
*/
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import { SeatMeter } from "@/components/brand/InstituteBanners";
import {
  BulkBar,
  Combobox,
  DataTable,
  DateField,
  Doodle,
  EmptyState,
  Field,
  FilterBar,
  FilterChip,
  KitDialog,
  NoAccess,
  Pagination,
  ReauthDialog,
  SearchBox,
  Segmented,
  StateBox,
  Truncate,
  apiError,
  fmtDate,
  fmtPhone,
  inr,
  initials,
  notify,
  plural,
  supportCode,
  useUrlState,
  type Column,
  type RowMenuItem,
} from "@/components/kit";
import type { UserDetail, UserListItem } from "@/lib/m6-contract";
import { m6Users } from "@/lib/m6/client";
import { saveBlob, useAllBatches, useCan, useCentres, useInvalidatePeople, useLocations, useUsers, usersApi } from "@/lib/m6/people";
import { UserDeleteDialogs, deleteToast, type DeleteKind } from "./DeleteDialogs";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { UserFormDrawer } from "./UserFormDrawer";
import { TABS, isRemoved, isStaffType, tabOf } from "./shared";

const DEFAULTS = { tab: "student", q: "", batch: "", centre: "", standard: "", status: "active", page: "1", size: "25", sort: "name", id: "", view: "details", add: "", edit: "" };
const SORT_LABEL: Record<string, string> = { name: "name", created: "date added", lastActive: "last active", validTill: "valid till" };

export function UsersPage() {
  const [s, set] = useUrlState(DEFAULTS);
  const { can, me, loading: meLoading, roleName } = useCan();
  const teacherView = me?.userType === "teacher";
  const tab = tabOf(teacherView ? "student" : s.tab);
  const type = tab.type;
  const page = Math.max(1, Number(s.page) || 1);
  const size = Number(s.size) || 25;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [del, setDel] = useState<{ user: UserDetail; kind: DeleteKind } | null>(null);
  const [bulk, setBulk] = useState<"move" | "extend" | "delete" | null>(null);
  const [editUser, setEditUser] = useState<UserDetail | null>(null);
  const invalidate = useInvalidatePeople();

  const allowed = can("READ_USER");
  const list = useUsers(
    {
      type,
      q: s.q || undefined,
      batchId: type === "student" ? s.batch || undefined : undefined,
      centreId: s.centre || undefined,
      standard: type === "student" ? s.standard || undefined : undefined,
      status: s.status as "active" | "deactivated" | "all",
      page,
      pageSize: size,
      sort: s.sort as "name",
    },
    allowed
  );
  const batches = useAllBatches(allowed).data?.items ?? [];
  const centres = useCentres().data?.items ?? [];
  const loc = useLocations().data;
  const data = list.data;
  const rows = data?.items;
  const counts = data?.counts;
  const filterCount = (type === "student" && s.batch ? 1 : 0) + (s.centre ? 1 : 0) + (type === "student" && s.standard ? 1 : 0) + (s.status !== "active" ? 1 : 0);
  const filtered = !!s.q || filterCount > 0;
  const clearSel = () => setSelected(new Set());

  const columns: Array<Column<UserListItem>> = useMemo(() => {
    const name: Column<UserListItem> = {
      key: "name",
      header: tab.col,
      width: "26%",
      tabletWidth: "34%",
      sortKey: "name",
      render: (r) => {
        const removed = isRemoved(r);
        return (
          <span className="k-who">
            <span className="avatar" style={removed ? { background: "var(--line-2)", color: "var(--muted)" } : undefined}>
              {removed ? "—" : initials(r.name)}
            </span>
            <span className="col">
              <span className="sm k-ell" style={{ fontWeight: 600, ...(removed ? { color: "var(--muted)", fontStyle: "italic" } : {}) }}>
                {r.name}
              </span>
              <Truncate text={removed ? "Details erased" : r.email} className="xs muted" />
            </span>
          </span>
        );
      },
    };
    const phone: Column<UserListItem> = { key: "phone", header: "Phone", width: 120, render: (r) => <span className="num">{fmtPhone(r.phone)}</span> };
    const centre: Column<UserListItem> = { key: "centre", header: "Centre", width: "13%", tablet: "hide", render: (r) => <Truncate text={r.centre?.name ?? (isStaffType(r.type) ? "All centres" : "—")} /> };
    const till: Column<UserListItem> = { key: "till", header: "Valid till", width: 112, sortKey: "validTill", render: (r) => <span className="num">{r.validTill ? fmtDate(r.validTill) : "—"}</span> };
    const status: Column<UserListItem> = {
      key: "status",
      header: "Status",
      width: 120,
      render: (r) =>
        isRemoved(r) ? <span className="badge b-grey">Removed</span> : <span className={`badge ${r.status === "active" ? "b-green" : "b-grey"}`}>{r.status === "active" ? "Active" : "Deactivated"}</span>,
    };
    if (type === "student")
      return [
        name,
        phone,
        { key: "batch", header: "Batch", render: (r) => <Truncate text={r.batch?.name ?? "—"} /> },
        { key: "class", header: "Class", width: 90, tablet: "hide", render: (r) => r.standard ?? "—" },
        centre,
        till,
        status,
      ];
    if (type === "teacher")
      return [
        name,
        phone,
        { key: "subjects", header: "Subjects", render: (r) => <Truncate text={r.subjects.map((x) => x.name).join(", ") || "—"} /> },
        { key: "batches", header: "Batches", width: 110, tablet: "hide", render: (r) => (r.batches.length ? <span title={r.batches.map((b) => b.name).join(", ")}>{plural(r.batches.length, "batch", "batches")}</span> : <span className="muted">No batch yet</span>) },
        centre,
        till,
        status,
      ];
    return [name, phone, { key: "roles", header: "Roles", render: (r) => <Truncate text={r.roles.map((x) => x.name).join(", ") || "—"} /> }, centre, till, status];
  }, [type, tab.col]);

  const openDetail = (id: string) => set({ id, view: "details", add: "", edit: "" });
  const rowMenu = (r: UserListItem): RowMenuItem[] => {
    const removed = isRemoved(r);
    const items: RowMenuItem[] = [{ label: "Open profile", onSelect: () => openDetail(r.id) }];
    if (can("UPDATE_USER") && !removed) {
      items.push({ label: "Edit", onSelect: () => set({ id: r.id, edit: "1" }) });
      items.push({
        label: "Reset password",
        onSelect: async () => {
          try {
            await usersApi.sendReset(r.email);
            notify.success("Reset link sent", { description: `To ${r.email}` });
          } catch (e) {
            notify.error("Couldn't send the reset link", { description: apiError(e).message ?? undefined });
          }
        },
      });
      if (type === "student") items.push({ label: "Move to batch…", onSelect: () => (setSelected(new Set([r.id])), setBulk("move")) });
      if (r.status === "deactivated") items.push({ label: "Make active", onSelect: () => runBulk("activate", [r.id]) });
    }
    if (can("DELETE_USER")) {
      if (!removed) items.push({ label: type === "student" ? "Deactivate & anonymise…" : "Deactivate…", danger: true, onSelect: () => openDelete(r.id, "delete") });
      items.push({ label: "Erase everything…", danger: true, onSelect: () => openDelete(r.id, "erase") });
    }
    return items;
  };
  const openDelete = async (id: string, kind: DeleteKind) => {
    try {
      setDel({ user: await fetchUser(id), kind });
    } catch (e) {
      notify.error("Couldn't open this person", { description: apiError(e).message ?? undefined });
    }
  };

  const runBulk = async (action: "moveBatch" | "extendValidity" | "deactivate" | "activate", ids: string[], extra?: { batchId?: string; validTill?: string }) => {
    try {
      const r = await usersApi.bulk({ ids, action, ...extra });
      invalidate();
      clearSel();
      const n = r.done.length;
      const failed = r.failed.length ? ` · ${r.failed.length} couldn't` : "";
      if (action === "deactivate") notify.undo(`Deactivated ${plural(n, tab.noun)}${failed}`, () => usersApi.bulk({ ids: r.done, action: "activate" }).then(invalidate));
      else if (action === "activate") notify.success(`${plural(n, tab.noun)} made active${failed}`);
      else if (action === "moveBatch") notify.success(`Moved ${plural(n, tab.noun)}${failed}`, { description: batches.find((b) => b.id === extra?.batchId)?.name });
      else notify.success(`Extended ${plural(n, tab.noun)}${failed}`, { description: extra?.validTill ? `Valid till ${fmtDate(extra.validTill)}` : undefined });
    } catch (e) {
      notify.error("Couldn't change them", { description: apiError(e).message ?? undefined });
    }
  };

  const exportCsv = async () => {
    const id = notify.working("Exporting students");
    try {
      saveBlob(await usersApi.exportStudents([...selected]), `students-${new Date().toISOString().slice(0, 10)}.csv`);
      notify.dismiss(id);
      notify.success(`Exported ${plural(selected.size, "student")}`);
    } catch (e) {
      notify.dismiss(id);
      notify.error("Couldn't export", { description: apiError(e).message ?? undefined });
    }
  };

  const addKind = s.add === "teacher" ? "teacher" : s.add === "staff" ? "staff" : "student";
  const canAdd = can("CREATE_USER") && !teacherView;
  const noun = type === "teacher" ? "teacher" : isStaffType(type) ? "person" : "student";
  const addHref = type === "teacher" ? "teacher" : isStaffType(type) ? "staff" : "student";

  const header = (
    <Topbar
      title={teacherView ? "My students" : "Users"}
      actions={
        allowed && canAdd ? (
          <>
            {!teacherView && type === "student" && <SeatMeter />}
            <Link href={`/users/import${type === "teacher" ? "?kind=teachers" : ""}`} className="btn btn-secondary btn-sm">
              <Upload className="size-3.5" aria-hidden />
              Import from Excel
            </Link>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => set({ add: addHref, id: "", edit: "" })}>
              + Add {noun}
            </button>
          </>
        ) : undefined
      }
    />
  );

  if (!meLoading && !allowed)
    return (
      <>
        {header}
        <main className="col" style={{ padding: "20px 28px 40px" }}>
          <NoAccess what="Users" role={roleName} />
        </main>
      </>
    );

  const filterDesc = [type === "student" && s.batch ? batches.find((b) => b.id === s.batch)?.name : null, s.centre ? centres.find((c) => c.id === s.centre)?.name : null, type === "student" && s.standard ? `class ${s.standard}` : null, s.status !== "active" ? (s.status === "all" ? "any status" : s.status) : null].filter(Boolean).join(", ");

  return (
    <>
      {header}
      <main className="col" style={{ padding: "20px 28px 40px", gap: 14 }}>
        {!teacherView && (
          <Segmented
            ariaLabel="User types"
            value={type}
            onChange={(v) => (clearSel(), set({ tab: v, batch: "", standard: "", sort: "name" }))}
            options={TABS.map((t) => ({ value: t.type, label: t.label, count: counts ? inr(counts[t.type]) : "…" }))}
          />
        )}
        <FilterBar
          activeCount={filterCount}
          onClearAll={() => set({ batch: "", centre: "", standard: "", status: "active" })}
          showLabel={data ? `Show ${plural(data.pageInfo.total, tab.noun)}` : undefined}
          search={<SearchBox value={s.q} onChange={(q) => set({ q })} placeholder="Name, email or phone" label="Search users" />}
        >
          {type === "student" && <FilterChip label="Batch" noun="batch" options={batches.map((b) => ({ value: b.id, label: b.name, end: inr(b.students) }))} value={s.batch || null} onChange={(v) => set({ batch: v ?? "" })} />}
          <FilterChip label="Centre" noun="centre" options={centres.map((c) => ({ value: c.id, label: c.name }))} value={s.centre || null} onChange={(v) => set({ centre: v ?? "" })} />
          {type === "student" && <FilterChip label="Class" noun="class" options={(loc?.standards ?? []).map((x) => ({ value: x, label: x }))} value={s.standard || null} onChange={(v) => set({ standard: v ?? "" })} />}
          <FilterChip
            label="Status"
            noun="status"
            clearable={false}
            options={[
              { value: "active", label: "active" },
              { value: "deactivated", label: "deactivated" },
              { value: "all", label: "any" },
            ]}
            value={s.status}
            onChange={(v) => set({ status: v ?? "active" })}
          />
        </FilterBar>
        <DataTable<UserListItem>
          ariaLabel={tab.label}
          status={list.isLoading || meLoading ? "loading" : list.isError ? "error" : "ready"}
          rows={rows}
          rowKey={(r) => r.id}
          columns={columns}
          onRowClick={(r) => openDetail(r.id)}
          rowClass={(r) => (isRemoved(r) ? "removed" : undefined)}
          selection={can("UPDATE_USER") ? { selected, onChange: setSelected, label: (r) => r.name } : undefined}
          sort={{ key: s.sort, dir: "asc", onSort: (k) => set({ sort: k }) }}
          rowMenu={rowMenu}
          rowMenuLabel={(r) => `More for ${r.name}`}
          filtered={filtered}
          error={{ title: `Couldn't load ${tab.label.toLowerCase()}`, body: "Nothing is lost. Try again in a moment.", code: supportCode("USR", list.error), onRetry: () => list.refetch() }}
          empty={
            <EmptyState
              title={`No ${tab.label.toLowerCase()} yet`}
              body={type === "student" ? "Add students one by one, import them from an Excel sheet, or share a batch's promo code so they sign up themselves." : `Add ${tab.label.toLowerCase()} one by one${type === "teacher" ? " or import them from Excel" : ""}.`}
              actions={
                canAdd ? (
                  <>
                    {(type === "student" || type === "teacher") && (
                      <Link href={`/users/import${type === "teacher" ? "?kind=teachers" : ""}`} className="btn btn-secondary btn-sm">
                        Import from Excel
                      </Link>
                    )}
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => set({ add: addHref })}>
                      + Add {noun}
                    </button>
                  </>
                ) : undefined
              }
            />
          }
          noMatch={
            <StateBox
              title={s.q ? `No ${tab.label.toLowerCase()} match "${s.q}"${filterDesc ? ` in ${filterDesc}` : ""}` : `No ${tab.label.toLowerCase()} in ${filterDesc}`}
              body="Check the spelling, or clear the filters."
              action={
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ q: "", batch: "", centre: "", standard: "", status: "active" })}>
                  Clear filters
                </button>
              }
            />
          }
          footer={
            data && data.pageInfo.total > 0 ? (
              <Pagination page={page} pageSize={size} total={data.pageInfo.total} onPage={(p) => set({ page: String(p) })} onPageSize={(n) => set({ size: String(n) })} sortLabel={SORT_LABEL[s.sort] ?? s.sort} />
            ) : undefined
          }
        />
      </main>

      <BulkBar
        count={selected.size}
        onClear={clearSel}
        selectAll={
          data && selected.size === rows?.length && data.pageInfo.total > selected.size ? { label: `Select all ${inr(data.pageInfo.total)}`, onClick: () => notify.success("Pick up to one page at a time", { description: "Bulk actions work on this page's rows" }) } : undefined
        }
      >
        {type === "student" && (
          <button type="button" className="btn btn-ghost" onClick={() => setBulk("move")}>
            Move to batch
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => setBulk("extend")}>
          Extend validity
        </button>
        {type === "student" && (
          <button type="button" className="btn btn-ghost" onClick={exportCsv}>
            Export CSV
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => runBulk("deactivate", [...selected])}>
          Deactivate
        </button>
        {can("DELETE_USER") && (
          <button type="button" className="btn btn-ghost danger" onClick={() => setBulk("delete")}>
            {type === "student" ? "Deactivate & anonymise" : "Delete"}
          </button>
        )}
      </BulkBar>

      <BulkMoveDialog open={bulk === "move"} count={selected.size} batches={batches.map((b) => ({ value: b.id, label: b.name, end: b.centre?.name }))} onClose={() => setBulk(null)} onMove={(batchId) => runBulk("moveBatch", [...selected], { batchId })} />
      <BulkExtendDialog open={bulk === "extend"} count={selected.size} noun={tab.noun} onClose={() => setBulk(null)} onExtend={(validTill) => runBulk("extendValidity", [...selected], { validTill })} />
      <ReauthDialog
        open={bulk === "delete"}
        onOpenChange={(o) => !o && setBulk(null)}
        width="w500"
        title={type === "student" ? `Deactivate and anonymise ${plural(selected.size, "student")}?` : `Deactivate ${plural(selected.size, tab.noun)}?`}
        description={type === "student" ? "Use this when students leave. Their scores stay in your results as Removed student." : "They can't sign in from now on. Their work and roles stay."}
        confirmLabel={type === "student" ? "Deactivate & anonymise" : "Deactivate"}
        onConfirm={async (t) => {
          const r = await usersApi.bulk({ ids: [...selected], action: "delete" }, t);
          invalidate();
          clearSel();
          notify.success(`${type === "student" ? "Anonymised" : "Deactivated"} ${plural(r.done.length, tab.noun)}`, { description: r.failed.length ? `${r.failed.length} couldn't (writing a test now)` : undefined });
        }}
      >
        {type === "student" && (
          <ul className="k-dl-list">
            <li>They can&rsquo;t sign in, and their test links stop working.</li>
            <li>Names show as <b>Removed student</b>; contact, school and parent details are erased.</li>
            <li>Attempts and scores stay in ranks and averages. This can&rsquo;t be undone.</li>
          </ul>
        )}
      </ReauthDialog>

      <UserDetailDrawer
        id={s.id && !s.edit ? s.id : null}
        tab={s.view === "history" ? "history" : "details"}
        onTab={(t) => set({ view: t })}
        onClose={() => set({ id: "", view: "details" })}
        onEdit={(u) => (setEditUser(u), set({ edit: "1" }))}
        onDelete={(u) => setDel({ user: u, kind: "delete" })}
        onErase={(u) => setDel({ user: u, kind: "erase" })}
      />
      <EditLoader id={s.edit ? s.id : null} cached={editUser} onLoaded={setEditUser} />
      <UserFormDrawer
        open={!!s.add || (!!s.edit && !!editUser && editUser.id === s.id)}
        onOpenChange={(o) => !o && set({ add: "", edit: "" })}
        kind={addKind}
        user={s.edit ? editUser : null}
        onSaved={(u, created) => {
          invalidate();
          setEditUser(u);
          if (created) set({ add: "", id: "", tab: u.type, edit: "" });
          else set({ edit: "", id: u.id, view: "details" });
        }}
      />
      <UserDeleteDialogs
        user={del?.user ?? null}
        kind={del?.kind ?? null}
        onKind={(k) => setDel((d) => (d ? { ...d, kind: k } : d))}
        onClose={() => setDel(null)}
        onDone={(action, u) => {
          setDel(null);
          invalidate();
          deleteToast(action, u);
          if (action === "erased") set({ id: "" });
        }}
      />
    </>
  );
}

/** Loads the person for `?id=…&edit=1` (old /users/:id/edit links) before the form opens. */
function EditLoader({ id, cached, onLoaded }: { id: string | null; cached: UserDetail | null; onLoaded: (u: UserDetail) => void }) {
  const need = !!id && cached?.id !== id;
  useEffect(() => {
    if (!need) return;
    fetchUser(id!)
      .then(onLoaded)
      .catch((e) => notify.error("Couldn't open this person", { description: apiError(e).message ?? undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, need]);
  return null;
}

async function fetchUser(id: string): Promise<UserDetail> {
  const d = (await m6Users.get(`/admin/users/${encodeURIComponent(id)}`)).data?.data;
  return (d?.user ?? d) as UserDetail;
}

function BulkMoveDialog({ open, count, batches, onClose, onMove }: { open: boolean; count: number; batches: Array<{ value: string; label: string; end?: string }>; onClose: () => void; onMove: (batchId: string) => Promise<void> }) {
  const [b, setB] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <KitDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Move ${plural(count, "student")} to another batch`}
      description="They see the new batch's tests from now on. Their past results stay."
      closeButton
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!b || busy}
            onClick={async () => {
              setBusy(true);
              await onMove(b!);
              setBusy(false);
              onClose();
            }}
          >
            Move {plural(count, "student")}
          </button>
        </>
      }
    >
      <Field label="Batch" htmlFor="bm-b">
        <Combobox id="bm-b" aria-label="Batch" options={batches} value={b} onChange={setB} placeholder="Pick a batch" noun="batch" />
      </Field>
    </KitDialog>
  );
}

function BulkExtendDialog({ open, count, noun, onClose, onExtend }: { open: boolean; count: number; noun: string; onClose: () => void; onExtend: (d: string) => Promise<void> }) {
  const [d, setD] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <KitDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Extend validity for ${plural(count, noun)}`}
      description="They can sign in until this date."
      closeButton
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!d || busy}
            onClick={async () => {
              setBusy(true);
              await onExtend(d!);
              setBusy(false);
              onClose();
            }}
          >
            Extend
          </button>
        </>
      }
    >
      <Field label="Valid till" htmlFor="be-d">
        <DateField id="be-d" aria-label="Valid till" value={d} onChange={setD} minDate={new Date().toISOString().slice(0, 10)} />
      </Field>
    </KitDialog>
  );
}

