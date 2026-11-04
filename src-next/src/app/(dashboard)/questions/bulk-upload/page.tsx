"use client";

/*
  Admin-BulkUpload board: Upload → AI parsing → Review → Import.
  Parsing is the existing AI parser (gateway /questions/ai/parse*): files always go through the background job
  and are polled (commit 1be0517: a synchronous parse can outlive Cloudflare's 100 s proxy limit); pasted text
  goes through /parse-text. Saving is /questions/ai/confirm. The board's duplicate check and Excel template have
  no API yet, so they are not drawn.
*/

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight, FileText, Upload, X } from "lucide-react";
import { MathText } from "@iitpulse/ui";

import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api, { ParsedQuestion as APIParsedQuestion } from "@/lib/api";
import { ISubject, IChapter } from "@/types";
import { useToast } from "@/hooks/use-toast";
import "./bulk-upload.css";

interface EditableQuestion extends APIParsedQuestion {
  isSelected: boolean;
  isEditing: boolean;
  editedSubject?: string;
  editedChapter?: string;
  editedDifficulty?: "easy" | "medium" | "hard";
}

type Difficulty = "easy" | "medium" | "hard";
type Flag = { tone: "ok" | "warn" | "bad"; label: string };

const PAGE = 25;
const LETTERS = "ABCDEFGHIJ";

/** Deterministic checks on a parsed question (no AI): what an admin should look at before importing. */
function checkQuestion(q: EditableQuestion): Flag {
  if (!q.correctAnswers?.length) return { tone: "bad", label: "No answer in the key" };
  if ((q.en?.options?.length ?? 0) < 2) return { tone: "bad", label: "Options missing" };
  if (!(q.editedSubject || q.subject) || !(q.editedChapter || q.chapter)) return { tone: "warn", label: "Needs subject and chapter" };
  const html = `${q.en?.question ?? ""} ${q.en?.options?.map((o) => o.value).join(" ") ?? ""}`;
  if (/<img\b/i.test(html)) return { tone: "warn", label: "Has an image · check equations are LaTeX" };
  if (typeof q.confidence === "number" && q.confidence < 0.7) return { tone: "warn", label: `Low parse confidence · ${Math.round(q.confidence * 100)}%` };
  return { tone: "ok", label: "Looks good" };
}

const FLAG_CLASS: Record<Flag["tone"], string> = { ok: "b-green", warn: "b-amber", bad: "b-live" };

function answerLetters(q: APIParsedQuestion): string {
  const ids = q.en?.options?.map((o) => o.id) ?? [];
  const letters = (q.correctAnswers ?? []).map((a) => {
    const i = ids.indexOf(a);
    return i >= 0 ? LETTERS[i] : a.toUpperCase();
  });
  return letters.length ? letters.join(", ") : "—";
}

function Steps({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  const names = ["Upload", "AI parsing", "Review", "Import"];
  return (
    <div className="row flex-wrap gap-3.5" aria-label="Import steps">
      {names.map((n, i) => {
        const k = i + 1;
        const state = k < current ? "done" : k === current ? "on" : "";
        return (
          <React.Fragment key={n}>
            {i > 0 && <span aria-hidden className={`h-px w-10 ${k <= current ? (k < current ? "bg-success" : "bg-brand") : "bg-line"}`} />}
            <span className={`bu-st ${state}`} aria-current={state === "on" ? "step" : undefined}>
              <i>{state === "done" ? "✓" : k}</i>
              {n}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function BulkUploadPage() {
  const router = useRouter();
  const { toast } = useToast();

  // Subject and chapter data
  const [subjects, setSubjects] = React.useState<ISubject[]>([]);
  const [chapters, setChapters] = React.useState<IChapter[]>([]);
  const [selectedSubject, setSelectedSubject] = React.useState("");
  const [selectedChapter, setSelectedChapter] = React.useState("");
  const [defaultDifficulty, setDefaultDifficulty] = React.useState<Difficulty>("medium");

  // Upload state
  const [uploadMode, setUploadMode] = React.useState<"file" | "text">("file");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [textContent, setTextContent] = React.useState("");
  const [parsing, setParsing] = React.useState(false);
  const [parsingProgress, setParsingProgress] = React.useState(0);
  const [parseSeconds, setParseSeconds] = React.useState<number | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [step, setStep] = React.useState<"upload" | "preview" | "complete">("upload");
  const [savedCount, setSavedCount] = React.useState(0);

  // Parsed questions
  const [parsedQuestions, setParsedQuestions] = React.useState<EditableQuestion[]>([]);
  const [invalidQuestions, setInvalidQuestions] = React.useState<Array<{ question: APIParsedQuestion; reason: string }>>([]);
  const [expandedQuestions, setExpandedQuestions] = React.useState<Set<string>>(new Set());
  const [view, setView] = React.useState<"flagged" | "all">("all");
  const [page, setPage] = React.useState(0);

  // Edit dialog
  const [editingQuestion, setEditingQuestion] = React.useState<EditableQuestion | null>(null);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await api.subjects.getAll();
        // The subjects API returns { success, data: [...] }
        setSubjects(response.data?.data || response.data?.subjects || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    };
    fetchSubjects();
  }, []);

  React.useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedSubject) {
        setChapters([]);
        return;
      }
      // Subjects already carry their chapters; fall back to the chapters endpoint
      const fromSubject = subjects.find((s) => s._id === selectedSubject)?.chapters;
      if (fromSubject?.length) {
        setChapters(fromSubject as IChapter[]);
        return;
      }
      try {
        const response = await api.subjects.getChapters(selectedSubject);
        setChapters(response.data?.data || response.data?.chapters || []);
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
      }
    };
    fetchChapters();
  }, [selectedSubject, subjects]);

  const subjectName = React.useCallback((v?: string) => (v ? subjects.find((s) => s._id === v)?.name || v : ""), [subjects]);

  const parseWithAI = async () => {
    if (uploadMode === "file" && !file) {
      toast({ title: "Error", description: "Please select a file", variant: "destructive" });
      return;
    }
    if (uploadMode === "text" && !textContent.trim()) {
      toast({ title: "Error", description: "Please enter some text content", variant: "destructive" });
      return;
    }

    setParsing(true);
    setParsingProgress(10);
    const started = Date.now();

    try {
      let response;

      if (uploadMode === "file" && file) {
        // Always parse files as a background job and poll: a synchronous parse of a long or scanned file can run
        // past Cloudflare's 100 s proxy limit. The job survives a service restart (ai_jobs).
        setParsingProgress(20);
        const jobResponse = await api.aiParsing.parseFile(file);
        const jobId = jobResponse.data.data.jobId;
        const deadline = Date.now() + 15 * 60 * 1000;

        while (!response) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (Date.now() > deadline) throw new Error("Parsing is taking too long. Try a smaller file.");
          const statusResponse = await api.aiParsing.getJobStatus(jobId);
          const status = statusResponse.data.data;

          setParsingProgress(Math.max(20, Math.min(status.progress || 50, 95)));

          if (status.status === "completed") {
            response = { data: { success: true, data: status } };
          } else if (status.status === "failed") {
            throw new Error(status.errors?.join(", ") || "Parsing failed");
          }
        }
        setParsingProgress(100);
      } else {
        // Parse text content
        setParsingProgress(30);
        response = await api.aiParsing.parseText(textContent);
        setParsingProgress(100);
      }

      if (!response) {
        throw new Error("Failed to get parsing response");
      }

      const data = response.data.data;

      if (!data?.questions) {
        throw new Error("No questions found in response");
      }

      const editableQuestions: EditableQuestion[] = data.questions.map((q) => ({
        ...q,
        isSelected: true,
        isEditing: false,
        editedSubject: selectedSubject || q.subject,
        editedChapter: selectedChapter || q.chapter,
        editedDifficulty: q.difficulty || defaultDifficulty,
      }));
      // A question with no answer in the key or without options can't be scored: left unselected until fixed.
      for (const q of editableQuestions) if (checkQuestion(q).tone === "bad") q.isSelected = false;

      setParsedQuestions(editableQuestions);
      const invalidQs = data.invalidQuestions || [];
      setInvalidQuestions(invalidQs);
      setParseSeconds(Math.round((Date.now() - started) / 1000));

      const validCount = editableQuestions.length;
      const invalidCount = invalidQs.length;

      toast({
        title: "Parsing Complete",
        description: `Found ${validCount} valid questions and ${invalidCount} invalid questions`,
      });

      const flagged = editableQuestions.some((q) => checkQuestion(q).tone !== "ok") || invalidCount > 0;
      setView(flagged ? "flagged" : "all");
      setPage(0);
      setStep("preview");
    } catch (error) {
      console.error("Failed to parse:", error);
      toast({
        title: "Parsing Failed",
        description: error instanceof Error ? error.message : "Failed to parse content with AI",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
      setParsingProgress(0);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setParsedQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, isSelected: !q.isSelected } : q)));
  };

  const toggleAllSelection = (selected: boolean) => {
    setParsedQuestions((prev) => prev.map((q) => ({ ...q, isSelected: selected })));
  };

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEditDialog = (question: EditableQuestion) => {
    setEditingQuestion({ ...question });
    setEditDialogOpen(true);
  };

  const saveEditedQuestion = () => {
    if (!editingQuestion) return;
    setParsedQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? editingQuestion : q)));
    setEditDialogOpen(false);
    setEditingQuestion(null);
  };

  const resetToUpload = () => {
    setStep("upload");
    setParsedQuestions([]);
    setInvalidQuestions([]);
    setExpandedQuestions(new Set());
  };

  const uploadQuestions = async () => {
    const selectedQuestions = parsedQuestions.filter((q) => q.isSelected);

    if (selectedQuestions.length === 0) {
      toast({ title: "Error", description: "No questions selected", variant: "destructive" });
      return;
    }

    const missingMetadata = selectedQuestions.filter((q) => !q.editedSubject || !q.editedChapter);
    if (missingMetadata.length > 0) {
      toast({
        title: "Missing Information",
        description: `${missingMetadata.length} question(s) are missing subject or chapter. Please edit them.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const questionsToSave = selectedQuestions.map((q) => ({
        type: q.type,
        difficulty: q.editedDifficulty || q.difficulty,
        en: q.en,
        hi: q.hi,
        correctAnswers: q.correctAnswers,
        subject: q.editedSubject || q.subject || "",
        chapters: [{ name: q.editedChapter || q.chapter || "", topics: q.topics || [] }],
        sources: ["AI Parsed"],
      }));

      const response = await api.aiParsing.confirmQuestions(questionsToSave);
      const created = response.data?.data?.created ?? selectedQuestions.length;
      setSavedCount(created);

      toast({ title: "Success", description: `Successfully created ${created} questions` });
      setStep("complete");
    } catch (error) {
      console.error("Failed to upload questions:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to save questions",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Review rows: flagged first (bad, then warn), then the rest, each in paper order.
  const rows = React.useMemo(
    () => parsedQuestions.map((q, i) => ({ q, n: i + 1, flag: checkQuestion(q) })),
    [parsedQuestions]
  );
  const flaggedRows = React.useMemo(
    () => rows.filter((r) => r.flag.tone !== "ok").sort((a, b) => (a.flag.tone === b.flag.tone ? a.n - b.n : a.flag.tone === "bad" ? -1 : 1)),
    [rows]
  );
  const needsLook = flaggedRows.length + invalidQuestions.length;
  const visible = view === "flagged" ? flaggedRows : rows;
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE));
  const pageRows = visible.slice(page * PAGE, page * PAGE + PAGE);
  const selectedCount = parsedQuestions.filter((q) => q.isSelected).length;
  const skipCount = parsedQuestions.length - selectedCount;
  const foundSubjects = [...new Set(parsedQuestions.map((q) => subjectName(q.editedSubject || q.subject)).filter(Boolean))];

  const currentStep: 1 | 2 | 3 | 4 | 5 = step === "complete" ? 5 : step === "preview" ? (uploading ? 4 : 3) : parsing ? 2 : 1;
  const fileExt = file?.name.split(".").pop()?.toUpperCase().slice(0, 4) || "TXT";

  return (
    <>
      <Topbar title="Import questions" back={{ href: "/questions", label: "Bank" }} />
      <main className="col gap-4 px-7 pt-5 pb-10">
        <Steps current={currentStep} />

        {step === "upload" && (
          <section className="grid gap-3.5 lg:grid-cols-3">
            <div className="col gap-3 lg:col-span-2">
              <div className="row between">
                <div className="seg" role="tablist" aria-label="Source">
                  <button type="button" role="tab" aria-selected={uploadMode === "file"} className={`tab ${uploadMode === "file" ? "on" : ""}`} onClick={() => setUploadMode("file")}>
                    File
                  </button>
                  <button type="button" role="tab" aria-selected={uploadMode === "text"} className={`tab ${uploadMode === "text" ? "on" : ""}`} onClick={() => setUploadMode("text")}>
                    Paste text
                  </button>
                </div>
                <span className="xs muted">PDF, images or text. Equations come back as LaTeX.</span>
              </div>

              {uploadMode === "file" ? (
                <label
                  htmlFor="file"
                  className={`bu-drop col cursor-pointer items-center justify-center gap-2 p-8 text-center ${file ? "has-file" : ""} ${dragOver ? "over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setFile(f);
                  }}
                >
                  <input
                    id="file"
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFile(f);
                    }}
                  />
                  {file ? (
                    <span className="row w-full gap-3 text-left">
                      <span className="bu-file">{fileExt}</span>
                      <span className="col grow gap-0.5">
                        <span className="sm font-semibold">{file.name}</span>
                        <span className="xs muted">{(file.size / 1024).toFixed(1)} KB · click to choose another file</span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon w-8"
                        aria-label="Remove file"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </span>
                  ) : (
                    <>
                      <span className="grid size-11 place-items-center rounded-tile bg-brand-50 text-brand">
                        <FileText className="size-5" aria-hidden />
                      </span>
                      <span className="sm font-semibold">Drop a question paper here, or choose a file</span>
                      <span className="xs muted">PDF, PNG, JPG, WebP or TXT</span>
                    </>
                  )}
                </label>
              ) : (
                <div className="field">
                  <Label htmlFor="text">Paste question text</Label>
                  <Textarea
                    id="text"
                    placeholder={"Paste your questions here...\n\nExample format:\nQ1. What is the capital of France?\n(a) London\n(b) Paris *\n(c) Berlin\n(d) Madrid\n\nSolution: Paris is the capital city of France."}
                    className="min-h-[220px] bg-surface font-mono text-sm"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  />
                </div>
              )}

              {parsing && (
                <div className="col gap-1.5" aria-live="polite">
                  <div className="row between xs">
                    <span className="font-semibold">Parsing with AI…</span>
                    <span className="muted num">{parsingProgress}%</span>
                  </div>
                  <div className="bar h-1.5">
                    <i style={{ width: `${parsingProgress}%`, transition: "width 400ms var(--ease)" }} />
                  </div>
                </div>
              )}

              <div className="row justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={parseWithAI}
                  disabled={parsing || (uploadMode === "file" ? !file : !textContent.trim())}
                  aria-busy={parsing || undefined}
                >
                  {parsing ? (
                    <>
                      <span className="spin size-4 rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                      Parsing…
                    </>
                  ) : (
                    "Parse with AI"
                  )}
                </button>
              </div>
            </div>

            <aside className="card pad-lg col gap-3 self-start">
              <span className="h3">Defaults</span>
              <span className="xs muted">Applied to every parsed question; you can still change them per question.</span>
              <div className="field">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedChapter(""); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select subject (optional)" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <Label>Chapter</Label>
                <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select chapter (optional)" /></SelectTrigger>
                  <SelectContent>
                    {chapters.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <Label>Difficulty</Label>
                <Select value={defaultDifficulty} onValueChange={(v) => setDefaultDifficulty(v as Difficulty)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col gap-1 rounded-control bg-ground p-3">
                <span className="xs font-semibold">For the best results</span>
                <ul className="xs muted col gap-0.5">
                  <li>Number the questions (Q1, Q2, …)</li>
                  <li>Label options (a), (b), (c), (d)</li>
                  <li>Mark correct answers with * or bold</li>
                  <li>Start solutions with “Solution:”</li>
                </ul>
              </div>
            </aside>
          </section>
        )}

        {step === "preview" && (
          <>
            <section className="grid gap-3.5 lg:grid-cols-3">
              <div className="bu-drop has-file col rise gap-2.5 p-[18px] lg:col-span-2">
                <div className="row gap-3">
                  <span className="bu-file">{uploadMode === "file" ? fileExt : "TXT"}</span>
                  <span className="col grow gap-0.5">
                    <span className="sm font-semibold">{uploadMode === "file" && file ? file.name : "Pasted text"}</span>
                    <span className="xs muted">
                      {uploadMode === "file" && file ? `${file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`} · ` : ""}
                      {parsedQuestions.length} questions found
                      {foundSubjects.length ? ` · ${foundSubjects.join(", ")}` : ""}
                    </span>
                  </span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={resetToUpload}>
                    Replace
                  </button>
                </div>
                <div className="col gap-1.5">
                  <div className="row between xs">
                    <span className="font-semibold">Parsed with AI{parseSeconds !== null ? ` in ${parseSeconds} s` : ""}</span>
                    <span className="muted num">
                      {parsedQuestions.length} of {parsedQuestions.length + invalidQuestions.length}
                    </span>
                  </div>
                  <div className="bar h-1.5">
                    <i className="bg-success" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
              <div className="card pad col rise gap-2" style={{ ["--i" as string]: 1 }}>
                <span className="sm muted">Ready to import</span>
                <span className="num text-[28px] font-[650] tracking-[-.01em]">
                  {selectedCount}
                  <span className="sm muted"> of {parsedQuestions.length}</span>
                </span>
                <div className="row wrap gap-1.5">
                  {flaggedRows.length > 0 && <span className="badge b-amber">{flaggedRows.length} need a look</span>}
                  {invalidQuestions.length > 0 && <span className="badge b-red">{invalidQuestions.length} couldn&apos;t be read</span>}
                  {needsLook === 0 && <span className="badge b-green">All look good</span>}
                </div>
              </div>
            </section>

            <section className="card scrollx rise" style={{ ["--i" as string]: 2 }}>
              <div className="pad row between wrap gap-2.5 border-b border-line-2">
                <div className="seg" role="tablist" aria-label="Rows">
                  <button type="button" role="tab" aria-selected={view === "flagged"} className={`tab ${view === "flagged" ? "on" : ""}`} onClick={() => { setView("flagged"); setPage(0); }}>
                    Needs a look <span className="count">{needsLook}</span>
                  </button>
                  <button type="button" role="tab" aria-selected={view === "all"} className={`tab ${view === "all" ? "on" : ""}`} onClick={() => { setView("all"); setPage(0); }}>
                    All <span className="count">{parsedQuestions.length}</span>
                  </button>
                </div>
                <span className="xs muted">{view === "flagged" ? "Problems first, then warnings, each in paper order" : "In paper order"}</span>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        className="check"
                        aria-label="Select all"
                        checked={parsedQuestions.length > 0 && selectedCount === parsedQuestions.length}
                        onChange={(e) => toggleAllSelection(e.target.checked)}
                      />
                    </th>
                    <th className="w-12">#</th>
                    <th>Question</th>
                    <th>Subject</th>
                    <th>Answer</th>
                    <th>Check</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ q, n, flag }) => {
                    const open = expandedQuestions.has(q.id);
                    return (
                      <React.Fragment key={q.id}>
                        <tr className={flag.tone === "bad" ? "bg-[#FFF5F5]" : flag.tone === "warn" ? "bg-[#FFFBF3]" : ""}>
                          <td>
                            <input type="checkbox" className="check" aria-label={`Select question ${n}`} checked={q.isSelected} onChange={() => toggleQuestionSelection(q.id)} />
                          </td>
                          <td className="mono sm">{n}</td>
                          <td className="max-w-[460px]">
                            <MathText html as="div" className="sm bu-clamp font-serif" text={q.en?.question || ""} />
                          </td>
                          <td className="sm">{subjectName(q.editedSubject || q.subject) || <span className="muted">—</span>}</td>
                          <td className={`mono sm ${q.correctAnswers?.length ? "" : "text-danger"}`}>{answerLetters(q)}</td>
                          <td>
                            <span className={`badge ${FLAG_CLASS[flag.tone]}`}>{flag.label}</span>
                          </td>
                          <td>
                            <div className="row justify-end gap-1">
                              <button type="button" className="btn btn-ghost btn-sm" aria-expanded={open} onClick={() => toggleQuestionExpanded(q.id)}>
                                {open ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                                Preview
                              </button>
                              <button type="button" className={`btn btn-sm ${flag.tone === "ok" ? "btn-ghost" : "btn-secondary"}`} onClick={() => openEditDialog(q)}>
                                {flag.tone === "bad" && flag.label.startsWith("No answer") ? "Set answer" : "Edit"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="hover:bg-transparent">
                            <td />
                            <td colSpan={6} className="bg-ground/60">
                              <div className="col gap-3 py-1">
                                <MathText html as="div" className="body font-serif" text={q.en?.question || ""} />
                                <div className="grid gap-2 md:grid-cols-2">
                                  {q.en?.options?.map((opt, i) => (
                                    <div key={opt.id} className={`opt ${q.correctAnswers.includes(opt.id) ? "correct" : ""}`}>
                                      <span className="key">{LETTERS[i] ?? opt.id}</span>
                                      <MathText html as="div" className="sm font-serif" text={opt.value} />
                                    </div>
                                  ))}
                                </div>
                                {q.en?.solution && (
                                  <div className="col gap-1">
                                    <span className="eyebrow">Solution</span>
                                    <MathText html as="div" className="sm muted font-serif" text={q.en.solution} />
                                  </div>
                                )}
                                <span className="xs muted">
                                  {q.type === "multiple" ? "Multiple correct" : "Single correct"} · {q.editedDifficulty || q.difficulty} · chapter {q.editedChapter || q.chapter || "not set"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {view === "flagged" &&
                    page === pageCount - 1 &&
                    invalidQuestions.map((item, i) => (
                      <tr key={`invalid-${i}`} className="bg-[#FFF5F5]">
                        <td />
                        <td className="mono sm muted">—</td>
                        <td className="max-w-[460px]">
                          <MathText html as="div" className="sm bu-clamp font-serif" text={item.question?.en?.question || "Unreadable question"} />
                        </td>
                        <td className="sm muted">—</td>
                        <td className="mono sm muted">—</td>
                        <td>
                          <span className="badge b-live">Couldn&apos;t be read · {item.reason}</span>
                        </td>
                        <td className="xs muted text-right">Skipped</td>
                      </tr>
                    ))}
                  {visible.length === 0 && (view === "all" || invalidQuestions.length === 0) && (
                    <tr>
                      <td colSpan={7} className="sm muted py-8 text-center">
                        {view === "flagged" ? "Nothing to look at: every question passed the checks." : "No questions were found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="row between px-4 py-3">
                <span className="xs muted">
                  {visible.length ? `Showing ${page * PAGE + 1}–${Math.min(visible.length, (page + 1) * PAGE)} of ${visible.length}` : ""}
                  {view === "flagged" && invalidQuestions.length > 0 ? `${visible.length ? " · " : ""}${invalidQuestions.length} couldn't be read` : ""}
                </span>
                {pageCount > 1 && (
                  <div className="row gap-1.5">
                    <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
                  </div>
                )}
              </div>
            </section>

            {/* Bulk metadata: set subject/chapter on every selected question at once */}
            <section className="card pad row wrap items-end gap-2.5">
              <div className="field">
                <Label className="text-xs">Subject for selected</Label>
                <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setSelectedChapter(""); }}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <Label className="text-xs">Chapter for selected</Label>
                <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedSubject}>
                  <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select chapter" /></SelectTrigger>
                  <SelectContent>
                    {chapters.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="secondary"
                disabled={!selectedSubject || !selectedChapter || selectedCount === 0}
                onClick={() => {
                  setParsedQuestions((prev) =>
                    prev.map((q) => (q.isSelected ? { ...q, editedSubject: selectedSubject, editedChapter: selectedChapter } : q))
                  );
                  toast({ title: "Applied", description: `Subject and chapter set on ${selectedCount} selected question(s).` });
                }}
              >
                Apply to {selectedCount} selected
              </Button>
            </section>

            <div className="row between wrap gap-2.5">
              <button type="button" className="btn btn-ghost" onClick={() => setStep("upload")}>
                Back
              </button>
              <div className="row gap-2">
                {flaggedRows.length > 0 && view !== "flagged" && (
                  <button type="button" className="btn btn-ghost" onClick={() => { setView("flagged"); setPage(0); }}>
                    Review {flaggedRows.length} flagged
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={uploadQuestions} disabled={uploading || selectedCount === 0} aria-busy={uploading || undefined}>
                  {uploading ? "Importing…" : `Import ${selectedCount}${skipCount > 0 ? `, skip ${skipCount}` : ""}`}
                </button>
              </div>
            </div>
          </>
        )}

        {step === "complete" && (
          <section className="card col items-center gap-2 px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-success-50 text-success">
              <Check className="size-6" aria-hidden />
            </span>
            <h2 className="h2 mt-2">Import complete</h2>
            <p className="sm muted">{savedCount} questions were added to the bank.</p>
            <div className="row mt-4 gap-2">
              <Link href="/questions" className="btn btn-secondary">
                View questions
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  resetToUpload();
                  setFile(null);
                  setTextContent("");
                }}
              >
                <Upload className="size-4" aria-hidden />
                Import more
              </button>
            </div>
          </section>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit question</DialogTitle>
              <DialogDescription>Fix the parsed text, answer and tags before importing. Write equations as LaTeX ($…$).</DialogDescription>
            </DialogHeader>

            {editingQuestion && (
              <div className="col max-h-[65vh] gap-4 overflow-y-auto pr-1">
                <div className="field">
                  <Label>Question text</Label>
                  <Textarea
                    value={editingQuestion.en.question}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, en: { ...editingQuestion.en, question: e.target.value } })}
                    rows={3}
                  />
                  <MathText html as="div" className="sm rounded-control bg-ground p-2.5 font-serif" text={editingQuestion.en.question} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="field">
                    <Label>Subject</Label>
                    <Select value={editingQuestion.editedSubject || ""} onValueChange={(v) => setEditingQuestion({ ...editingQuestion, editedSubject: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="field">
                    <Label>Chapter</Label>
                    <Select value={editingQuestion.editedChapter || ""} onValueChange={(v) => setEditingQuestion({ ...editingQuestion, editedChapter: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select chapter" /></SelectTrigger>
                      <SelectContent>
                        {(subjects.find((s) => s._id === editingQuestion.editedSubject)?.chapters ?? chapters).map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="field">
                    <Label>Type</Label>
                    <Select value={editingQuestion.type} onValueChange={(v) => setEditingQuestion({ ...editingQuestion, type: v as "single" | "multiple" })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single answer</SelectItem>
                        <SelectItem value="multiple">Multiple answers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="field">
                    <Label>Difficulty</Label>
                    <Select
                      value={editingQuestion.editedDifficulty || editingQuestion.difficulty}
                      onValueChange={(v) => setEditingQuestion({ ...editingQuestion, editedDifficulty: v as Difficulty })}
                    >
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="field">
                  <Label>Correct answers</Label>
                  <div className="row wrap gap-2">
                    {editingQuestion.en.options.map((opt, i) => {
                      const on = editingQuestion.correctAnswers.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={on}
                          className={`chip ${on ? "on" : ""}`}
                          onClick={() => {
                            const newAnswers = on
                              ? editingQuestion.correctAnswers.filter((a) => a !== opt.id)
                              : [...editingQuestion.correctAnswers, opt.id];
                            setEditingQuestion({ ...editingQuestion, correctAnswers: newAnswers });
                          }}
                        >
                          {LETTERS[i] ?? opt.id.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="field">
                  <Label>Solution (optional)</Label>
                  <Textarea
                    value={editingQuestion.en.solution || ""}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, en: { ...editingQuestion.en, solution: e.target.value } })}
                    rows={2}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveEditedQuestion}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
