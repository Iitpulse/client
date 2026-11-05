"use client";
/*
  Admin-Setup board (canvas v166): Batches & setup with four tabs (Batches, Exams, Subjects & chapters, Centres) in the
  URL (?tab=). Old links /batches, /exams, /subjects and /institutes redirect here (Institutes → Centres). States:
  each tab's loading/empty/error, and no access for teachers and roles without the setup permissions.
*/
import { Suspense, useState } from "react";
import { Topbar } from "@/components/admin/Topbar";
import { NoAccess, PageSkeleton, useUrlState } from "@/components/kit";
import { useCan } from "@/lib/m6/people";
import { BatchesTab } from "@/components/people/setup/BatchesTab";
import { CentresTab } from "@/components/people/setup/CentresTab";
import { ExamsTab } from "@/components/people/setup/ExamsTab";
import { SubjectsTab } from "@/components/people/setup/SubjectsTab";
import { SETUP_DEFAULTS } from "@/components/people/setup/shared";
import "@/components/people/setup/setup.css";

type Tab = "batches" | "exams" | "subjects" | "centres";
const TABS: Array<{ key: Tab; label: string; add: string; keys: string[]; create: string[] }> = [
  { key: "batches", label: "Batches", add: "New batch", keys: ["READ_BATCH"], create: ["CREATE_BATCH"] },
  { key: "exams", label: "Exams", add: "New exam", keys: ["READ_EXAM"], create: ["CREATE_EXAM"] },
  { key: "subjects", label: "Subjects & chapters", add: "New subject", keys: ["READ_SUBJECT"], create: ["CREATE_SUBJECT"] },
  { key: "centres", label: "Centres", add: "New centre", keys: [], create: [] },
];

function SetupInner() {
  const [s, set] = useUrlState(SETUP_DEFAULTS);
  const { can, me, loading, roleName } = useCan();
  const [nonce, setNonce] = useState<Record<Tab, number>>({ batches: 0, exams: 0, subjects: 0, centres: 0 });
  const admin = me?.userType === "admin";
  // Centres are admin only (catalog: "Admin only · not part of a role")
  const visible = TABS.filter((t) => (t.key === "centres" ? admin : can(...t.keys)));
  const noAccess = !loading && (!me || me.userType === "teacher" || visible.length === 0);
  const tab = (visible.find((t) => t.key === s.tab) ?? visible[0])?.key ?? "batches";
  const cur = TABS.find((t) => t.key === tab)!;
  const canAdd = !noAccess && (tab === "centres" ? admin : can(...cur.create));

  return (
    <>
      <Topbar
        title="Batches & setup"
        actions={
          canAdd && !loading ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setNonce((n) => ({ ...n, [tab]: n[tab] + 1 }))}>
              + {cur.add}
            </button>
          ) : undefined
        }
      />
      {!noAccess && (
        <div className="su-tabs">
          <div className="underline-tabs" role="tablist" aria-label="Setup">
            {(loading ? TABS : visible).map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`utab ${tab === t.key ? "on" : ""}`}
                onClick={() => set({ tab: t.key, q: "", centre: t.key === "batches" ? s.centre : "", medium: "", batch: "", moved: "" })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <main className="su-main" role="tabpanel" aria-label={cur.label}>
        {loading ? (
          <PageSkeleton />
        ) : noAccess ? (
          <NoAccess what="batches and setup" role={roleName} />
        ) : tab === "batches" ? (
          <BatchesTab s={s} set={set} can={can} createNonce={nonce.batches} />
        ) : tab === "exams" ? (
          <ExamsTab s={s} set={set} can={can} createNonce={nonce.exams} />
        ) : tab === "subjects" ? (
          <SubjectsTab s={s} set={set} can={can} createNonce={nonce.subjects} />
        ) : (
          <CentresTab s={s} set={set} createNonce={nonce.centres} />
        )}
      </main>
    </>
  );
}

export default function SetupPage() {
  return (
    <Suspense>
      <SetupInner />
    </Suspense>
  );
}
