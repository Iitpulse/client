"use client";

import { useParams } from "next/navigation";
import { TemplateEditor } from "@/components/m6/templates/TemplateEditor";

export default function EditTemplatePage() {
  const { templateId } = useParams<{ templateId: string }>();
  return <TemplateEditor key={templateId} templateId={templateId} />;
}
