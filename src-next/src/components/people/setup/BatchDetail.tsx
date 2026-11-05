"use client";
/* Admin-Setup `batch-detail`: counts, promo codes, teachers, next tests, and "Open N students in Users". */
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CopyCode, Drawer, InlineError, RowMenu, fmtDateTime, inr, initials, istParts } from "@/components/kit";
import { useBatch } from "@/lib/m6/people";
import { m6Tests, unwrap } from "@/lib/m6/client";
import type { AdminTestListResponse } from "@/lib/m6-contract";
import { mediumLabel } from "./shared";

function useBatchTests(batchId: string | null) {
  return useQuery({
    queryKey: ["m6", "people", "batch-tests", batchId],
    enabled: !!batchId,
    retry: false,
    queryFn: async () => unwrap<AdminTestListResponse>((await m6Tests.get("/admin/tests", { params: { batchId, pageSize: 100 } })).data),
  });
}

export function BatchDetail({
  batchId,
  onClose,
  onEdit,
  onArchive,
  onDelete,
  onAssign,
  canEdit,
  canDelete,
}: {
  batchId: string | null;
  onClose: () => void;
  onEdit: () => void;
  onArchive: (archived: boolean) => void;
  onDelete: () => void;
  onAssign: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const b = useBatch(batchId);
  const tests = useBatchTests(batchId);
  const batch = b.data;
  const now = istParts(Date.now());
  const items = tests.data?.items ?? [];
  const thisMonth = items.filter((t) => {
    if (!t.opensAt) return false;
    const p = istParts(t.opensAt);
    return p.y === now.y && p.m === now.m;
  }).length;
  const next = items
    .filter((t) => t.state === "scheduled" && t.opensAt)
    .sort((a, c) => a.opensAt!.localeCompare(c.opensAt!))
    .slice(0, 3);
  const teacherList = batch?.teacherList ?? [];
  const sub = batch ? [batch.centre?.name, mediumLabel(batch.medium), batch.exams.map((e) => e.name).join(", ")].filter(Boolean).join(" · ") : undefined;

  return (
    <Drawer
      open={!!batchId}
      onOpenChange={(o) => !o && onClose()}
      title={batch?.name ?? "Batch"}
      subtitle={sub}
      aria-label="Batch details"
      headerActions={
        batch && (canEdit || canDelete) ? (
          <>
            {canEdit && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
                Edit
              </button>
            )}
            <RowMenu
              label="More for this batch"
              items={[
                ...(canEdit ? [{ label: batch.archivedAt ? "Restore batch" : "Archive batch", onSelect: () => onArchive(!!batch.archivedAt) }] : []),
                ...(canDelete ? [{ label: "Delete batch…", danger: true, onSelect: onDelete }] : []),
              ]}
            />
          </>
        ) : undefined
      }
    >
      {b.isLoading && (
        <div className="col" style={{ gap: 12 }} aria-busy>
          <span className="skel" style={{ height: 72 }} />
          <span className="skel" style={{ height: 40 }} />
          <span className="skel" style={{ height: 120 }} />
        </div>
      )}
      {b.isError && <InlineError onRetry={() => void b.refetch()}>Couldn&rsquo;t load this batch</InlineError>}
      {batch && (
        <>
          {batch.archivedAt && <span className="badge b-grey" style={{ alignSelf: "flex-start" }}>Archived</span>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {[
              ["Students", inr(batch.students)],
              ["Teachers", inr(batch.teachers)],
              ["Tests this month", tests.isError ? "—" : tests.isLoading ? "…" : inr(thisMonth)],
            ].map(([k, v]) => (
              <div key={k} className="card pad col" style={{ gap: 2 }}>
                <span className="xs muted">{k}</span>
                <span className="h2 num">{v}</span>
              </div>
            ))}
          </div>
          <div className="col" style={{ gap: 8 }}>
            <span className="eyebrow">Promo codes</span>
            {batch.promoCodes.length ? (
              <div className="row wrap" style={{ gap: 6 }}>
                {batch.promoCodes.map((c) => (
                  <CopyCode key={c.code} code={c.code} bad={!c.valid} />
                ))}
              </div>
            ) : (
              <span className="sm muted">No promo code: students can&rsquo;t sign up to this batch themselves.</span>
            )}
            <span className="xs muted">
              {batch.joinedWithCodeThisMonth === 1 ? "1 student" : `${inr(batch.joinedWithCodeThisMonth)} students`} joined with a code this month
            </span>
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="row between">
              <span className="eyebrow">Teachers</span>
              {canEdit && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onAssign}>
                  Assign
                </button>
              )}
            </div>
            {teacherList.length === 0 && <span className="sm muted">No teacher yet. Teachers see this batch&rsquo;s students and results once assigned.</span>}
            {teacherList.slice(0, 6).map((t) => (
              <div key={t.id} className="su-trow">
                <span className="avatar">{initials(t.name)}</span>
                <span className="sm grow">{t.name}</span>
                <span className="xs muted">{t.subjects.map((s) => s.name).join(", ")}</span>
              </div>
            ))}
            {teacherList.length > 6 && <span className="xs muted">+ {teacherList.length - 6} more</span>}
          </div>
          <div className="col" style={{ gap: 6 }}>
            <span className="eyebrow">Next tests</span>
            {tests.isError ? (
              <span className="sm muted">Tests aren&rsquo;t available right now.</span>
            ) : next.length ? (
              next.map((t) => (
                <div key={t.testId} className="row between sm" style={{ gap: 12 }}>
                  <Link href={`/tests/${t.testId}/edit`} className="k-ell">
                    {t.name}
                  </Link>
                  <span className="muted" style={{ whiteSpace: "nowrap" }}>
                    {fmtDateTime(t.opensAt, "short")}
                  </span>
                </div>
              ))
            ) : (
              <span className="sm muted">{tests.isLoading ? "Loading…" : "Nothing scheduled."}</span>
            )}
          </div>
          {batch.students > 0 && (
            <Link href={`/users?batch=${encodeURIComponent(batch.id)}`} className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>
              Open {inr(batch.students)} {batch.students === 1 ? "student" : "students"} in Users
            </Link>
          )}
        </>
      )}
    </Drawer>
  );
}
