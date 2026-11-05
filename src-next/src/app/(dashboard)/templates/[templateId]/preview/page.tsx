"use client";
/*
  Admin-Templates board, view=preview: the frozen NTA instructions page (GET /tests/admin/templates/:id/preview?lang,
  placeholders filled) or exam screen, in English or हिन्दी, exactly as students see it.
*/
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import "@/components/m6/m6-patterns.css";
import { Topbar } from "@/components/admin/Topbar";
import { NoAccess, PageError, PageSkeleton, Segmented } from "@/components/kit";
import { errorCode, isForbidden, SamplePill } from "@/components/m6/parts";
import { NtaExamScreen, NtaInstructions } from "@/components/m6/templates/NtaPreview";
import { useTemplate, useTemplatePreview } from "@/lib/m6/templates";
import type { Lang } from "@/lib/m6-contract";

export default function TemplatePreviewPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [lang, setLang] = useState<Lang>("en");
  const [pv, setPv] = useState<"ins" | "exam">("ins");
  const one = useTemplate(templateId);
  const prev = useTemplatePreview(templateId, lang);
  const err = one.error ?? prev.error;

  return (
    <>
      <Topbar
        title={`Preview · ${one.data?.name ?? "Template"}`}
        back={{ href: "/templates", label: "Templates" }}
        badge={<SamplePill areas={["templates"]} />}
        actions={
          <>
            <Segmented<"ins" | "exam">
              size="sm"
              ariaLabel="Screen"
              value={pv}
              onChange={setPv}
              options={[
                { value: "ins", label: "Instructions" },
                { value: "exam", label: "Exam screen" },
              ]}
            />
            <Segmented<Lang>
              size="sm"
              ariaLabel="Language"
              value={lang}
              onChange={setLang}
              options={[
                { value: "en", label: "English" },
                { value: "hi", label: <span className="m6-hi">हिन्दी</span> },
              ]}
            />
            <Link href={`/templates/${templateId}`} className="btn btn-primary btn-sm">
              Edit
            </Link>
          </>
        }
      />
      <main className="col" style={{ padding: "22px 28px 40px", gap: 12, alignItems: "center" }}>
        {err ? (
          <div style={{ width: "100%" }}>
            {isForbidden(err) ? (
              <NoAccess what="exam templates" />
            ) : (
              <PageError what="the preview" code={errorCode("TPL", err)} onRetry={() => (one.refetch(), prev.refetch())} />
            )}
          </div>
        ) : !one.data || !prev.data ? (
          <div style={{ width: "100%", maxWidth: 900 }}>
            <PageSkeleton rows={8} />
          </div>
        ) : (
          <>
            <div className="m6-frame" style={{ width: "100%", maxWidth: 900 }}>
              {pv === "ins" ? (
                <NtaInstructions doc={prev.data} lang={lang} facts={prev.data.test} big filled />
              ) : (
                <NtaExamScreen wording={one.data.wording[lang]} tools={one.data.tools} lang={lang} big />
              )}
            </div>
            <span className="xs muted">This is what students see before {prev.data.test.name}. Highlighted labels come from this template.</span>
          </>
        )}
      </main>
    </>
  );
}
