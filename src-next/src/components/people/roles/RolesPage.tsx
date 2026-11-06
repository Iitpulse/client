"use client";
/*
  Admin-Roles board: permissions (matrix rows from GET /users/admin/permissions/catalog), unsaved (changed rows tinted,
  dark save bar), saved ("Teacher saved · 46 people updated"), admin-locked, members (search, table, pages),
  add-people, removed (Undo = add again), new-role ("Start from" copies a role), delete-blocked (ROLE_HAS_MEMBERS),
  delete (password re-auth), error, no-access. URL: ?role=<id>&view=members&q=&page=&new=1.
  M6 has no role scopes (M7b): the board's Scope column is not drawn.
*/
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { Topbar } from "@/components/admin/Topbar";
import {
  BlockedDialog,
  CheckBox,
  Combobox,
  DataTable,
  Field,
  InlineNote,
  KitDialog,
  NoAccess,
  PageError,
  PageSkeleton,
  Pagination,
  ReauthDialog,
  SearchBox,
  StateBox,
  TextInput,
  UnsavedChangesDialog,
  apiError,
  fmtDate,
  initials,
  inr,
  notify,
  supportCode,
  useFillHeight,
  useUrlState,
  type ComboOption,
} from "@/components/kit";
import { USER_TYPE_LABEL, auditApi, rolesApi, useCan, useCatalog, useRoleMembers, useRoles } from "@/lib/m6/people";
import type { PermissionCatalog, RoleListItem, RoleMembersResponse } from "@/lib/m6-contract";
import "./roles.css";

type Area = PermissionCatalog["areas"][number];

import { OwnerCard, ScopeDialog, scopeLabel, type RoleScope } from "@/components/m7b/role-scopes";

export function RolesPage() {
  const { can, loading, roleName } = useCan();
  const [s, set] = useUrlState({ role: "", view: "permissions", q: "", page: "1", new: "" });
  const roles = useRoles();
  const catalog = useCatalog();
  const canEdit = can("UPDATE_ROLE");
  const canCreate = can("CREATE_ROLE");
  const allowed = can("READ_ROLE");

  const list = roles.data?.items ?? [];
  const current = list.find((r) => r.id === s.role) ?? list.find((r) => r.name === s.role) ?? list.find((r) => r.system === "admin") ?? list[0];
  const [draft, setDraft] = useState<Set<string> | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const dirty = !!draft && !!current && !sameSet(draft, new Set(current.permissions));
  useEffect(() => setDraft(null), [current?.id]);
  // the role list beside the table is held to the table's height and scrolls itself (owner table rule)
  const [asideRef, asideH] = useFillHeight<HTMLElement>();

  const pick = (id: string, view = "permissions") => {
    if (dirty && id !== current?.id) setPending(id);
    else set({ role: id, view, q: "", page: "1" });
  };

  const body = () => {
    if (loading || roles.isLoading || catalog.isLoading) return <PageSkeleton rows={10} />;
    if (!allowed) return <NoAccess what="roles" role={roleName} />;
    if (roles.isError || catalog.isError || !current || !catalog.data)
      return <PageError what="roles" body="Everyone keeps the access they had. Try again in a moment." code={supportCode("ROL", roles.error ?? catalog.error)} onRetry={() => (roles.refetch(), catalog.refetch())} />;
    return (
      <div className="rl-wrap">
        <aside ref={asideRef} className="card rl-aside" aria-label="Roles" style={asideH !== null ? { maxHeight: asideH, overflowY: "auto", overscrollBehavior: "contain" } : undefined}>
          <div className="rl-list">
            {list.map((r) => (
              <button key={r.id} type="button" className={`rl-ri${r.id === current.id ? " on" : ""}`} aria-current={r.id === current.id || undefined} onClick={() => pick(r.id)}>
                <span className="col" style={{ minWidth: 0 }}>
                  <span className="sm" style={{ fontWeight: 600 }}>
                    {r.name}
                  </span>
                  <span className="xs muted">{subOf(r)}</span>
                </span>
                <span className={`badge ${r.id === current.id ? "b-navy" : "b-grey"}`}>{inr(r.members)}</span>
              </button>
            ))}
          </div>
        </aside>
        <RoleCard
          key={current.id}
          role={current}
          catalog={catalog.data}
          view={s.view === "members" ? "members" : "permissions"}
          onView={(v) => set({ view: v, q: "", page: "1" })}
          q={s.q}
          page={Number(s.page) || 1}
          onQ={(q) => set({ q })}
          onPage={(p) => set({ page: String(p) })}
          canEdit={canEdit}
          canDelete={can("DELETE_ROLE")}
          draft={draft}
          setDraft={setDraft}
          dirty={dirty}
          onDeleted={() => set({ role: "", view: "permissions" })}
        />
      </div>
    );
  };

  return (
    <>
      <Topbar
        title="Roles & access"
        actions={
          allowed && canCreate ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => set({ new: "1" })}>
              + New role
            </button>
          ) : undefined
        }
      />
      <main className="col" style={{ padding: "22px 28px 40px", gap: 16 }}>
        {/* M7b (board Admin-RoleScopes): the institute's Owner, Transfer ownership… for the Owner */}
        {allowed && <OwnerCard />}
        {body()}
      </main>
      <NewRoleDialog open={s.new === "1" && allowed && canCreate} roles={list} onClose={() => set({ new: "" })} onCreated={(id) => set({ new: "", role: id, view: "permissions" })} />
      <UnsavedChangesDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        what={`Your changes to ${current?.name ?? "this role"} aren't saved.`}
        onDiscard={() => {
          const id = pending!;
          setPending(null);
          setDraft(null);
          set({ role: id, view: "permissions", q: "", page: "1" });
        }}
      />
    </>
  );
}

const scopeOf = (r: RoleListItem) => (r as RoleListItem & { scope?: RoleScope | null }).scope ?? null;
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
function subOf(r: RoleListItem) {
  if (r.system === "admin") return "Every permission";
  if (r.system === "student") return "Given by their batch";
  return r.description || `${r.permissions.length} permissions`;
}
function descOf(r: RoleListItem) {
  if (r.description) return `${r.members === 1 ? "1 person" : `${inr(r.members)} people`} · ${r.description}`;
  if (r.system === "admin") return `${r.members === 1 ? "1 person" : `${inr(r.members)} people`} · can do everything`;
  if (r.system === "student") return "Every student, through their batch";
  if (!r.members) return "Nobody has this role";
  return `${r.members === 1 ? "1 person" : `${inr(r.members)} people`} · ${r.permissions.length} permissions`;
}
/** "teachers" for the save bar ("they apply to all 46 teachers"). */
const membersNoun = (r: RoleListItem) => (r.members === 1 ? `the 1 person with ${r.name}` : `all ${inr(r.members)} people with ${r.name}`);

function RoleCard({
  role,
  catalog,
  view,
  onView,
  q,
  page,
  onQ,
  onPage,
  canEdit,
  canDelete,
  draft,
  setDraft,
  dirty,
  onDeleted,
}: {
  role: RoleListItem;
  catalog: PermissionCatalog;
  view: "permissions" | "members";
  onView: (v: "permissions" | "members") => void;
  q: string;
  page: number;
  onQ: (q: string) => void;
  onPage: (p: number) => void;
  canEdit: boolean;
  canDelete: boolean;
  draft: Set<string> | null;
  setDraft: (s: Set<string> | null) => void;
  dirty: boolean;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const locked = role.locked || role.system === "admin";
  const student = role.system === "student";
  const editable = canEdit && !locked;
  const saved = new Set(role.permissions);
  const perms = draft ?? saved;
  const [busy, setBusy] = useState(false);
  const [dlg, setDlg] = useState<"rename" | "blocked" | "delete" | "add" | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const toggle = (key: string) => {
    if (!editable) return;
    const n = new Set(perms);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    setDraft(n);
  };
  const changedKeys = new Set([...perms].filter((k) => !saved.has(k)).concat([...saved].filter((k) => !perms.has(k))));
  const save = async () => {
    setBusy(true);
    try {
      const r = await rolesApi.update(role.id, { permissions: [...perms] });
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["m6", "people", "roles"] });
      notify.success(`${role.name} saved`, { description: `${r.membersAffected === 1 ? "1 person" : `${inr(r.membersAffected)} people`} updated` });
    } catch (e) {
      const a = apiError(e);
      notify.error(`Couldn't save ${role.name}`, { description: a.code === "ROLE_LOCKED" ? "The Admin role can't be changed." : a.message ?? "Your changes are kept.", retry: save });
    } finally {
      setBusy(false);
    }
  };
  const members = useRoleMembers(view === "members" ? role.id : null, q, page);
  // owner rule (6 Nov): the permissions table takes the screen height left, only its rows scroll (Members has its own DataTable)
  const [fillRef, fillH] = useFillHeight<HTMLElement>(view === "permissions");
  const fills = fillH !== null;

  return (
    <section ref={fillRef} className={`card col rise rl-main${fills ? " k-fill" : ""}`} style={{ height: fillH ?? undefined }}>
      <div className="pad-lg row between wrap" style={{ gap: 10, borderBottom: "1px solid var(--line-2)" }}>
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="h2">{role.name}</span>
            {locked && <span className="badge b-grey">Locked</span>}
          </div>
          <span className="sm muted">{descOf(role)}</span>
          {/* M7b role scopes: whole institute / some centres / some batches / own batches */}
          {!student && (
            <span className="row xs" style={{ gap: 6, marginTop: 4 }} data-testid="role-scope">
              <span className="muted">Scope:</span>
              <span className="badge b-grey">{scopeLabel(scopeOf(role))}</span>
              {editable && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setScopeOpen(true)}>
                  Edit scope…
                </button>
              )}
            </span>
          )}
        </div>
        {!locked && !student && (
          <div className="row" style={{ gap: 4 }}>
            {canEdit && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDlg("rename")}>
                Rename
              </button>
            )}
            {canDelete && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--red-600)" }} onClick={() => setDlg(role.members > 0 ? "blocked" : "delete")}>
                Delete role
              </button>
            )}
          </div>
        )}
      </div>
      <div className="underline-tabs" style={{ padding: "0 20px" }} role="tablist">
        <button type="button" role="tab" aria-selected={view === "permissions"} className={`utab${view === "permissions" ? " on" : ""}`} onClick={() => onView("permissions")}>
          Permissions
        </button>
        <button type="button" role="tab" aria-selected={view === "members"} className={`utab${view === "members" ? " on" : ""}`} onClick={() => onView("members")}>
          Members <span className="badge b-grey" style={{ height: 20, marginLeft: 4 }}>{inr(role.members)}</span>
        </button>
      </div>

      {view === "permissions" ? (
        <div className="col" style={fills ? { flex: "1 1 auto", minHeight: 0 } : undefined}>
          {locked && (
            <div style={{ padding: "14px 20px 0" }}>
              <InlineNote>Admin always has every permission, so nobody can lock the institute out. Make a new role for anything narrower.</InlineNote>
            </div>
          )}
          {student && (
            <div style={{ padding: "14px 20px 0" }}>
              <InlineNote>Students get this role from their batch. What they can open in the student app follows these permissions.</InlineNote>
            </div>
          )}
          <div className="scrollx k-fill-body" style={fills ? { flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" } : undefined}>
            <div className="rl-mx" role="table" aria-label={`Permissions for ${role.name}`}>
              <div className="tr h k-fill-head" role="row">
                {["Area", "View", "Create", "Edit", "Delete", "Also"].map((h) => (
                  <span key={h} className="th" role="columnheader">
                    {h}
                  </span>
                ))}
              </div>
              {catalog.areas.map((a) => (
                <MatrixRow key={a.area} a={a} perms={perms} locked={locked} editable={editable} toggle={toggle} changed={changedKeys} />
              ))}
              <FixedRow area="Templates" hint="Exam UI templates · uses the Exams permissions" note="Follows Exams: change it there" boxes={["READ_EXAM", "CREATE_EXAM", "UPDATE_EXAM", "DELETE_EXAM"]} perms={perms} locked={locked} />
              <FixedRow area="Centres" hint="Setup → Centres" note="Admin only · not part of a role" boxes={null} perms={perms} locked={locked} />
            </div>
          </div>
          {dirty ? (
            <div className="rl-save" role="region" aria-label="Unsaved changes">
              <span className="sm">
                <b>
                  {changedKeys.size === 1 ? "1 change" : `${changedKeys.size} changes`} not saved
                </b>{" "}
                · they apply to {membersNoun(role)} when saved
              </span>
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDraft(null)} disabled={busy}>
                  Discard
                </button>
                <button type="button" className="btn btn-sm btn-white" onClick={save} disabled={busy}>
                  {busy ? "Saving…" : `Save ${role.name}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="row" style={{ gap: 10, padding: "14px 20px" }}>
              <span className="xs muted">Changes apply the next time each person opens a page. Every change is recorded in the audit log.</span>
            </div>
          )}
        </div>
      ) : (
        <Members role={role} data={members.data} status={members.isLoading ? "loading" : members.isError ? "error" : "ready"} retry={() => members.refetch()} error={members.error} q={q} onQ={onQ} page={page} onPage={onPage} canEdit={canEdit && !student} onAdd={() => setDlg("add")} />
      )}

      <RenameDialog open={dlg === "rename"} role={role} onClose={() => setDlg(null)} />
      <BlockedDialog
        open={dlg === "blocked"}
        onOpenChange={() => setDlg(null)}
        title={`Can't delete ${role.name} yet`}
        description={`${role.members === 1 ? "1 person has" : `${inr(role.members)} people have`} this role. Give them another role first, then delete it.`}
        closeLabel="Close"
        action={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setDlg(null);
              onView("members");
            }}
          >
            Show the {role.members === 1 ? "1 person" : `${inr(role.members)} people`}
          </button>
        }
      />
      <ReauthDialog
        open={dlg === "delete"}
        onOpenChange={() => setDlg(null)}
        title={`Delete role ${role.name}?`}
        description="Nobody has it now. Its permissions are removed for good."
        confirmLabel="Delete role"
        passwordHint={null}
        onConfirm={async (t) => {
          try {
            await rolesApi.remove(role.id, t);
          } catch (e) {
            if (apiError(e).code === "ROLE_HAS_MEMBERS") {
              setDlg("blocked");
              await qc.invalidateQueries({ queryKey: ["m6", "people", "roles"] });
              return;
            }
            throw e;
          }
          await qc.invalidateQueries({ queryKey: ["m6", "people", "roles"] });
          notify.success(`Role ${role.name} deleted`);
          onDeleted();
        }}
      />
      <AddPeopleDialog open={dlg === "add"} role={role} members={members.data} onClose={() => setDlg(null)} />
      <ScopeDialog open={scopeOpen} onOpenChange={setScopeOpen} role={{ id: role.id, name: role.name, scope: scopeOf(role) }} />
    </section>
  );
}

function Box({ k, label, aria, perms, locked, editable, toggle }: { k: string; label?: string; aria: string; perms: Set<string>; locked: boolean; editable: boolean; toggle: (k: string) => void }) {
  const on = locked || perms.has(k);
  return (
    <label className={`rl-ck${editable ? "" : " dis"}`}>
      <input type="checkbox" checked={on} disabled={!editable} aria-label={aria} onChange={() => toggle(k)} />
      <CheckBox on={on} disabled={!editable && locked} />
      {label}
    </label>
  );
}

function MatrixRow({ a, perms, locked, editable, toggle, changed }: { a: Area; perms: Set<string>; locked: boolean; editable: boolean; toggle: (k: string) => void; changed: Set<string> }) {
  const crud = [a.create, a.edit, a.delete] as Array<string | null>;
  const noCrud = crud.every((x) => !x);
  // AI tools: a single key with no view and no create/edit/delete sits in the View column (board).
  const viewBoxes = a.view.length ? a.view : noCrud ? a.also : [];
  const also = a.view.length || !noCrud ? a.also : [];
  const keys = [...viewBoxes.map((v) => v.key), ...crud.filter(Boolean), ...also.map((x) => x.key)] as string[];
  const chg = keys.some((k) => changed.has(k));
  const lower = a.area.toLowerCase();
  return (
    <div className={`tr${chg ? " chg" : ""}`} role="row">
      <span className="td rl-area" role="cell">
        {a.area}
        <span>{a.hint}</span>
      </span>
      <span className="td col" role="cell" style={{ gap: 2 }}>
        {viewBoxes.map((v) => (
          <Box key={v.key} k={v.key} label={v.label} aria={viewBoxes.length > 1 ? `View ${v.label.toLowerCase()} ${lower}` : `${v.label} ${a.view.length ? lower : ""}`.trim()} perms={perms} locked={locked} editable={editable} toggle={toggle} />
        ))}
      </span>
      {crud.map((k, i) => (
        <span key={i} className="td" role="cell">
          {k ? <Box k={k} aria={`${["Create", "Edit", "Delete"][i]} ${lower}`} perms={perms} locked={locked} editable={editable} toggle={toggle} /> : <span className="rl-dash">—</span>}
        </span>
      ))}
      <span className="td" role="cell">
        <span className="rl-extras">
          {also.map((x) => (
            <Box key={x.key} k={x.key} label={x.label} aria={x.label} perms={perms} locked={locked} editable={editable} toggle={toggle} />
          ))}
        </span>
      </span>
    </div>
  );
}

/** Rows the board draws that are not their own keys: Templates (Exams keys, read-only here), Centres (admin only). */
function FixedRow({ area, hint, note, boxes, perms, locked }: { area: string; hint: string; note: string; boxes: string[] | null; perms: Set<string>; locked: boolean }) {
  return (
    <div className="tr" role="row">
      <span className="td rl-area" role="cell">
        {area}
        <span>{hint}</span>
      </span>
      {boxes ? (
        boxes.map((k, i) => (
          <span key={k} className="td" role="cell">
            <span className="rl-ck dis">
              <CheckBox on={locked || perms.has(k)} disabled />
              {i === 0 && "View"}
            </span>
          </span>
        ))
      ) : (
        <>
          <span className="td" role="cell" />
          {[0, 1, 2].map((i) => (
            <span key={i} className="td" role="cell">
              <span className="rl-dash">—</span>
            </span>
          ))}
        </>
      )}
      <span className="td" role="cell">
        <span className="xs muted" style={{ minHeight: 28, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Lock className="size-3" aria-hidden />
          {note}
        </span>
      </span>
    </div>
  );
}

type Member = RoleMembersResponse["items"][number];
function Members({
  role,
  data,
  status,
  retry,
  error,
  q,
  onQ,
  page,
  onPage,
  canEdit,
  onAdd,
}: {
  role: RoleListItem;
  data: RoleMembersResponse | undefined;
  status: "loading" | "error" | "ready";
  retry: () => void;
  error: unknown;
  q: string;
  onQ: (q: string) => void;
  page: number;
  onPage: (p: number) => void;
  canEdit: boolean;
  onAdd: () => void;
}) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["m6", "people"] });
  const remove = async (m: Member) => {
    try {
      await rolesApi.removeMember(role.id, m.user.id);
      await refresh();
      notify.undo(`Removed ${m.user.name} from ${role.name}`, async () => {
        await rolesApi.addMembers(role.id, [m.user.id]);
        await refresh();
      });
    } catch (e) {
      notify.error(`Couldn't remove ${m.user.name}`, { description: apiError(e).message ?? undefined });
    }
  };
  const student = role.system === "student";
  return (
    <div className="col">
      <div className="row between wrap" style={{ gap: 10, padding: "14px 20px" }}>
        <SearchBox value={q} onChange={onQ} placeholder="Name or email" label="Search members" width={260} />
        {canEdit && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>
            + Add people
          </button>
        )}
        {student && <span className="xs muted">Students join this role through their batch.</span>}
      </div>
      <div style={{ borderTop: "1px solid var(--line-2)" }}>
        <DataTable<Member>
          ariaLabel="Members"
          status={status}
          rows={data?.items}
          rowKey={(m) => m.user.id}
          filtered={!!q}
          noMatch={<StateBox compact title={`Nobody called "${q}" has ${role.name}`} action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => onQ("")}>Clear search</button>} />}
          empty={<StateBox compact title={`Nobody has ${role.name} yet`} body={canEdit ? "Add people to give them these permissions." : undefined} action={canEdit ? <button type="button" className="btn btn-primary btn-sm" onClick={onAdd}>+ Add people</button> : undefined} />}
          error={{ title: "Couldn't load members", code: supportCode("ROL", error), onRetry: retry }}
          columns={[
            {
              key: "p",
              header: "Person",
              render: (m) => (
                <span className="k-who">
                  <span className="avatar">{initials(m.user.name)}</span>
                  <span className="col">
                    <span className="sm k-ell" style={{ fontWeight: 600 }}>
                      {m.user.name}
                    </span>
                    <span className="xs muted k-ell">{m.user.email}</span>
                  </span>
                </span>
              ),
            },
            { key: "t", header: "Type", width: 110, render: (m) => <span className="badge b-grey">{m.user.userType ? USER_TYPE_LABEL[m.user.userType] : "—"}</span> },
            { key: "b", header: "Batches", tablet: "hide", render: (m) => <span className="sm">{m.batches.length ? m.batches.map((b) => b.name).join(", ") : m.user.userType === "teacher" ? "No batch yet" : "—"}</span> },
            { key: "a", header: "Added", width: 100, render: (m) => <span className="sm muted">{m.addedAt ? fmtDate(m.addedAt).replace(/ \d{4}$/, "") : "—"}</span> },
            ...(canEdit
              ? [
                  {
                    key: "x",
                    header: <span className="sr-only">Actions</span>,
                    width: 100,
                    render: (m: Member) => (
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${m.user.name}`} onClick={() => remove(m)}>
                        Remove
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
          footer={data && data.pageInfo.total > 0 ? <Pagination page={page} pageSize={data.pageInfo.pageSize} total={data.pageInfo.total} onPage={onPage} /> : undefined}
        />
      </div>
    </div>
  );
}

function NewRoleDialog({ open, roles, onClose, onCreated }: { open: boolean; roles: RoleListItem[]; onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [from, setFrom] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName("");
      setDesc("");
      setFrom(null);
      setErr(null);
    }
  }, [open]);
  const opts: ComboOption[] = roles.filter((r) => r.system !== "student").map((r) => ({ value: r.id, label: r.name, end: `${r.permissions.length} permissions` }));
  const create = async () => {
    if (!name.trim()) return setErr("Type a name");
    if (roles.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) return setErr("A role with this name exists");
    setBusy(true);
    try {
      const r = await rolesApi.create({ name: name.trim(), description: desc.trim() || null, copyFromRoleId: from });
      await qc.invalidateQueries({ queryKey: ["m6", "people", "roles"] });
      notify.success(`Role ${r.role.name} created`);
      onCreated(r.role.id);
    } catch (e) {
      const a = apiError(e);
      if (a.code === "NAME_TAKEN") setErr("A role with this name exists");
      else setErr(a.message ?? "Couldn't create the role. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog open={open} onOpenChange={(o) => !o && onClose()} title="New role" busy={busy} initialFocus="nr">
      <form className="col" style={{ gap: 14 }} noValidate onSubmit={(e) => (e.preventDefault(), void create())}>
        <Field label="Name" htmlFor="nr" error={err}>
          <TextInput id="nr" value={name} invalid={!!err} onChange={(e) => (setName(e.target.value), setErr(null))} maxLength={60} />
        </Field>
        <Field label="What it's for" optional htmlFor="nd">
          <TextInput id="nd" value={desc} placeholder="e.g. Checks questions before they go live" onChange={(e) => setDesc(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Start from" htmlFor="nf" hint="Copies its permissions. You can change them next.">
          <Combobox id="nf" options={opts} value={from} onChange={setFrom} clearable placeholder="Nothing: start empty" noun="role" aria-label="Start from" />
        </Field>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            {busy ? "Creating…" : "Create role"}
          </button>
        </div>
      </form>
    </KitDialog>
  );
}

function RenameDialog({ open, role, onClose }: { open: boolean; role: RoleListItem; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(role.name);
  const [desc, setDesc] = useState(role.description ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName(role.name);
      setDesc(role.description ?? "");
      setErr(null);
    }
  }, [open, role]);
  const save = async () => {
    if (!name.trim()) return setErr("Type a name");
    setBusy(true);
    try {
      await rolesApi.update(role.id, { name: name.trim(), description: desc.trim() || null });
      await qc.invalidateQueries({ queryKey: ["m6", "people", "roles"] });
      notify.success("Role renamed");
      onClose();
    } catch (e) {
      const a = apiError(e);
      setErr(a.code === "NAME_TAKEN" ? "A role with this name exists" : a.message ?? "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog open={open} onOpenChange={(o) => !o && onClose()} title={`Rename ${role.name}`} description="People with this role see the new name at once." busy={busy} closeButton initialFocus="rn">
      <form className="col" style={{ gap: 14 }} noValidate onSubmit={(e) => (e.preventDefault(), void save())}>
        <Field label="Name" htmlFor="rn" error={err}>
          <TextInput id="rn" value={name} invalid={!!err} onChange={(e) => (setName(e.target.value), setErr(null))} maxLength={60} />
        </Field>
        <Field label="What it's for" optional htmlFor="rd">
          <TextInput id="rd" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={120} />
        </Field>
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </KitDialog>
  );
}

function AddPeopleDialog({ open, role, members, onClose }: { open: boolean; role: RoleListItem; members: RoleMembersResponse | undefined; onClose: () => void }) {
  const qc = useQueryClient();
  const [pick, setPick] = useState<string | null>(null);
  const [people, setPeople] = useState<ComboOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const memberIds = useMemo(() => new Set((members?.items ?? []).map((m) => m.user.id)), [members]);
  useEffect(() => {
    if (open) {
      setPick(null);
      setErr(null);
    }
  }, [open]);
  const search = async (q: string) => {
    setLoading(true);
    try {
      const r = await auditApi.people(q);
      setPeople(
        r.items
          .filter((p) => p.userType && p.userType !== "student")
          .map((p) => ({
            value: p.id,
            label: p.name,
            icon: <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(p.name)}</span>,
            sub: memberIds.has(p.id) ? `Already ${/^[aeiou]/i.test(role.name) ? "an" : "a"} ${role.name}` : p.role ?? (p.userType ? USER_TYPE_LABEL[p.userType] : undefined),
            end: p.userType ? USER_TYPE_LABEL[p.userType] : undefined,
            disabled: memberIds.has(p.id),
          }))
      );
    } catch {
      setPeople([]);
    } finally {
      setLoading(false);
    }
  };
  const name = people.find((p) => p.value === pick)?.label;
  const add = async () => {
    if (!pick) return setErr("Pick a person");
    setBusy(true);
    try {
      await rolesApi.addMembers(role.id, [pick]);
      await qc.invalidateQueries({ queryKey: ["m6", "people"] });
      notify.success(`Added ${name} to ${role.name}`);
      onClose();
    } catch (e) {
      const a = apiError(e);
      setErr(a.code === "STUDENT_NOT_ALLOWED" ? "Students can't be added to a role" : a.message ?? "Couldn't add. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog open={open} onOpenChange={(o) => !o && onClose()} title={`Add people to ${role.name}`} busy={busy} closeButton initialFocus="am">
      <Field label="Search staff" htmlFor="am" error={err}>
        <Combobox id="am" options={people} value={pick} onChange={(v) => (setPick(v), setErr(null))} onSearch={search} loading={loading} noun="person" placeholder="Type a name" aria-label="Search staff" invalid={!!err} />
      </Field>
      <span className="xs muted">Students can&rsquo;t be added here; their access comes from their batch.</span>
      <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={add} disabled={busy || !pick}>
          {name ? `Add ${name}` : "Add"}
        </button>
      </div>
    </KitDialog>
  );
}
