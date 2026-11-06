"use client";
/*
  Admin-Templates board, view=list (+ make-default, delete-blocked, empty, error, no-access).
  GET /tests/admin/templates: the default per exam and every template as a card (tools, summary, used by), menu
  Duplicate · Make default for <exam> · Delete (409 TEMPLATE_IN_USE → BlockedDialog; unused → Undo 6 s).
*/
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Info } from "lucide-react";
import "@/components/m6/m6-patterns.css";
import { Topbar } from "@/components/admin/Topbar";
import { BlockedDialog, ConfirmDialog, EmptyState, NoAccess, notify, PageError, PageSkeleton, RowMenu, useFillHeight } from "@/components/kit";
import { errorCode, isForbidden, SamplePill } from "@/components/m6/parts";
import { apiError, errDetails } from "@/lib/m6/client";
import { templatesApi, useInvalidateTemplates, useTemplates } from "@/lib/m6/templates";
import type { ExamTemplate, TemplateInUseDetails } from "@/lib/m6-contract";

function toolBadges(t: ExamTemplate): Array<{ label: string; on: boolean }> {
  const out: Array<{ label: string; on: boolean }> = [];
  const calc = t.tools.calculator;
  const calcBadge = { label: calc === "off" ? "Calculator off" : calc === "basic" ? "Basic calculator" : "Scientific calculator", on: calc !== "off" };
  if (calc !== "off") out.push(calcBadge);
  out.push({ label: t.tools.markForReview ? "Mark for review" : "No mark for review", on: t.tools.markForReview });
  if (calc === "off") out.push(calcBadge);
  out.push({ label: t.tools.languageSwitch ? "English + हिन्दी" : "English only", on: t.tools.languageSwitch });
  if (t.tools.roughSheet) out.push({ label: "Rough sheet", on: true });
  return out;
}

export default function TemplatesPage() {
  const router = useRouter();
  const list = useTemplates();
  const invalidate = useInvalidateTemplates();
  const [makeDefault, setMakeDefault] = useState<ExamTemplate | null>(null);
  // Owner rule (6 Nov): the page never scrolls; the defaults and the template cards scroll in the space left.
  const [fillRef, fillH] = useFillHeight<HTMLDivElement>(true, 320);
  const [blocked, setBlocked] = useState<{ t: ExamTemplate; d: TemplateInUseDetails | null } | null>(null);
  const forbidden = list.isError && isForbidden(list.error);
  const items = list.data?.items ?? [];

  const duplicate = async (t: ExamTemplate) => {
    try {
      const r = await templatesApi.duplicate(t.id);
      await invalidate();
      notify.success(`Copied as "${r.template.name}"`, { action: { label: "Edit", href: `/templates/${r.template.id}` } });
    } catch (e) {
      notify.error("Couldn't copy the template", { description: apiError(e).message });
    }
  };
  const remove = async (t: ExamTemplate) => {
    try {
      await templatesApi.remove(t.id);
      await invalidate();
      notify.undo(`Template "${t.name}" deleted`, async () => {
        try {
          await templatesApi.restore(t.id);
          await invalidate();
        } catch (e) {
          notify.error("Couldn't bring the template back", { description: apiError(e).message });
        }
      });
    } catch (e) {
      const err = apiError(e);
      if (err.code === "TEMPLATE_IN_USE") setBlocked({ t, d: errDetails<TemplateInUseDetails>(e) });
      else notify.error("Couldn't delete the template", { description: err.message });
    }
  };
  const doMakeDefault = async () => {
    if (!makeDefault) return;
    const t = makeDefault;
    try {
      await templatesApi.makeDefault(t.id);
      await invalidate();
      setMakeDefault(null);
      notify.success(`${t.name} is the ${t.exam.name} default`);
    } catch (e) {
      throw new Error(apiError(e).message);
    }
  };
  const currentDefault = makeDefault ? items.find((x) => x.exam.id === makeDefault.exam.id && x.isDefault) : null;
  const blockedDefault = blocked?.d?.defaultFor ?? (blocked?.t.isDefault ? blocked.t.exam : null);
  const blockedTests = blocked?.d?.tests ?? blocked?.t.usedBy ?? 0;

  const header = (withNew: boolean) => (
    <Topbar
      title="Exam UI templates"
      badge={<SamplePill areas={["templates"]} />}
      actions={
        withNew && (
          <Link href="/templates/new" className="btn btn-primary btn-sm">
            + New template
          </Link>
        )
      }
    />
  );

  if (forbidden)
    return (
      <>
        {header(false)}
        <main className="col" style={{ padding: "22px 28px 40px" }}>
          <NoAccess what="exam templates" />
        </main>
      </>
    );
  if (list.isError)
    return (
      <>
        {header(false)}
        <main className="col" style={{ padding: "22px 28px 40px" }}>
          <PageError what="templates" body="Tests keep working with their templates. Try again in a moment." code={errorCode("TPL", list.error)} onRetry={() => list.refetch()} />
        </main>
      </>
    );
  if (list.isSuccess && !items.length)
    return (
      <>
        {header(false)}
        <main className="col" style={{ padding: "22px 28px 40px" }}>
          <EmptyState
            title="No exams yet, so no templates"
            body="Each exam gets the NTA standard template when you add it. Add an exam first, then change its wording or tools here."
            actions={
              <Link href="/exams" className="btn btn-primary btn-sm">
                Add an exam
              </Link>
            }
          />
        </main>
      </>
    );

  return (
    <>
      {header(true)}
      <main className="col" style={{ padding: "22px 28px 16px", gap: 16 }}>
        <div className="m6-bn info">
          <Info className="size-4" aria-hidden />
          <span className="t">
            Students always see the NTA exam screen. A template changes only the <b>wording</b>, the <b>instructions page</b> and the <b>exam tools</b>. Each exam has one default; a test can pick another.
          </span>
        </div>
        {list.isLoading ? (
          <PageSkeleton rows={6} onRetry={() => list.refetch()} />
        ) : (
          <div ref={fillRef} className="col" style={{ gap: 16, overflowY: "auto", height: fillH ?? undefined, minHeight: 0, paddingBottom: 4 }}>
            <section className="card col rise">
              <div className="row between pad" style={{ borderBottom: "1px solid #EEF0F5" }}>
                <span className="h3">Default for each exam</span>
                <span className="xs muted">New tests start with these</span>
              </div>
              <div className="m6-defs">
                {list.data!.defaults.map((d) => (
                  <div key={d.exam.id}>
                    <span className="xs muted">{d.exam.name}</span>
                    <Link href={`/templates/${d.template.id}`} className="sm" style={{ fontWeight: 600, color: "inherit" }}>
                      {d.template.name}
                    </Link>
                  </div>
                ))}
              </div>
            </section>
            <div className="m6-cards">
              {items.map((t, i) => (
                <article key={t.id} className="card pad col lift rise" style={{ gap: 10, ["--i" as string]: i }}>
                  <div className="row between" style={{ gap: 10, alignItems: "flex-start" }}>
                    <div className="col" style={{ gap: 2, minWidth: 0 }}>
                      <span className="h3">{t.name}</span>
                      <span className="xs muted">
                        {t.exam.name} · used by {t.usedBy} test{t.usedBy === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      {t.isDefault && <span className="badge b-navy">Default for {t.exam.name}</span>}
                      <RowMenu
                        label={`More for ${t.name}`}
                        items={[
                          { label: "Duplicate", onSelect: () => duplicate(t) },
                          ...(t.isDefault ? [] : [{ label: `Make default for ${t.exam.name}`, onSelect: () => setMakeDefault(t) }]),
                          { label: "Delete", danger: true, onSelect: () => remove(t) },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="row wrap" style={{ gap: 6 }}>
                    {toolBadges(t).map((b) => (
                      <span key={b.label} className={`badge ${b.on ? "b-green" : "b-grey"}`}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                  <span className="xs muted">{t.summary}</span>
                  <div className="row" style={{ gap: 6 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push(`/templates/${t.id}/preview`)}>
                      Preview
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.push(`/templates/${t.id}`)}>
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!makeDefault}
        onOpenChange={(o) => !o && setMakeDefault(null)}
        tone="navy"
        title={`Make "${makeDefault?.name ?? ""}" the ${makeDefault?.exam.name ?? ""} default?`}
        description={`New ${makeDefault?.exam.name ?? ""} tests will start with it.${currentDefault ? ` The ${currentDefault.usedBy} test${currentDefault.usedBy === 1 ? "" : "s"} that use ${currentDefault.name} keep it.` : ""} A test can still pick any template.`}
        confirmLabel="Make default"
        onConfirm={doMakeDefault}
      />
      <BlockedDialog
        open={!!blocked}
        onOpenChange={(o) => !o && setBlocked(null)}
        title={`Can't delete ${blocked?.t.name ?? ""} yet`}
        description={
          blockedDefault
            ? `It's the ${blockedDefault.name} default${blockedTests ? ` and ${blockedTests} test${blockedTests === 1 ? " uses" : "s use"} it` : ""}. Make another template the ${blockedDefault.name} default${blockedTests ? " and move those tests" : ""} first.`
            : `${blockedTests} test${blockedTests === 1 ? " uses" : "s use"} it. Move those tests to another template first.`
        }
        closeLabel="Close"
        action={
          blockedTests > 0 ? (
            <Link href={`/tests?template=${encodeURIComponent(blocked?.t.id ?? "")}`} className="btn btn-secondary btn-sm">
              Show the {blockedTests} test{blockedTests === 1 ? "" : "s"}
            </Link>
          ) : undefined
        }
      />
    </>
  );
}
