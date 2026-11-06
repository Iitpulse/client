"use client";
/*
  Platform-Impersonation "visiting" / "end-visit": the read-only banner over the whole admin app during a support visit.
  Reads GET /platform/support-visit (minutes left, refreshed every minute), logs each page at POST
  /platform/support-visit/pages, and "End visit" (confirm) calls POST /platform/support-visit/end. Nothing shows
  outside a support visit.
*/
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Eye } from "lucide-react";
import { auth } from "@/lib/session";
import { SUPPORT_VISIT_ENDED_PATH, supportVisitApi, type SupportVisitState } from "@/lib/support-visit";
import { ConfirmDialog } from "@/components/kit";

export function SupportVisitBanner() {
  const path = usePathname();
  const [on] = useState(() => auth.isSupportVisit());
  const [v, setV] = useState<SupportVisitState | null>(null);
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    if (!on) return;
    let live = true;
    const load = async () => {
      const t = auth.getToken();
      if (!t) return void (window.location.href = SUPPORT_VISIT_ENDED_PATH);
      try {
        const r = await supportVisitApi.state(t);
        if (!live) return;
        if (!r.visit.active) window.location.href = SUPPORT_VISIT_ENDED_PATH;
        else setV(r.visit);
      } catch (e) {
        const s = (e as { status?: number }).status;
        if (s === 401 || s === 403 || s === 410) window.location.href = SUPPORT_VISIT_ENDED_PATH;
      }
    };
    void load();
    const iv = setInterval(load, 60_000);
    return () => {
      live = false;
      clearInterval(iv);
    };
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const t = auth.getToken();
    const p = path.split("?")[0] || "/";
    if (t && /^\/[A-Za-z0-9/_\-.]*$/.test(p)) void supportVisitApi.page(t, p).catch(() => undefined);
  }, [on, path]);

  if (!on) return null;
  return (
    <>
      <div className="sv-bnr" role="status" data-testid="support-visit-banner">
        <Eye className="size-[18px]" aria-hidden />
        <span className="grow">
          <b>Support visit · read only.</b>{" "}
          {v ? (
            <>
              {v.staff.name} (IIT-PULSE) is viewing {v.institute?.displayName ?? "this institute"}
              {v.ticket ? ` · ticket ${v.ticket}` : ""} · ends in {v.minutesLeft} min
            </>
          ) : (
            "IIT-PULSE support is viewing this institute."
          )}
        </span>
        <button type="button" className="btn btn-sm" onClick={() => setAsk(true)}>
          End visit
        </button>
      </div>
      <ConfirmDialog
        open={ask}
        onOpenChange={setAsk}
        tone="navy"
        title="End the support visit?"
        description="You go back to the platform console. The visit's start, end and pages viewed are saved in both audit logs."
        confirmLabel="End visit"
        onConfirm={async () => {
          const t = auth.getToken();
          if (t) await supportVisitApi.end(t).catch(() => undefined);
          auth.removeToken();
          window.location.href = SUPPORT_VISIT_ENDED_PATH;
        }}
      />
    </>
  );
}
