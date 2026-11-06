"use client";
/*
  Staff re-accept (board Admin-Security, "terms-changed"): GET /users/me carries legal {current, accepted,
  needsAcceptance}; when true, "We've updated our terms" stays open until the staff member accepts
  (POST /users/me/legal-acceptance {terms, privacy}) or signs out. The pages live on the student app (/terms, /privacy).
  Contract: api-ai docs/m6-api.md (M6 review additions, legal) and api-users docs/m7b-auth.md.
*/
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KitDialog, apiError } from "@/components/kit";
import { apiUsers } from "@/lib/api";
import { useMe } from "@/lib/m6/people";
import { useAuthStore } from "@/stores";
import { useStudentPortal } from "@/lib/brand";

type Versions = { terms: string; privacy: string };
type Legal = { current: Versions; accepted: (Versions & { acceptedAt: string }) | null; needsAcceptance: boolean };

export function StaffTermsPrompt() {
  const me = useMe();
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const PORTAL = useStudentPortal(); // the institute's own student app (its /terms, /privacy)
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [override, setOverride] = useState<Versions | null>(null);
  const legal = (me.data as unknown as { legal?: Legal } | undefined)?.legal;
  if (!legal?.needsAcceptance) return null;
  const current = override ?? legal.current;
  const updated = !!legal.accepted;

  const accept = async () => {
    setBusy(true);
    setErr(null);
    try {
      await apiUsers.post("/me/legal-acceptance", current);
      await qc.invalidateQueries({ queryKey: ["m6", "me"] });
    } catch (e) {
      const a = apiError(e);
      if (a.code === "LEGAL_VERSION_CHANGED") {
        const c = (a.details as { current?: Versions } | null)?.current;
        if (c) setOverride(c);
        setAgree(false);
        setErr("The terms changed a moment ago. Read the new ones, then accept.");
      } else setErr(a.message || "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KitDialog
      open
      onOpenChange={() => {}}
      title={updated ? "We've updated our terms" : "Our terms and privacy policy"}
      description={
        updated
          ? `The Terms of Use and Privacy Policy changed (version ${current.terms}). Please read and accept them to keep using the console.`
          : "Please read the Terms of Use and the Privacy Policy and accept them to keep using the console."
      }
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              logout();
              window.location.replace("/login");
            }}
            disabled={busy}
          >
            Sign out
          </button>
          <button type="button" className="btn btn-primary" onClick={accept} disabled={busy || !agree}>
            {busy ? "Saving…" : "Accept and continue"}
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }} data-testid="staff-terms">
        <span className="sm">
          <a href={`${PORTAL}/terms`} target="_blank" rel="noopener">
            Read the Terms of Use
          </a>{" "}
          ·{" "}
          <a href={`${PORTAL}/privacy`} target="_blank" rel="noopener">
            Read the Privacy Policy
          </a>
        </span>
        <label className="row sm" style={{ gap: 8, alignItems: "flex-start" }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
          <span>I&rsquo;ve read and accept the Terms of Use and Privacy Policy (version {current.terms}).</span>
        </label>
        {err && (
          <span className="sm" role="alert" style={{ color: "var(--cl-red-700, #C40000)", fontWeight: 600 }}>
            {err}
          </span>
        )}
      </div>
    </KitDialog>
  );
}
