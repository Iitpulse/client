"use client";

/*
  Import questions (board Admin-BulkUpload, canvas v166): Upload → Read → Review → Import.
  - Upload: a Word file (.docx, read by code; the model only splits it into questions), a PDF or photos (read by the
    model), the Excel template (no model, no credits), or pasted text. Defaults (subject, chapter or "Let AI suggest
    per question", difficulty) apply where a question has none. Files over 20 MB are refused before upload.
  - Read: upload progress, then the job's progress ("Page 9 of 15 · 41 questions so far · about 30 s left"), Cancel.
    The job keeps running if the page is left (?job= in the URL resumes it). A file that can't be read fails with
    0 credits; AI paused points at the Excel template.
  - Review: flagged rows first (no answer, equation was an image, WMF diagram, cut off, low confidence, unread,
    no chapter); a flagged row is imported once checked in the row-fix drawer; duplicates of bank questions are
    skipped unless "Import anyway". Source tag added to every question.
  - Import: POST /questions/ai/confirm (v2: all 5 types), then the done step's counts.
  API: src/lib/m6/import.ts (contract api-ai docs/m6-api.md "Paper parse v2", "Import confirm v2").
*/
import * as React from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { MathText } from "@/components/math-text";
import { Steps } from "@/components/kit/Steps";
import { KitDialog } from "@/components/kit/Overlay";
import { notify } from "@/components/kit/Toast";
import { apiError, saveBlob } from "@/lib/ai-admin";
import { licenceRequiredCopy, useLibraryStatus } from "@/lib/m10-library";
import { fetchQuestion, stemHtml, useSources, useSubjects } from "@/lib/question-queries";
import { useQuestionsSource } from "@/lib/m6/questions";
import {
  cancelParse,
  confirmImport,
  downloadTemplate,
  fileKind,
  findDuplicates,
  parseStatus,
  parseText,
  startParse,
  type ImportRowData,
  type ParseJobV2,
  type ParseResult,
} from "@/lib/m6/import";
import type { ImportConfirmResponseV2 } from "@/lib/m6-contract";
import { UploadStep, type Defaults } from "./upload-step";
import { ReadStep, type FileInfo, type ReadPhase } from "./read-step";
import { ImportingCard, ReviewStep, type ReviewTab } from "./review-step";
import { RowFixDrawer } from "./row-fix-drawer";
import { DoneStep } from "./done-step";
import { hasAnswer, importable, needsLook, rowCheck, withTaxonomy, type ReviewRow } from "./rows";
import "./bulk-upload.css";

type Phase = "upload" | ReadPhase | "review" | "importing" | "done";
interface Failure {
  code: string;
  message: string;
  creditsUsed: number | null;
}

const POLL_MS = 2000;
const baseName = (n: string) => n.replace(/\.[a-z0-9]+$/i, "").replace(/[_]+/g, " ").trim();

function setJobParam(jobId: string | null) {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  if (jobId) u.searchParams.set("job", jobId);
  else u.searchParams.delete("job");
  window.history.replaceState(null, "", u.toString());
}

/** Estimated import progress while the confirm call runs: climbs towards total - 1 over ~40 ms a row. Returns a stop function. */
function estimateProgress(total: number, onTick: (done: number) => void): () => void {
  const t0 = Date.now();
  const est = Math.max(1500, total * 40);
  const iv = setInterval(() => onTick(Math.min(total - 1, Math.round(((Date.now() - t0) / est) * total))), 200);
  return () => clearInterval(iv);
}

export default function BulkUploadPage() {
  const subjectsQ = useSubjects();
  const sourcesQ = useSources();
  const subjects = React.useMemo(() => subjectsQ.data ?? [], [subjectsQ.data]);
  const sample = useQuestionsSource("parseV2", "confirmV2");

  const [phase, setPhase] = React.useState<Phase>("upload");
  const [defaults, setDefaults] = React.useState<Defaults>({ subjectId: null, chapterId: null, difficulty: "medium" });
  const [dropError, setDropError] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [info, setInfo] = React.useState<FileInfo>({ name: "", size: 0, kind: "docx" });
  const [uploaded, setUploaded] = React.useState(0);
  const [pct, setPct] = React.useState(0);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [job, setJob] = React.useState<ParseJobV2 | null>(null);
  const [failure, setFailure] = React.useState<Failure | null>(null);
  const [rows, setRows] = React.useState<ReviewRow[]>([]);
  const libBranding = useLibraryStatus().data?.branding;
  const [readSeconds, setReadSeconds] = React.useState<number | null>(null);
  const [modelUsed, setModelUsed] = React.useState(true);
  const [tab, setTab] = React.useState<ReviewTab>("look");
  const [page, setPage] = React.useState(0);
  const [sourceTag, setSourceTag] = React.useState<string | null>(null);
  const [fixId, setFixId] = React.useState<string | null>(null);
  const [compareId, setCompareId] = React.useState<string | null>(null);
  const [importDone, setImportDone] = React.useState(0);
  const [result, setResult] = React.useState<ImportConfirmResponseV2 | null>(null);
  const [skips, setSkips] = React.useState({ dup: 0, noAnswer: 0, other: 0 });
  const [templateBusy, setTemplateBusy] = React.useState(false);
  const uploadAbort = React.useRef<AbortController | null>(null);
  const startedAt = React.useRef<number>(0);
  const fileInput = React.useRef<HTMLInputElement>(null);
  // Latest defaults and subjects for the parse callbacks, kept out of their deps so polling does not restart
  const defaultsRef = React.useRef(defaults);
  const subjectsRef = React.useRef(subjects);
  React.useLayoutEffect(() => {
    defaultsRef.current = defaults;
    subjectsRef.current = subjects;
  }, [defaults, subjects]);

  /* ---------- template ---------- */
  const onTemplate = async () => {
    setTemplateBusy(true);
    try {
      saveBlob(await downloadTemplate(), "iitpulse-questions-template.xlsx");
    } catch (e) {
      notify.error("Couldn't download the template", { description: e instanceof Error ? e.message : "Try again.", retry: onTemplate });
    } finally {
      setTemplateBusy(false);
    }
  };

  /* ---------- results → review rows ---------- */
  const toReview = React.useCallback((res: ParseResult, kind: ParseJobV2["kind"]) => {
    const d = defaultsRef.current;
    const subs = subjectsRef.current;
    const prep = (q: ImportRowData): ImportRowData => {
      const x = withTaxonomy({ ...q }, subs);
      if (!x.subjectId && d.subjectId) x.subjectId = d.subjectId;
      if (!x.chapterIds?.length && d.chapterId && x.subjectId === d.subjectId) x.chapterIds = [d.chapterId];
      if (!x.difficulty) x.difficulty = d.difficulty;
      return x;
    };
    const list: ReviewRow[] = [
      ...res.rows.map((q) => ({ data: prep(q), n: q.n, invalid: null, checked: false, skipped: false, dup: null, forced: false, serverError: null })),
      ...res.invalid.map(({ row, reason }) => ({ data: prep(row), n: row.n, invalid: reason, checked: false, skipped: false, dup: null, forced: false, serverError: null })),
    ].sort((a, b) => a.n - b.n);
    setRows(list);
    setJob(res.job);
    setModelUsed(res.job ? res.job.modelUsed : kind !== "xlsx");
    setReadSeconds(res.seconds ?? (startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : null));
    setTab(list.some(needsLook) ? "look" : "all");
    setPage(0);
    setPhase("review");
    void findDuplicates(list.map((r) => r.data)).then((m) => {
      if (!m) return;
      setRows((cur) => cur.map((r) => (m[r.data.id] ? { ...r, dup: m[r.data.id] } : r)));
    });
  }, []);

  // Rows that arrived before the subjects list: resolve names → ids once it is there
  React.useEffect(() => {
    if (!subjects.length) return;
    setRows((cur) => (cur.some((r) => !r.data.subjectId && r.data.subject) ? cur.map((r) => ({ ...r, data: withTaxonomy(r.data, subjects) })) : cur));
  }, [subjects]);

  /* ---------- failures ---------- */
  const fail = React.useCallback((code: string | null, message: string, creditsUsed: number | null = null) => {
    setJobParam(null);
    if (code === "AI_PAUSED") {
      setPhase("paused");
      return;
    }
    if (code === "FILE_TOO_LARGE" || code === "UNSUPPORTED_FILE") {
      setDropError(message);
      setPhase("upload");
      return;
    }
    setFailure({ code: code ?? "AI_UNAVAILABLE", message, creditsUsed });
    setPhase("failed");
  }, []);

  /* ---------- upload + read ---------- */
  const begin = async (f: File) => {
    const kind = fileKind(f.name) ?? "pdf";
    setDropError(null);
    setFile(f);
    setInfo({ name: f.name, size: f.size, kind });
    setSourceTag(baseName(f.name) || null);
    setFailure(null);
    setUploaded(0);
    setPct(0);
    setJob(null);
    setPhase("uploading");
    startedAt.current = Date.now();
    const ac = new AbortController();
    uploadAbort.current = ac;
    const d = defaultsRef.current;
    try {
      const r = await startParse(f, { subjectId: d.subjectId ?? undefined, chapterId: d.chapterId, difficulty: d.difficulty }, (loaded, total) => {
        setUploaded(loaded);
        setPct(Math.min(100, Math.round((loaded / Math.max(1, total)) * 100)));
      }, ac.signal);
      uploadAbort.current = null;
      setJobId(r.jobId);
      setJob(r.job);
      setJobParam(r.jobId);
      setPct(0);
      setPhase("reading");
    } catch (e) {
      uploadAbort.current = null;
      const err = e as { name?: string; code?: string | null; message?: string };
      if (err?.name === "CanceledError" || err?.name === "AbortError" || /cancel/i.test(err?.message ?? "")) {
        setPhase("upload");
        return;
      }
      fail(err?.code ?? null, err?.message || "The file could not be uploaded. Try again.");
    }
  };

  const readText = async (content: string) => {
    setInfo({ name: "Pasted text", size: 0, kind: "text" });
    setFile(null);
    setSourceTag(null);
    setFailure(null);
    setJob(null);
    setPct(0);
    setPhase("reading");
    startedAt.current = Date.now();
    try {
      toReview(await parseText(content), "text");
    } catch (e) {
      const err = e as { code?: string | null; message?: string };
      fail(err?.code ?? null, err?.message || "The text could not be read.");
    }
  };

  // Poll the job while reading
  React.useEffect(() => {
    if (phase !== "reading" || !jobId) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const s = await parseStatus(jobId);
        if (!live) return;
        setJob(s.job);
        setPct(s.pct);
        if (s.job?.fileName) setInfo((i) => (i.name ? i : { ...i, name: s.job!.fileName, kind: s.job!.kind }));
        if (s.status === "completed" && s.result) {
          toReview(s.result, s.job?.kind ?? info.kind);
          return;
        }
        if (s.status === "failed") return fail(s.error?.code ?? null, s.error?.message ?? "The paper could not be read.", s.job?.creditsUsed ?? null);
        if (s.status === "cancelled") {
          setJobParam(null);
          setPhase("upload");
          return;
        }
      } catch (e) {
        if (!live) return;
        const err = e as { status?: number; code?: string | null; message?: string };
        if (err?.status === 404) return fail("JOB_NOT_FOUND", "This reading has expired. Upload the file again.");
      }
      if (live) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, jobId]);

  // ?job= resumes a reading that is still running (or shows its result)
  React.useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("job");
    if (!id) return;
    setInfo({ name: "", size: 0, kind: "docx" });
    setJobId(id);
    setPhase("reading");
  }, []);

  const cancel = async () => {
    if (phase === "uploading") {
      uploadAbort.current?.abort();
      setPhase("upload");
      return;
    }
    const id = jobId;
    setJobParam(null);
    setJobId(null);
    setPhase("upload");
    if (id) {
      try {
        await cancelParse(id);
        notify.success("Reading stopped");
      } catch {
        /* the job ends by itself; nothing was imported */
      }
    }
  };

  const restart = () => {
    setJobParam(null);
    setJobId(null);
    setJob(null);
    setRows([]);
    setResult(null);
    setFailure(null);
    setFixId(null);
    setPhase("upload");
  };
  const choose = () => {
    restart();
    // FileDrop's own input lives in step 1; open a picker from here too
    setTimeout(() => fileInput.current?.click(), 0);
  };

  /* ---------- review actions ---------- */
  const lookList = React.useMemo(
    () =>
      rows
        .filter(needsLook)
        .sort((a, b) => (rowCheck(a).tone === "bad" ? 0 : 1) - (rowCheck(b).tone === "bad" ? 0 : 1) || a.n - b.n),
    [rows]
  );
  const navList = React.useMemo(() => {
    // The drawer moves through the rows that need a look; opened from a good row it moves through the tab's rows
    const cur = rows.find((r) => r.data.id === fixId);
    if (cur && needsLook(cur)) return lookList;
    return tab === "dup" ? rows.filter((r) => !!r.dup) : rows;
  }, [rows, fixId, lookList, tab]);
  const fixRow = rows.find((r) => r.data.id === fixId) ?? null;
  const navIdx = navList.findIndex((r) => r.data.id === fixId);
  const remaining = fixRow ? lookList.filter((r) => r.data.id !== fixId).length : 0;

  const saveFix = (data: ImportRowData) => {
    const id = fixId;
    const next = rows.map((r) => (r.data.id === id ? { ...r, data, checked: true, invalid: null, serverError: null, skipped: false } : r));
    setRows(next);
    const after = next.filter(needsLook).sort((a, b) => a.n - b.n);
    const following = after.find((r) => r.n > (fixRow?.n ?? 0)) ?? after[0];
    setFixId(following ? following.data.id : null);
  };
  const skipFix = () => {
    const id = fixId;
    const next = rows.map((r) => (r.data.id === id ? { ...r, skipped: true } : r));
    setRows(next);
    const after = next.filter(needsLook).sort((a, b) => a.n - b.n);
    const following = after.find((r) => r.n > (fixRow?.n ?? 0)) ?? after[0];
    setFixId(following ? following.data.id : null);
  };

  /* ---------- import ---------- */
  const doImport = async () => {
    const take = rows.filter(importable);
    if (!take.length) return;
    setPhase("importing");
    setImportDone(0);
    const stopProgress = estimateProgress(take.length, setImportDone);
    const subjectName = (id: string) => subjects.find((s) => s._id === id)?.name ?? "";
    const chapterName = (id: string) => {
      for (const s of subjects) for (const c of s.chapters ?? []) if ((c.id || c._id) === id) return c.name;
      return id;
    };
    try {
      const out = await confirmImport(
        {
          questions: take.map((r) => ({ ...r.data, subjectId: r.data.subjectId!, chapterIds: r.data.chapterIds ?? [], ...(r.data.topicIds ? { topicIds: r.data.topicIds } : {}) })),
          sourceTag: sourceTag?.trim() || null,
          jobId,
        },
        { subjectName, chapterName }
      );
      stopProgress();
      if (out.rowErrors) {
        const byId = new Map(Object.entries(out.rowErrors).map(([i, m]) => [take[Number(i)]?.data.id, m]));
        setRows((cur) => cur.map((r) => (byId.has(r.data.id) ? { ...r, serverError: byId.get(r.data.id) ?? "Check this row", checked: false } : r)));
        setTab("look");
        setPage(0);
        setPhase("review");
        notify.error(`${byId.size === 1 ? "1 row needs" : `${byId.size} rows need`} a fix`, { description: "Nothing was imported. Fix the rows marked red, then import again." });
        return;
      }
      setImportDone(take.length);
      const notTaken = rows.filter((r) => !importable(r));
      setSkips({
        dup: notTaken.filter((r) => r.dup && !r.forced && !r.skipped).length,
        noAnswer: notTaken.filter((r) => !(r.dup && !r.forced) && !hasAnswer(r.data)).length,
        other: notTaken.filter((r) => !(r.dup && !r.forced) && hasAnswer(r.data)).length,
      });
      setResult(out);
      setJobParam(null);
      setPhase("done");
    } catch (e) {
      stopProgress();
      setPhase("review");
      // M10: a row that is a library question's text needs "Copy to my bank" (retrying won't help)
      const lic = licenceRequiredCopy(apiError(e), libBranding);
      if (lic) notify.error(lic.title, { description: `Nothing was imported. ${lic.description} Skip that row, then import again.` });
      else notify.error("Couldn't import the questions", { description: e instanceof Error ? e.message : "Nothing was imported. Try again.", retry: doImport });
    }
  };

  /* ---------- compare (duplicates) ---------- */
  const cmpRow = rows.find((r) => r.data.id === compareId) ?? null;
  const [cmpBank, setCmpBank] = React.useState<{ id: string; html: string; label: string } | null>(null);
  React.useEffect(() => {
    setCmpBank(null);
    const id = cmpRow?.dup?.questionId;
    if (!id) return;
    let live = true;
    fetchQuestion(id, null)
      .then((q) => {
        if (live && q) setCmpBank({ id, html: stemHtml(q), label: [typeof q.subject === "string" ? q.subject : q.subject?.name, q.chapters?.[0]?.name].filter(Boolean).join(" · ") });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [cmpRow?.dup?.questionId]);

  /* ---------- steps ---------- */
  const lookN = rows.filter(needsLook).length;
  const cur = phase === "upload" ? 0 : phase === "uploading" || phase === "reading" || phase === "failed" || phase === "paused" ? 1 : phase === "review" ? 2 : 3;
  const steps = [
    { label: "Upload" },
    { label: "Read", bad: phase === "failed" || phase === "paused" },
    { label: phase === "review" && lookN ? `Review · ${lookN} to fix` : "Review" },
    { label: "Import" },
  ];

  return (
    <>
      <header className="topbar row between wrap shrink-0" style={{ minHeight: 64, padding: "10px 28px", gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <Link href="/questions" className="btn btn-ghost btn-sm">
            ← Bank
          </Link>
          <h1 className="h3">Import questions</h1>
          {sample === "sample" && (
            <span className="bu-sample" title="Some answers on this page are sample data until the server has the M6 import routes">
              Sample data
            </span>
          )}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onTemplate} disabled={templateBusy} aria-busy={templateBusy || undefined}>
          <Download className="size-4" aria-hidden />
          Excel template (.xlsx)
        </button>
      </header>
      <main className="bu-main">
        <Steps
          className="bu-steps"
          ariaLabel="Import steps"
          steps={steps}
          current={cur}
          allDone={phase === "done"}
          onGo={(i) => {
            if (i === 0 && phase !== "importing") restart();
          }}
        />
        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".docx,.pdf,.xlsx,.png,.jpg,.jpeg"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void begin(f);
          }}
        />

        {phase === "upload" && (
          <UploadStep
            subjects={subjects}
            defaults={defaults}
            onDefaults={setDefaults}
            onFile={(f) => void begin(f)}
            onText={(t) => void readText(t)}
            dropError={dropError}
            onDropErrorClear={() => setDropError(null)}
            onTemplate={onTemplate}
            templateBusy={templateBusy}
          />
        )}

        {(phase === "uploading" || phase === "reading" || phase === "failed" || phase === "paused") && (
          <ReadStep
            phase={phase}
            file={info}
            uploaded={uploaded}
            pct={pct}
            job={job}
            failure={failure}
            onCancel={cancel}
            onRetry={() => (file ? void begin(file) : restart())}
            onChoose={choose}
            onBack={() => {
              if (phase === "uploading") uploadAbort.current?.abort();
              restart();
            }}
            onTemplate={onTemplate}
          />
        )}

        {phase === "review" && (
          <ReviewStep
            file={info}
            rows={rows}
            subjects={subjects}
            readSeconds={readSeconds}
            modelUsed={modelUsed}
            tab={tab}
            onTab={setTab}
            page={page}
            onPage={setPage}
            sourceTag={sourceTag}
            sourceOptions={(sourcesQ.data ?? []).map((s) => s.name)}
            onSourceTag={setSourceTag}
            onOpen={setFixId}
            onForce={(id, on) => setRows((cur) => cur.map((r) => (r.data.id === id ? { ...r, forced: on } : r)))}
            onCompare={setCompareId}
            onReplace={choose}
            onImport={doImport}
          />
        )}

        {phase === "importing" && <ImportingCard total={rows.filter(importable).length} done={importDone} />}

        {phase === "done" && result && <DoneStep result={result} sourceTag={sourceTag} skippedDup={skips.dup} skippedNoAnswer={skips.noAnswer} skippedOther={skips.other} onRestart={restart} />}
      </main>

      {phase === "review" && fixRow && (
        <RowFixDrawer
          row={fixRow}
          subjects={subjects}
          remaining={remaining}
          canPrev={navIdx > 0}
          canNext={navIdx >= 0 && navIdx < navList.length - 1}
          onPrev={() => navIdx > 0 && setFixId(navList[navIdx - 1].data.id)}
          onNext={() => navIdx < navList.length - 1 && setFixId(navList[navIdx + 1].data.id)}
          onClose={() => setFixId(null)}
          onSave={saveFix}
          onSkip={skipFix}
        />
      )}

      <KitDialog
        open={!!cmpRow}
        onOpenChange={(o) => !o && setCompareId(null)}
        title="This looks like a question already in the bank"
        description={cmpRow?.dup ? `${Math.round(cmpRow.dup.similarity * 100)}% the same as ${cmpRow.dup.questionId}. Import it only if it's really different.` : undefined}
        width="wide"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCompareId(null)}>
              Keep it skipped
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const id = compareId;
                setRows((cur) => cur.map((r) => (r.data.id === id ? { ...r, forced: true } : r)));
                setCompareId(null);
              }}
            >
              Import anyway
            </button>
          </>
        }
      >
        {cmpRow && (
          <>
            <div className="bu-cmp">
              <span className="xs" style={{ fontWeight: 600 }}>
                Row {cmpRow.n} · from the file
              </span>
              <MathText as="div" className="math" html text={cmpRow.data.type === "paragraph" ? cmpRow.data.passage?.en ?? "" : cmpRow.data.en.question} />
            </div>
            <div className="bu-cmp">
              <span className="xs" style={{ fontWeight: 600 }}>
                {cmpRow.dup?.questionId}
                {cmpBank?.label ? ` · ${cmpBank.label}` : ""}
              </span>
              {cmpBank ? <MathText as="div" className="math" html text={cmpBank.html} /> : <span className="skel" style={{ display: "block", height: 40 }} />}
            </div>
          </>
        )}
      </KitDialog>
    </>
  );
}
