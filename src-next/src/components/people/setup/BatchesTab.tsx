"use client";
/*
  Admin-Setup Batches tab: "N teachers have no batch" banner, search + Centre/Medium chips (URL), the batch table with
  promo codes (amber when a legacy code isn't 6 characters), detail and form drawers, assign-teachers dialog, and the
  delete family: Delete = password (ReauthDialog) with "Archive instead"; Archive runs at once with Undo.
*/
import { useEffect, useMemo, useState } from "react";
import {
  Banner,
  CopyCode,
  DataTable,
  EmptyState,
  FilterBar,
  FilterChip,
  Pagination,
  PageError,
  ReauthDialog,
  SearchBox,
  StateBox,
  apiError,
  inr,
  notify,
  supportCode,
  type Column,
} from "@/components/kit";
import { batchesApi, useBatchList, useCentres, useInvalidatePeople } from "@/lib/m6/people";
import type { BatchListItem } from "@/lib/m6-contract";
import { AssignTeachers } from "./AssignTeachers";
import { BatchDetail } from "./BatchDetail";
import { BatchForm } from "./BatchForm";
import { mediumLabel, type SetSetup, type SetupState } from "./shared";

export function BatchesTab({ s, set, createNonce, can }: { s: SetupState; set: SetSetup; createNonce: number; can: (...k: string[]) => boolean }) {
  const page = Math.max(1, Number(s.page) || 1);
  const size = [25, 50, 100].includes(Number(s.size)) ? Number(s.size) : 25;
  const list = useBatchList({ q: s.q, centreId: s.centre, medium: s.medium, page, pageSize: size });
  const centres = useCentres();
  const invalidate = useInvalidatePeople();
  const [form, setForm] = useState<{ id: string | null } | null>(null);
  const [assign, setAssign] = useState<{ preselect: string | null } | null>(null);
  const [del, setDel] = useState<BatchListItem | { id: string; name: string; students: number } | null>(null);
  useEffect(() => {
    if (createNonce) setForm({ id: null });
  }, [createNonce]);

  const data = list.data;
  const filtered = !!(s.q || s.centre || s.medium);
  const activeCount = (s.centre ? 1 : 0) + (s.medium ? 1 : 0);
  const canEdit = can("UPDATE_BATCH");
  const canDelete = can("DELETE_BATCH");
  const centreOpts = useMemo(() => (centres.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })), [centres.data]);

  const archive = async (id: string, name: string, restoring: boolean) => {
    try {
      if (restoring) {
        await batchesApi.restore(id);
        invalidate();
        notify.success(`${name} restored`);
      } else {
        await batchesApi.archive(id);
        invalidate();
        notify.undo(`${name} archived`, async () => {
          await batchesApi.restore(id);
          invalidate();
        });
      }
    } catch (e) {
      notify.error(restoring ? "Couldn't restore the batch" : "Couldn't archive the batch", { description: apiError(e).message ?? undefined });
    }
  };

  const columns: Array<Column<BatchListItem>> = [
    {
      key: "name",
      header: "Batch",
      render: (b) => (
        <span className="col" style={{ minWidth: 0 }}>
          <span className="sm k-ell" style={{ fontWeight: 600 }}>
            {b.name} {b.archivedAt && <span className="badge b-grey" style={{ height: 20, marginLeft: 4 }}>Archived</span>}
          </span>
          <span className="xs muted k-ell">{b.exams.map((e) => e.name).join(", ") || "No exam yet"}</span>
        </span>
      ),
    },
    { key: "centre", header: "Centre", width: "17%", render: (b) => <span className="k-ell" style={{ display: "block" }}>{b.centre?.name ?? "—"}</span> },
    { key: "medium", header: "Medium", width: 96, tablet: "hide", render: (b) => mediumLabel(b.medium) },
    {
      key: "codes",
      header: "Promo codes",
      width: "21%",
      tabletWidth: "24%",
      render: (b) =>
        b.promoCodes.length ? (
          <span className="row wrap" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <CopyCode code={b.promoCodes[0]!.code} bad={!b.promoCodes[0]!.valid} />
            {b.promoCodes.length > 1 && <span className="xs muted">+{b.promoCodes.length - 1} more</span>}
          </span>
        ) : (
          <span className="muted">—</span>
        ),
    },
    { key: "students", header: "Students", width: 96, tabletWidth: 84, align: "num", render: (b) => inr(b.students) },
    { key: "teachers", header: "Teachers", width: 96, tabletWidth: 84, align: "num", render: (b) => inr(b.teachers) },
  ];

  if (list.isError && !data) return <PageError what="batches" body="Students can still sign in and write tests. Try again in a moment." code={supportCode("ORG", list.error)} onRetry={() => void list.refetch()} />;
  if (data && data.summary.batches === 0 && !filtered)
    return (
      <>
        <EmptyState
          title="No batches yet"
          body="A batch groups students who take the same tests. Each batch gets a 6-character promo code that students type when they sign up."
          actions={
            can("CREATE_BATCH") ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setForm({ id: null })}>
                + New batch
              </button>
            ) : undefined
          }
        />
        <BatchForm open={!!form} batchId={form?.id ?? null} onClose={() => setForm(null)} />
      </>
    );

  const unassigned = data?.unassignedTeachers ?? [];
  return (
    <>
      {unassigned.length > 0 && canEdit && (
        <Banner
          tone="warn"
          title={unassigned.length === 1 ? "1 teacher has no batch." : `${unassigned.length} teachers have no batch.`}
          action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssign({ preselect: null })}>
              Assign teachers
            </button>
          }
        >
          {unassigned.length === 1 ? "They can't see any students until you assign them." : "They can't see any students until you assign them."}
        </Banner>
      )}
      <FilterBar
        activeCount={activeCount}
        onClearAll={() => set({ centre: "", medium: "" })}
        showLabel={data ? `Show ${inr(data.pageInfo.total)} batches` : undefined}
        search={<SearchBox value={s.q} onChange={(q) => set({ q })} placeholder="Batch name or promo code" label="Search batches" width={260} />}
        right={data && <span className="sm muted">{`${inr(data.summary.batches)} batches · ${inr(data.summary.students)} students · ${inr(data.summary.teachers)} teachers`}</span>}
      >
        <FilterChip label="Centre" noun="centre" options={centreOpts} value={s.centre || null} onChange={(v) => set({ centre: v ?? "" })} valueLabel={s.centre} />
        <FilterChip
          label="Medium"
          noun="medium"
          options={[
            { value: "english", label: "English" },
            { value: "hindi", label: "Hindi" },
          ]}
          value={s.medium || null}
          onChange={(v) => set({ medium: v ?? "" })}
        />
      </FilterBar>
      <DataTable<BatchListItem>
        ariaLabel="Batches"
        status={list.isLoading ? "loading" : list.isError ? "error" : "ready"}
        rows={data?.items}
        rowKey={(b) => b.id}
        columns={columns}
        onRowClick={(b) => set({ batch: b.id })}
        rowClass={(b) => (b.archivedAt ? "muted" : undefined)}
        rowMenuLabel={(b) => `More for ${b.name}`}
        rowMenu={(b) => [
          { label: "Open", onSelect: () => set({ batch: b.id }) },
          ...(canEdit ? [{ label: "Edit", onSelect: () => setForm({ id: b.id }) }, { label: b.archivedAt ? "Restore" : "Archive", onSelect: () => void archive(b.id, b.name, !!b.archivedAt) }] : []),
          ...(canDelete ? [{ label: "Delete batch…", danger: true, onSelect: () => setDel(b) }] : []),
        ]}
        filtered={filtered}
        noMatch={
          <StateBox
            compact
            title={s.q ? `No batches match "${s.q}"` : "No batches match these filters"}
            body="Check the spelling, or clear the filters."
            action={
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => set({ q: "", centre: "", medium: "" })}>
                Clear filters
              </button>
            }
          />
        }
        error={{ title: "Couldn't load batches", code: supportCode("ORG", list.error), onRetry: () => void list.refetch() }}
        footer={
          data && (
            <Pagination
              page={page}
              pageSize={size}
              total={data.pageInfo.total}
              onPage={(p) => set({ page: String(p) })}
              onPageSize={(n) => set({ size: String(n) })}
              sortLabel="name"
              extra={
                data.invalidCodes > 0 ? (
                  <span className="xs" style={{ color: "var(--amber)", fontWeight: 600 }}>
                    {data.invalidCodes === 1 ? "1 code can't be used: it isn't 6 characters" : `${data.invalidCodes} codes can't be used: they aren't 6 characters`}
                  </span>
                ) : undefined
              }
            />
          )
        }
      />
      <BatchDetail
        batchId={s.batch || null}
        onClose={() => set({ batch: "" })}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => setForm({ id: s.batch })}
        onArchive={(archived) => {
          const b = data?.items.find((x) => x.id === s.batch);
          void archive(s.batch, b?.name ?? "Batch", archived);
        }}
        onDelete={() => {
          const b = data?.items.find((x) => x.id === s.batch);
          setDel(b ?? { id: s.batch, name: "this batch", students: 0 });
        }}
        onAssign={() => (unassigned.length ? setAssign({ preselect: s.batch }) : setForm({ id: s.batch }))}
      />
      <BatchForm open={!!form} batchId={form?.id ?? null} onClose={() => setForm(null)} />
      <AssignTeachers open={!!assign} onClose={() => setAssign(null)} teachers={unassigned} preselect={assign?.preselect} />
      <ReauthDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete batch ${del?.name ?? ""}?`}
        description={`${del?.students ? (del.students === 1 ? "1 student loses" : `${inr(del.students)} students lose`) : "Its students lose"} access to its tests and results. Their past answers are kept. Archive instead if the batch has just finished.`}
        confirmLabel="Delete batch"
        secondary={
          canEdit && del ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const d = del;
                setDel(null);
                void archive(d.id, d.name, false);
              }}
            >
              Archive instead
            </button>
          ) : undefined
        }
        onConfirm={async (token) => {
          await batchesApi.remove(del!.id, token);
          invalidate();
          if (s.batch === del!.id) set({ batch: "" });
          notify.success(`Batch ${del!.name} deleted`);
        }}
      />
    </>
  );
}
