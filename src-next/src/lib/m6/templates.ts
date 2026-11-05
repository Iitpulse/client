/*
  Admin-Templates data (contract "Exams and exam UI templates": GET/POST /tests/admin/templates, GET/PUT/DELETE …/:id,
  POST …/:id/{make-default,duplicate,restore}, GET …/:id/preview?testId&lang). Answers: list TemplateListResponse;
  one { now, template }; delete SoftDeleteResponse; preview TemplatePreviewResponse.
*/
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExamTemplate, Lang, SoftDeleteResponse, TemplateListResponse, TemplatePreviewResponse, TemplateWriteRequest } from "../m6-contract";
import { m6Call, m6Tests, scenario, source, unwrap } from "./client";
import { templateFixtures } from "./fixtures/templates";

export function useTemplates(examId?: string) {
  return useQuery({
    queryKey: ["m6", "templates", examId ?? ""],
    queryFn: () =>
      m6Call<TemplateListResponse>(
        "templates",
        async () => unwrap<TemplateListResponse>((await m6Tests.get("/admin/templates", { params: { examId: examId || undefined } })).data),
        () => (scenario() === "empty" ? templateFixtures.empty() : templateFixtures.list(examId)),
        true
      ),
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["m6", "template", id],
    enabled: !!id,
    queryFn: async () =>
      (
        await m6Call<{ template: ExamTemplate }>(
          "templates",
          async () => unwrap<{ template: ExamTemplate }>((await m6Tests.get(`/admin/templates/${encodeURIComponent(id!)}`)).data),
          () => templateFixtures.get(id!),
          true
        )
      ).template,
  });
}

export function useTemplatePreview(id: string | undefined, lang: Lang, testId?: string) {
  return useQuery({
    queryKey: ["m6", "template-preview", id, lang, testId ?? ""],
    enabled: !!id,
    queryFn: () =>
      m6Call<TemplatePreviewResponse>(
        "templates",
        async () => unwrap<TemplatePreviewResponse>((await m6Tests.get(`/admin/templates/${encodeURIComponent(id!)}/preview`, { params: { lang, testId: testId || undefined } })).data),
        () => templateFixtures.preview(id!, lang),
        true
      ),
  });
}

const SRC = "Templates editor";
const enc = encodeURIComponent;

export const templatesApi = {
  create: (body: TemplateWriteRequest) =>
    m6Call<{ template: ExamTemplate }>("templates", async () => unwrap((await m6Tests.post("/admin/templates", body, source(SRC))).data), () => templateFixtures.create(body)),
  update: (id: string, body: TemplateWriteRequest) =>
    m6Call<{ template: ExamTemplate }>("templates", async () => unwrap((await m6Tests.put(`/admin/templates/${enc(id)}`, body, source(SRC))).data), () => templateFixtures.update(id, body)),
  makeDefault: (id: string) =>
    m6Call<{ template: ExamTemplate }>("templates", async () => unwrap((await m6Tests.post(`/admin/templates/${enc(id)}/make-default`, {}, source("Templates list"))).data), () => templateFixtures.makeDefault(id)),
  duplicate: (id: string, name?: string) =>
    m6Call<{ template: ExamTemplate }>("templates", async () => unwrap((await m6Tests.post(`/admin/templates/${enc(id)}/duplicate`, { name }, source("Templates list"))).data), () => templateFixtures.duplicate(id, name)),
  remove: (id: string) =>
    m6Call<SoftDeleteResponse>("templates", async () => unwrap((await m6Tests.delete(`/admin/templates/${enc(id)}`, source("Templates list"))).data), () => templateFixtures.remove(id)),
  restore: (id: string) =>
    m6Call<{ template: ExamTemplate }>("templates", async () => unwrap((await m6Tests.post(`/admin/templates/${enc(id)}/restore`, {}, source("Templates list"))).data), () => templateFixtures.restore(id)),
};

export function useInvalidateTemplates() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["m6", "templates"] }), qc.invalidateQueries({ queryKey: ["m6", "template"] }), qc.invalidateQueries({ queryKey: ["m6", "template-preview"] })]);
}
