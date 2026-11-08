"use client";

/*
  M10 question library pieces for the bank (boards Admin-Library, Library-Branding, Admin-LibraryPublish):
  the source badge ("IIT-PULSE library" with the mark, or a neutral "Library"; "· copied", "Copy · licensed",
  "Licence ended"), the source tabs, the read-only and add-on-ended banners, the not-entitled upsell card, the
  library no-match state, the edit-locked tip, and the IIT-PULSE staff "Library" column.
*/
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Doodle, Segmented, StateBox } from "@/components/kit";
import { authV2 } from "@/lib/m7b-auth";
import {
  blockedWhy,
  fmtDay,
  isLibraryRow,
  licenceEnded,
  SUPPORT_MAIL,
  type LibraryRow,
  type PublishCheckItem,
  type SourceTab,
} from "@/lib/m10-library";

const fmt = (n: number) => n.toLocaleString("en-IN");

export function LockIcon({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className={`shrink-0 ${className}`}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** The small IIT-PULSE mark on branded library badges (board Library-Branding). */
export function LibMark() {
  return (
    <span aria-hidden className="inline-block size-3.5 shrink-0 rounded-[4px] bg-brand text-center font-sans text-[8px] leading-[14px] font-bold text-white">
      IP
    </span>
  );
}

const SRC = "inline-flex h-6 max-w-full items-center gap-[5px] rounded-full px-2 text-xs font-semibold whitespace-nowrap";

/** "IIT-PULSE library" with the mark, or a neutral "Library" with a lock (branding off): bank rows and picker rows. */
export function LibraryBadge({ label, branded }: { label: string; branded: boolean }) {
  return (
    <span className={`${SRC} border border-[#C3C6EF] text-brand ${branded ? "bg-[#F1F2FC]" : "bg-white"}`}>
      {branded ? <LibMark /> : <LockIcon size={11} />}
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Source badge of a bank row; null for the institute's own questions when nothing else is worth saying. */
export function SourceBadge({ row, label, branded, mineLabel = true }: { row: LibraryRow; label: string; branded: boolean; mineLabel?: boolean }) {
  if (isLibraryRow(row)) {
    if (row.copied)
      return (
        <span className={`${SRC} bg-[#E9F6EE] text-[#0B4D27]`} title={`Your copy: ${row.copied}`}>
          {branded ? <LibMark /> : <LockIcon size={11} />}
          <span className="truncate">{label} · copied</span>
        </span>
      );
    return <LibraryBadge label={label} branded={branded} />;
  }
  if (row.licence) {
    if (licenceEnded(row)) return <span className={`${SRC} bg-[#EEF0F5] text-muted`}>Licence ended</span>;
    return <span className={`${SRC} bg-[#E9F6EE] text-[#0B4D27]`}>Copy · licensed</span>;
  }
  return mineLabel ? <span className={`${SRC} bg-[#F5F6FA] text-[#2B2F4A]`}>My bank</span> : null;
}

/** "All sources · N | My bank · N | IIT-PULSE library · N" (lock and no count when not entitled). */
export function SourceTabs({
  value,
  onChange,
  counts,
  label,
  locked,
}: {
  value: SourceTab;
  onChange: (v: SourceTab) => void;
  counts: { all: number; mine: number; library: number } | null;
  label: string;
  locked: boolean;
}) {
  const n = (k: keyof NonNullable<typeof counts>) => (counts ? fmt(k === "all" && locked ? counts.mine : counts[k]) : "…");
  return (
    <div className="row between wrap gap-2.5">
      <Segmented<SourceTab>
        ariaLabel="Source"
        value={value}
        onChange={onChange}
        options={[
          { value: "all", label: "All sources", count: n("all") },
          { value: "mine", label: "My bank", count: n("mine") },
          {
            value: "library",
            label: (
              <span className="inline-flex items-center gap-1">
                {locked && <LockIcon />}
                {label}
              </span>
            ),
            count: locked ? undefined : n("library"),
          },
        ]}
      />
      {!locked && <span className="xs muted">Search, the test builder and the duplicate check look in both</span>}
    </div>
  );
}

/** Navy note under the tabs (board `.bn.navy`). */
function NavyNote({ children, role = "note" }: { children: React.ReactNode; role?: string }) {
  return (
    <div className="row items-center gap-3 rounded-[12px] border border-[#C3C6EF] bg-[#F1F2FC] px-4 py-2.5 text-[13px] leading-[1.45] text-ink" role={role}>
      <LockIcon size={16} className="text-brand" />
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

export function LibraryReadOnlyBanner({ label }: { label: string }) {
  return (
    <NavyNote>
      <b className="font-semibold">{label} · read-only.</b> Add these to your tests as they are. To edit one, translate it or write your own solution, copy it to your bank first. Part of your plan&apos;s Question library add-on.
    </NavyNote>
  );
}

/** "You can see which questions are in the library, but your role, Teacher, can't publish." */
export function NoPublishBanner({ roleName }: { roleName: string | null }) {
  return (
    <NavyNote>
      You can see which questions are in the library, but {roleName ? <>your role, {roleName},</> : "your role"} can&apos;t publish. Ask an Admin or a content editor.
    </NavyNote>
  );
}

/** Amber banner when the institute's add-on ended (status.addOnEnded). */
export function AddOnEndedBanner({ endedAt, copies, owner }: { endedAt?: string | null; copies: number; owner: boolean }) {
  const d = fmtDay(endedAt);
  return (
    <div className="row items-center gap-3 rounded-[12px] border border-[#F1D29A] bg-[#FFF4E2] px-4 py-2.5 text-[13px] leading-[1.45] text-[#5C3600]" role="status">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="shrink-0">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="min-w-0 flex-1">
        <b className="font-semibold">Your Question library add-on ended{d ? ` on ${d}` : ""}.</b> Library questions are hidden
        {copies > 0 ? `, and the ${fmt(copies)} ${copies === 1 ? "copy" : "copies"} you made no longer show in search or new tests` : ""}. Tests made before keep them, and results are untouched.
      </span>
      {owner && (
        <a className="btn btn-secondary h-[30px] shrink-0 text-xs" href={`mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent("Renew our Question library add-on")}`}>
          Ask IIT-PULSE to renew
        </a>
      )}
    </div>
  );
}

/** The Owner's name for "Ask your Owner" (GET /users/admin/owner; may be refused for non-admins: then no name). */
function useOwnerContact(enabled: boolean) {
  return useQuery({ queryKey: ["users", "owner"], enabled, staleTime: 5 * 60_000, retry: false, queryFn: () => authV2.owner() });
}

/** Board state not-entitled: the upsell card in place of the list. */
export function NotEntitledCard({ owner, institute, price }: { owner: boolean; institute: string | null; price?: string | null }) {
  const contact = useOwnerContact(!owner);
  const o = contact.data;
  const ask = `mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(`Question library add-on${institute ? ` for ${institute}` : ""}`)}`;
  return (
    <section className="card">
      <StateBox
        doodle={<Doodle size={72} />}
        title="The IIT-PULSE library isn't in your plan"
        body={
          <span className="col items-center gap-2">
            <span className="max-w-[500px]">
              Ready-made questions with solutions, written and checked by IIT-PULSE faculty, for the exams your institute runs. Add them to tests as they are, or copy one to your bank and change it.
            </span>
            {price && <span className="font-semibold text-ink">{price}</span>}
          </span>
        }
        action={
          <span className="col items-center gap-2">
            <span className="row gap-2">
              {owner ? (
                <a className="btn btn-primary" href={ask}>
                  Ask IIT-PULSE to add it
                </a>
              ) : o?.email ? (
                <a className="btn btn-primary" href={`mailto:${o.email}?subject=${encodeURIComponent("Could we add the IIT-PULSE question library?")}`}>
                  Ask your Owner
                </a>
              ) : (
                <span className="btn btn-primary" aria-disabled="true" title="Your institute's Owner can ask IIT-PULSE to add it">
                  Ask your Owner
                </span>
              )}
              {owner && (
                <Link href="/billing" className="btn btn-ghost">
                  See your plan
                </Link>
              )}
            </span>
            <span className="xs muted max-w-[440px]">
              {owner ? "Only you, as the Owner, can ask for it." : `Only your Owner${o?.name ? `, ${o.name},` : ""} can ask IIT-PULSE to add it.`} Your own bank isn&apos;t affected either way.
            </span>
          </span>
        }
      />
    </section>
  );
}

/** Board state no-match on the library tab. */
export function LibraryNoMatch({ query, detail, label, onClear, onMine }: { query: string; detail: string; label: string; onClear: () => void; onMine: () => void }) {
  return (
    <StateBox
      title={query ? `No library questions match "${query}"` : "No library questions match"}
      body={`${detail ? `${detail}. ` : ""}The ${label === "Library" ? "library" : label} is written for each exam separately.`}
      action={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClear}>
            Clear filters
          </button>
          <button type="button" className="btn btn-ghost" onClick={onMine}>
            Search my bank only
          </button>
        </>
      }
    />
  );
}

export const LIBRARY_EDIT_TIP = "Library questions are read-only. Copy it to your bank to edit, translate or change the solution.";
export const LICENCE_ENDED_TIP = "The licence for this copy ended with the Question library add-on. It can't be edited or added to new tests; you can still delete it.";

/** Edit button that can't edit: aria-disabled, a click shows the tip (board state edit-locked). */
export function LockedEdit({ tip, open, onToggle }: { tip: string; open: boolean; onToggle: () => void }) {
  const id = React.useId();
  return (
    <span className="relative">
      <button type="button" className="btn btn-ghost btn-sm text-[#8A8FA8]" aria-disabled="true" aria-describedby={open ? id : undefined} onClick={onToggle}>
        <LockIcon size={11} />
        Edit
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute top-10 right-0 z-[6] w-[250px] rounded-lg bg-ink px-2.5 py-2 text-xs leading-[1.4] whitespace-normal text-white">
          {tip}
        </span>
      )}
    </span>
  );
}

/** IIT-PULSE staff "Library" column: Not in library / In library · v1 / … · edited since / Blocked + why. */
export function PublishCell({ row, check }: { row: LibraryRow; check?: PublishCheckItem }) {
  const p = row.published;
  if (check?.status === "blocked" && check.blockedBy[0])
    return (
      <span className="col min-w-0 gap-px">
        <span className="text-xs font-semibold text-[#9A5800]">Blocked</span>
        <span className="xs muted truncate" title={check.blockedBy.map(blockedWhy).join("; ")}>
          {blockedWhy(check.blockedBy[0])}
        </span>
      </span>
    );
  if (!p) return <span className="text-xs font-medium text-muted">Not in library</span>;
  return (
    <span className="col min-w-0 gap-px">
      <span className="truncate text-xs font-semibold text-brand" title={p.libraryId}>
        In library · v{p.version}
        {p.editedSince ? " · edited since" : ""}
      </span>
      {p.editedSince && <span className="xs muted">Publish again to update it</span>}
    </span>
  );
}
