"use client";

/*
  AI drafts review (board: Admin-AIDrafts). Ready drafts side by side with the question's current values, accept or
  discard each, Accept all / Discard all (inline confirm), drafts that could not be made with "Try again".
  ?jobId= shows one bulk run's drafts (from the Questions bulk bar), ?questionId= one question's (from the editor).
  Owner decision: Accept all leaves out solution drafts whose answer differs from the key and drafts whose question
  was edited since (DRAFT_STALE); those need their own "Accept" / "Accept anyway".
  Contract: api-ai docs/m5-api.md ("ai: drafts").
  M6 (docs/m6-api.md "Image to LaTeX", "Assist on paragraph and matrix"): `latex` drafts (the image vs the LaTeX
  read from it; Accept replaces exactly that image with $…$), paragraph translations (Hindi passage + every child)
  and per-child solutions (Agrees / Differs each), matrix translations (stem + List I / List II rows) and solutions
  checked against the ticked matches. Sample drafts (ids "sample-…", made while the backend lacks a feature) are
  accepted/discarded locally only.
*/
import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Check, Sparkles, X, AlertCircle, XCircle } from "lucide-react";
import { MathText } from "@iitpulse/ui";
import { Topbar } from "@/components/admin/Topbar";
import { useToast } from "@/hooks/use-toast";
import { aiAdmin, apiError, BULK_COPY, editorKind, KIND_LABEL, streamAssist, TYPE_LABEL, type DraftQuery } from "@/lib/ai-admin";
import { fetchQuestion, stripHtml, type BankQuestion } from "@/lib/question-queries";
import type { AiDraft, DraftKind, SolutionPayload, TagsPayload, TranslationPayload } from "@/lib/m5-contract";
import type { LatexPayload, SolutionPayloadM6, TranslationPayloadM6 } from "@/lib/m6-contract";
import { acceptDraft, assistM6, discardDraft, isSampleDraft, sampleDraft } from "@/lib/m6/questions";
import { childKeyLabel, matrixOf } from "@/components/question-body";
import "./drafts.css";

type KindTab = "all" | DraftKind;
const KIND_TABS: [KindTab, string][] = [
  ["all", "All"],
  ["solution", "Solutions"],
  ["translation", "Hindi"],
  ["tags", "Tags"],
];
type Local = { state: "accepted" | "discarded" | "stale"; changed?: string[] };

/** M6 adds the `latex` kind ("Convert with AI": an image of an equation read as LaTeX). */
const isLatex = (d: AiDraft) => (d.kind as string) === "latex";
const kindLabel = (d: AiDraft) => (isLatex(d) ? "LaTeX" : KIND_LABEL[d.kind]);
/** Paragraph per-child solutions: the worst agreement (one child differing makes the draft differ). */
function agreementOf(d: AiDraft): "agrees" | "disagrees" | "unknown" | undefined {
  if (d.kind !== "solution") return undefined;
  const kids = (d.payload as SolutionPayloadM6 | null)?.children;
  if (kids?.length) return kids.some((c) => c.keyAgreement === "disagrees") ? "disagrees" : kids.every((c) => c.keyAgreement === "agrees") ? "agrees" : "unknown";
  return d.checks.keyAgreement;
}

const GROUP_WORDS: Record<string, string> = {
  en: "English text",
  hi: "Hindi text",
  key: "answer key",
  subject: "subject",
  chapters: "chapter",
  topics: "topic",
  difficulty: "difficulty",
};
const LEVEL: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const LETTER = (i: number) => String.fromCharCode(65 + i);

/* ---------- answer key helpers ---------- */

function keyLetters(q: BankQuestion | null | undefined, ids: string[] | undefined): string[] {
  if (!q || !ids?.length) return [];
  const opts = q.en?.options ?? [];
  return ids.map((id) => {
    const i = opts.findIndex((o) => o.id === id);
    return i >= 0 ? LETTER(i) : "?";
  });
}

function keyText(q: BankQuestion | null | undefined): string | null {
  if (!q) return null;
  if (q._kind === "numerical") {
    const a = q.correctAnswer;
    if (!a || Array.isArray(a)) return null;
    if (a.from == null) return null;
    return a.to != null && a.to !== a.from ? `${a.from} to ${a.to}` : String(a.from);
  }
  const l = keyLetters(q, q.correctAnswers);
  return l.length ? `(${l.join(", ")})` : null;
}

function statedText(p: SolutionPayload | null, q: BankQuestion | null | undefined): string | null {
  const s = p?.statedAnswer;
  if (!s) return null;
  if (s.value !== undefined && s.value !== null) return String(s.value);
  const l = keyLetters(q, s.optionIds);
  return l.length ? `(${l.join(", ")})` : null;
}

/** The question behind a card (chapter badge, answer key, English stem). */
function useBankQuestion(d: AiDraft, enabled: boolean) {
  return useQuery({
    queryKey: ["questions", "full", d.questionId],
    enabled,
    staleTime: 60_000,
    queryFn: () => fetchQuestion(d.questionId, editorKind(d.question.type)),
  });
}

/* ---------- pieces ---------- */

function OpenLink({ d }: { d: AiDraft }) {
  return (
    <Link href={`/questions/${d.questionId}/edit?type=${editorKind(d.question.type)}`} className="btn btn-ghost btn-sm">
      Open question
    </Link>
  );
}

function Head({ d, q, ai = true, showStem = false }: { d: AiDraft; q?: BankQuestion | null; ai?: boolean; showStem?: boolean }) {
  const chapter = q?.chapters?.[0]?.name;
  return (
    <div className="aid-head">
      <span className={`badge ${ai ? "b-navy" : "b-grey"}`}>
        {ai && <Sparkles className="size-3" aria-hidden />}
        {kindLabel(d)}
      </span>
      <span className="mono sm">{d.questionId}</span>
      {!showStem && chapter && <span className="badge b-grey max-w-[220px] truncate">{chapter}</span>}
      <span className="badge b-grey">{TYPE_LABEL[d.question.type] ?? d.question.type}</span>
      {showStem ? (
        <span className="sm muted min-w-0 flex-[1_1_200px] truncate font-serif">
          <MathText text={d.question.stemPreview} />
        </span>
      ) : (
        <span className="grow" />
      )}
      <OpenLink d={d} />
    </div>
  );
}

function SolutionCmp({ d, q }: { d: AiDraft; q: BankQuestion | null | undefined }) {
  const cur = d.current as SolutionPayload | null;
  const p = d.payload as SolutionPayload | null;
  const has = !!cur && (stripHtml(cur.solution).length > 0 || /<img/i.test(cur.solution ?? ""));
  const key = keyText(q);
  const keyOpt =
    q && q._kind !== "numerical" && q.correctAnswers?.length === 1 ? (q.en?.options ?? []).find((o) => o.id === q.correctAnswers![0])?.value : undefined;
  return (
    <div className="aid-cmp">
      <div>
        <span className="aid-cap">Now</span>
        {has ? <MathText html as="div" className="aid-sol sm font-serif" text={cur!.solution} /> : <span className="sm muted">No solution</span>}
        {key && (
          <span className="sm">
            Answer key: <b>{key}</b> {keyOpt && <MathText html as="span" className="font-serif [&_p]:inline [&_p]:m-0" text={keyOpt} />}
          </span>
        )}
      </div>
      <div>
        <span className="aid-cap">Draft</span>
        <MathText as="div" className="aid-sol font-serif" text={p?.solution ?? ""} />
      </div>
    </div>
  );
}

function TranslationCmp({ d, q }: { d: AiDraft; q: BankQuestion | null | undefined }) {
  const cur = (d.current as TranslationPayload | null)?.hi ?? null;
  const p = (d.payload as TranslationPayload | null)?.hi;
  const enStem = q?.en?.question ?? "";
  const copy = !!cur && !!enStem && stripHtml(cur.question) === stripHtml(enStem);
  return (
    <div className="aid-cmp">
      <div>
        <span className="aid-cap">Now</span>
        {!cur || !stripHtml(cur.question) ? (
          <>
            <span className="badge b-grey self-start">No Hindi yet</span>
            {(enStem || d.question.stemPreview) && (
              <MathText html as="div" className="aid-sol muted text-[14px]" text={enStem || d.question.stemPreview} />
            )}
          </>
        ) : (
          <>
            {copy && <span className="badge b-amber self-start">Hindi is a copy of the English</span>}
            <MathText html as="div" className={`aid-sol text-[14px] ${copy ? "muted" : ""}`} text={cur.question} />
          </>
        )}
      </div>
      <div>
        <span className="aid-cap">Draft</span>
        <div lang="hi">
          <MathText html as="div" className="aid-sol" text={p?.question ?? ""} />
        </div>
        {!!p?.options?.length && (
          <div className="aid-hopts" lang="hi">
            {p.options.map((o, i) => (
              <span key={o.id}>
                ({LETTER(i)}) <MathText html as="span" className="[&_p]:inline [&_p]:m-0" text={o.value} />
              </span>
            ))}
          </div>
        )}
        {p?.solution && <span className="xs muted">Solution translated too</span>}
      </div>
    </div>
  );
}

function names(xs: Array<{ name: string }> | undefined) {
  return (xs ?? []).map((x) => x.name).join(", ");
}

function TagsCmp({ d }: { d: AiDraft }) {
  const cur = d.current as TagsPayload | null;
  const p = d.payload as TagsPayload | null;
  const rows: [string, string, string][] = [
    ["Chapter", names(cur?.chapters), names(p?.chapters)],
    ["Topic", names(cur?.topics), names(p?.topics)],
    ["Difficulty", LEVEL[cur?.difficulty ?? ""] ?? "", LEVEL[p?.difficulty ?? ""] ?? ""],
  ];
  const cell = (v: string, chg: boolean) => (v ? chg ? <span><span className="aid-chg">{v}</span></span> : <span>{v}</span> : <span className="muted">None</span>);
  return (
    <div className="aid-cmp">
      <div>
        <span className="aid-cap">Now</span>
        <div className="aid-tagrow">
          {rows.map(([l, now]) => (
            <React.Fragment key={l}>
              <span className="muted">{l}</span>
              {cell(now, false)}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div>
        <span className="aid-cap">Draft</span>
        <div className="aid-tagrow">
          {rows.map(([l, now, draft]) => (
            <React.Fragment key={l}>
              <span className="muted">{l}</span>
              {cell(draft, draft !== now)}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- M6: paragraph, matrix and image-to-LaTeX drafts ---------- */

const HI_BLOCK = "aid-sol text-[14px] [&_p]:my-0";

/** The image the draft reads, from the question's HTML (the draft names its src). */
function LatexCmp({ d }: { d: AiDraft }) {
  const p = d.payload as unknown as LatexPayload | null;
  return (
    <div className="aid-cmp">
      <div>
        <span className="aid-cap">Now</span>
        <span className="row wrap items-center gap-2">
          {p?.imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageSrc} alt="Equation as an image" className="max-h-24 max-w-full rounded-lg border border-dashed border-[#E3B25C] bg-surface p-1.5" />
          ) : (
            <span className="sm muted">Image not found</span>
          )}
        </span>
        <span className="row gap-1.5">
          <span className="badge b-amber">Equation is an image · needs LaTeX</span>
        </span>
        {p?.field && <span className="xs muted">In {fieldLabel(p.field)}</span>}
      </div>
      <div>
        <span className="aid-cap">Draft · read from the image</span>
        <code className="mono self-start rounded bg-brand-50 px-1.5 py-0.5 text-[13px] text-brand">${p?.latex ?? ""}$</code>
        <MathText as="div" className="aid-sol font-serif" text={p?.latex ? `$${p.latex}$` : ""} />
        <span className="xs muted">Accept replaces the image with this LaTeX and removes the flag. Discard keeps the flag.</span>
      </div>
    </div>
  );
}

/** "en.options.D" → "option D", "passage.en" → "the passage", "questions.2.en.solution" → "Q3 solution" … */
function fieldLabel(f: string): string {
  const m = /^questions\.(\d+)\.(en|hi)\.(\w+)(?:\.(\w+))?/.exec(f);
  if (m) return `Q${Number(m[1]) + 1} ${m[3] === "options" ? `option ${m[4] ?? ""}` : m[3]}`.trim();
  if (/^passage/.test(f)) return "the passage";
  const r = /^matrix\.(listI|listII)\.(\w+)/.exec(f);
  if (r) return `${r[1] === "listI" ? "List I" : "List II"} row ${r[2]}`;
  const o = /^(en|hi)\.options\.(\w+)/.exec(f);
  if (o) return `option ${o[2]}`;
  if (/solution/.test(f)) return "the solution";
  return "the question";
}

function ParagraphTranslationCmp({ d, q }: { d: AiDraft; q: BankQuestion | null | undefined }) {
  const p = (d.payload as unknown as TranslationPayloadM6 | null)?.hi;
  const kids = q?.questions ?? [];
  const enPassage = q?.passage?.en || (typeof q?.paragraph === "string" ? q.paragraph : "") || d.question.stemPreview;
  const curHi = q?.passage?.hi;
  return (
    <div className="aid-cmp">
      <div>
        <span className="aid-cap">Now</span>
        {curHi && stripHtml(curHi) ? <MathText html as="div" className={HI_BLOCK} text={curHi} /> : (
          <>
            <span className="badge b-grey self-start">No Hindi passage yet</span>
            <MathText html as="div" className={`${HI_BLOCK} muted`} text={enPassage} />
          </>
        )}
        <span className="xs muted">{kids.length === 1 ? "1 question" : `${kids.length} questions`} on this passage</span>
      </div>
      <div lang="hi">
        <span className="aid-cap">Draft</span>
        {p?.passage && <MathText html as="div" className={HI_BLOCK} text={p.passage} />}
        {(p?.children ?? []).map((c, i) => (
          <div key={c.id} className="col gap-1 border-t border-line-2 pt-2">
            <span className="xs mono muted">Q{i + 1}</span>
            <MathText html as="div" className={HI_BLOCK} text={c.question} />
            {!!c.options?.length && (
              <div className="aid-hopts">
                {c.options.map((o, j) => (
                  <span key={o.id}>
                    ({LETTER(j)}) <MathText html as="span" className="[&_p]:inline [&_p]:m-0" text={o.value} />
                  </span>
                ))}
              </div>
            )}
            {c.solution && <span className="xs muted">Solution translated too</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatrixTranslationCmp({ d, q }: { d: AiDraft; q: BankQuestion | null | undefined }) {
  const p = (d.payload as unknown as TranslationPayloadM6 | null)?.hi;
  const m = q ? matrixOf(q) : null;
  const rows = (list: Array<{ id: string; value: string }> | undefined, label: string) =>
    list?.length ? (
      <div className="col gap-1">
        <span className="xs font-semibold text-muted">{label}</span>
        {list.map((r) => (
          <span key={r.id} className="row items-baseline gap-1.5 text-[14px]">
            <b className="mono">{r.id}</b>
            <MathText html as="span" className="[&_p]:inline [&_p]:m-0" text={r.value} />
          </span>
        ))}
      </div>
    ) : null;
  return (
    <div className="aid-cmp">
      <div>
        <span className="aid-cap">Now</span>
        {q?.hi?.question && stripHtml(q.hi.question) ? <MathText html as="div" className={HI_BLOCK} text={q.hi.question} /> : (
          <>
            <span className="badge b-grey self-start">No Hindi yet</span>
            <MathText html as="div" className={`${HI_BLOCK} muted`} text={q?.en?.question || d.question.stemPreview} />
          </>
        )}
        {m && (
          <span className="xs muted">
            List I rows {m.listI.map((r) => r.id).join(", ")} · List II rows {m.listII.map((r) => r.id).join(", ")}
          </span>
        )}
      </div>
      <div lang="hi">
        <span className="aid-cap">Draft</span>
        <MathText html as="div" className={HI_BLOCK} text={p?.question ?? ""} />
        <div className="grid grid-cols-2 gap-3">
          {rows(p?.matrix?.listI, "List I")}
          {rows(p?.matrix?.listII, "List II")}
        </div>
        {p?.solution && <span className="xs muted">Solution translated too</span>}
      </div>
    </div>
  );
}

function ParagraphSolutionCmp({ d, q }: { d: AiDraft; q: BankQuestion | null | undefined }) {
  const p = d.payload as unknown as SolutionPayloadM6 | null;
  const kids = q?.questions ?? [];
  return (
    <div className="aid-cmp">
      <div>
        <span className="aid-cap">Now</span>
        {(p?.children ?? []).map((c) => {
          const i = kids.findIndex((k) => (k.id || k._id) === c.childId);
          const kid = kids[i];
          return (
            <span key={c.childId} className="sm">
              <b className="mono">Q{i + 1 || "?"}</b> {kid && stripHtml(kid.en?.solution) ? "has a solution" : "No solution"} · key {kid ? childKeyLabel(kid).split(" · ")[1] : "?"}
            </span>
          );
        })}
      </div>
      <div>
        <span className="aid-cap">Draft</span>
        {(p?.children ?? []).map((c) => {
          const i = kids.findIndex((k) => (k.id || k._id) === c.childId);
          return (
            <div key={c.childId} className="col gap-1 border-t border-line-2 pt-2 first:border-0 first:pt-0">
              <span className="row gap-2">
                <span className="xs mono muted">Q{i + 1 || "?"}</span>
                {c.keyAgreement === "agrees" && <span className="badge b-green">Agrees</span>}
                {c.keyAgreement === "disagrees" && <span className="badge b-amber">Differs</span>}
              </span>
              <MathText as="div" className="aid-sol font-serif" text={c.solution} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatrixSolutionCmp({ d, q }: { d: AiDraft; q: BankQuestion | null | undefined }) {
  const p = d.payload as unknown as SolutionPayloadM6 | null;
  const m = q ? matrixOf(q) : null;
  const stated = p?.statedAnswer?.matches;
  return (
    <div className="aid-cmp">
      <div>
        <span className="aid-cap">Now</span>
        {q?.en?.solution && stripHtml(q.en.solution) ? <MathText html as="div" className="aid-sol sm font-serif" text={q.en.solution} /> : <span className="sm muted">No solution</span>}
        {m && (
          <span className="sm">
            Your matches: <b>{m.listI.map((r) => `${r.id}→${(m.matches[r.id] ?? []).join(", ") || "?"}`).join(" · ")}</b>
          </span>
        )}
      </div>
      <div>
        <span className="aid-cap">Draft</span>
        <MathText as="div" className="aid-sol font-serif" text={p?.solution ?? ""} />
        {m && stated && (
          <div className="col gap-1">
            {m.listI.map((r) => {
              const mine = [...(m.matches[r.id] ?? [])].sort().join(",");
              const theirs = [...(stated[r.id] ?? [])].sort().join(",");
              const same = mine === theirs;
              return (
                <span key={r.id} className="row gap-2 text-[12px]">
                  <span className={`badge ${same ? "b-green" : "b-amber"}`}>{same ? "Agrees" : "Differs"}</span>
                  Row {r.id}: draft says {theirs || "none"}
                  {same ? "" : `; you ticked ${mine || "nothing"}`}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DraftCard({
  d,
  i,
  local,
  busy,
  onAccept,
  onDiscard,
}: {
  d: AiDraft;
  i: number;
  local: Local | undefined;
  busy: boolean;
  onAccept: (d: AiDraft, force: boolean) => void;
  onDiscard: (d: AiDraft) => void;
}) {
  const q = useBankQuestion(d, d.kind !== "tags" && !isLatex(d)).data;
  if (local && local.state !== "stale") {
    return (
      <div className="aid-closed pop">
        <span className={`badge ${local.state === "accepted" ? "b-green" : "b-grey"}`}>{local.state === "accepted" ? "Accepted" : "Discarded"}</span>
        <span className="sm">
          {kindLabel(d)} for <span className="mono">{d.questionId}</span>
        </span>
      </div>
    );
  }
  const stale = local?.state === "stale";
  const agreement = agreementOf(d);
  const qt = d.question.type;
  const disagrees = agreement === "disagrees";
  const key = keyText(q);
  const said = statedText(d.payload as SolutionPayload | null, q);
  const intact = d.checks.latexIntact !== false && d.checks.imagesIntact !== false;
  const changed = local?.changed ?? [];
  const tagDiff = d.kind === "tags" && changed.includes("difficulty") ? LEVEL[(d.payload as TagsPayload | null)?.difficulty ?? ""] : null;
  return (
    <article className="card aid-card rise" style={{ ["--i" as string]: Math.min(i, 6) }} aria-label={`${kindLabel(d)} draft for ${d.questionId}`}>
      <Head d={d} q={q} showStem={d.kind === "tags"} />
      {isLatex(d) && <LatexCmp d={d} />}
      {d.kind === "solution" && (qt === "paragraph" ? <ParagraphSolutionCmp d={d} q={q} /> : qt === "matrix" ? <MatrixSolutionCmp d={d} q={q} /> : <SolutionCmp d={d} q={q} />)}
      {d.kind === "translation" && (qt === "paragraph" ? <ParagraphTranslationCmp d={d} q={q} /> : qt === "matrix" ? <MatrixTranslationCmp d={d} q={q} /> : <TranslationCmp d={d} q={q} />)}
      {d.kind === "tags" && <TagsCmp d={d} />}
      {stale ? (
        <div className="aid-stale fade">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span className="col min-w-[240px] grow gap-0.5">
            <span className="sm font-semibold">This question was edited after the draft was made</span>
            {(changed.length > 0 || tagDiff) && (
              <span className="sm">
                {changed.length > 0 && <>Changed since: {changed.map((c) => GROUP_WORDS[c] ?? c).join(", ")}.</>}
                {tagDiff && <> Accepting sets it back to {tagDiff}.</>}
              </span>
            )}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onDiscard(d)}>
            Discard
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onAccept(d, true)}>
            Accept anyway
          </button>
        </div>
      ) : (
        <div className="aid-foot">
          {agreement === "agrees" && (
            <span className="badge b-green">
              <Check className="size-3" aria-hidden />
              Matches the answer key{key ? ` ${key}` : ""}
            </span>
          )}
          {disagrees && (
            <>
              <span className="badge b-amber">
                <AlertCircle className="size-3" aria-hidden />
                {qt === "paragraph" || qt === "matrix"
                  ? qt === "paragraph"
                    ? "A question's answer differs from the key"
                    : "Some rows differ from your matches"
                  : `Answer differs from the key${said && key ? `: draft says ${said}, key says ${key}` : ""}`}
              </span>
              <span className="xs muted">Check the key or the working first.</span>
            </>
          )}
          {d.kind === "translation" && intact && (
            <span className="badge b-green">
              <Check className="size-3" aria-hidden />
              Equations and images unchanged
            </span>
          )}
          <span className="grow" />
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onDiscard(d)}>
            Discard
          </button>
          <button type="button" className={`btn btn-sm ${disagrees ? "btn-secondary" : "btn-primary"}`} disabled={busy} onClick={() => onAccept(d, false)}>
            Accept
          </button>
        </div>
      )}
    </article>
  );
}

function FailedCard({ d, i, busy, onRetry }: { d: AiDraft; i: number; busy: boolean; onRetry: (d: AiDraft) => void }) {
  const q = useBankQuestion(d, d.kind !== "tags" && !isLatex(d)).data;
  const code = d.error?.code ?? "";
  const missing = [...(d.checks.missingMath ?? [])];
  let title = "Couldn't draft this";
  let body: React.ReactNode = d.error?.message ?? null;
  if (d.kind === "translation" && code === "DRAFT_CHECK_FAILED") {
    title = missing.length || d.checks.extraMath?.length ? "Translation not used: an equation came back changed" : "Translation not used";
    body = missing.length ? (
      <>
        Missing from the Hindi:{" "}
        {missing.map((m, k) => (
          <React.Fragment key={k}>
            {k > 0 && ", "}
            <MathText as="span" className="font-serif text-[15px]" text={m} />
          </React.Fragment>
        ))}
      </>
    ) : (
      (d.checks.problems ?? []).join(" ") || d.error?.message
    );
  } else if (isLatex(d)) {
    title = "Couldn't read the equation from the image";
  } else if (d.kind === "tags" && code === "NO_VALID_TAGS") {
    title = "No tags suggested from your chapter list";
  }
  return (
    <article className="card aid-card rise" style={{ ["--i" as string]: Math.min(i + 4, 8) }} aria-label={`${kindLabel(d)} draft for ${d.questionId} failed`}>
      <Head d={d} q={q} ai={false} />
      <div className="aid-fail">
        <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
        <span className="col grow gap-1">
          <span className="sm font-semibold">{title}</span>
          {body && <span className="sm">{body}</span>}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onRetry(d)}>
          {busy ? "Trying…" : "Try again"}
        </button>
      </div>
    </article>
  );
}

/* ---------- page ---------- */

function DraftsReview() {
  const params = useSearchParams();
  const jobId = params.get("jobId") || undefined;
  const questionId = params.get("questionId") || undefined;
  const qc = useQueryClient();
  const { toast: appToast } = useToast();

  const [kind, setKind] = React.useState<KindTab>(() => {
    const k = params.get("kind");
    return k === "solution" || k === "translation" || k === "tags" ? k : "all";
  });
  const [local, setLocal] = React.useState<Record<string, Local>>({});
  const [busy, setBusy] = React.useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [ask, setAsk] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [retried, setRetried] = React.useState<Set<string>>(new Set());

  const filters: DraftQuery = { jobId, questionId, ...(kind === "all" ? {} : { kind }) };
  const ready = useInfiniteQuery({
    queryKey: ["ai-drafts-review", "ready", filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => aiAdmin.drafts({ ...filters, status: "ready", cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const failed = useQuery({
    queryKey: ["ai-drafts-review", "failed", filters],
    queryFn: () => aiAdmin.drafts({ ...filters, status: "failed" }),
  });
  const job = useQuery({
    queryKey: ["ai", "job", jobId],
    enabled: !!jobId,
    queryFn: async () => (await aiAdmin.job(jobId!)).job,
  });

  const items = React.useMemo(() => {
    const seen = new Set<string>();
    return (ready.data?.pages ?? []).flatMap((p) => p.items).filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
  }, [ready.data]);
  const readyCount = ready.data?.pages[0]?.counts.ready ?? 0;
  const decidedHere = items.filter((d) => local[d.id] && local[d.id].state !== "stale").length;
  const readyTotal = Math.max(0, readyCount - decidedHere);

  // Failed drafts whose question got a newer draft of the same kind (a retry) are no longer shown.
  const failedItems = React.useMemo(() => {
    const newer = new Set(items.map((d) => `${d.questionId}:${d.kind}`));
    return (failed.data?.items ?? []).filter((d) => !retried.has(d.id) && !newer.has(`${d.questionId}:${d.kind}`));
  }, [failed.data, items, retried]);

  const afterWrite = () => {
    qc.invalidateQueries({ queryKey: ["ai", "drafts"] });
    qc.invalidateQueries({ queryKey: ["questions"] });
  };
  const mark = (id: string, l: Local) => setLocal((m) => ({ ...m, [id]: l }));
  const setBusyId = (id: string, on: boolean) =>
    setBusy((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const accept = async (d: AiDraft, force: boolean) => {
    setBusyId(d.id, true);
    try {
      if (isSampleDraft(d.id)) await acceptDraft(d.id);
      else await aiAdmin.accept(d.id, force ? { force: true } : {});
      mark(d.id, { state: "accepted" });
      afterWrite();
    } catch (e) {
      const er = apiError(e);
      if (er.code === "DRAFT_STALE") {
        const changed = (er.details?.changedFields as string[] | undefined) ?? [];
        mark(d.id, { state: "stale", changed });
      } else {
        appToast({ title: "Could not accept the draft", description: er.message, variant: "destructive" });
      }
    } finally {
      setBusyId(d.id, false);
    }
  };

  const discard = async (d: AiDraft) => {
    setBusyId(d.id, true);
    try {
      if (isSampleDraft(d.id)) await discardDraft(d.id);
      else await aiAdmin.discard(d.id);
      mark(d.id, { state: "discarded" });
      afterWrite();
    } catch (e) {
      appToast({ title: "Could not discard the draft", description: apiError(e).message, variant: "destructive" });
    } finally {
      setBusyId(d.id, false);
    }
  };

  /** Every ready draft for the filters: the loaded ones, then the pages not loaded yet. */
  const allReady = async (): Promise<AiDraft[]> => {
    const out = [...items];
    let cursor = ready.data?.pages[ready.data.pages.length - 1]?.nextCursor ?? null;
    for (let n = 0; cursor && n < 40; n++) {
      const page = await aiAdmin.drafts({ ...filters, status: "ready", cursor });
      out.push(...page.items.filter((d) => !out.some((x) => x.id === d.id)));
      cursor = page.nextCursor;
    }
    return out.filter((d) => !local[d.id] || local[d.id].state === "stale");
  };

  const decideAll = async (list: AiDraft[], action: "accept" | "discard") => {
    const results: { draftId: string; ok: boolean; code: string | null }[] = [];
    for (let k = 0; k < list.length; k += 100) {
      const r = await aiAdmin.decide({ decisions: list.slice(k, k + 100).map((d) => ({ draftId: d.id, action })) });
      results.push(...r.results.map((x) => ({ draftId: x.draftId, ok: x.ok, code: x.code })));
    }
    return results;
  };

  const acceptAll = async () => {
    setBulkBusy(true);
    try {
      const all = await allReady();
      const stale = all.filter((d) => local[d.id]?.state === "stale");
      const disagree = all.filter((d) => agreementOf(d) === "disagrees");
      const eligible = all.filter((d) => !stale.includes(d) && !disagree.includes(d));
      const results = await decideAll(eligible, "accept");
      let ok = 0;
      const next: Record<string, Local> = {};
      for (const r of results) {
        if (r.ok) {
          ok++;
          next[r.draftId] = { state: "accepted" };
        } else if (r.code === "DRAFT_STALE") next[r.draftId] = { state: "stale" };
      }
      setLocal((m) => ({ ...m, ...next }));
      const left = all.length - ok;
      setToast(`${ok} accepted.${left ? ` ${left} left for you: the answer differs from the key, or the question was edited.` : ""}`);
      afterWrite();
    } catch (e) {
      appToast({ title: "Could not accept the drafts", description: apiError(e).message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const discardAll = async () => {
    setAsk(false);
    setBulkBusy(true);
    try {
      const all = await allReady();
      const results = await decideAll(all, "discard");
      const next: Record<string, Local> = {};
      let ok = 0;
      for (const r of results)
        if (r.ok) {
          ok++;
          next[r.draftId] = { state: "discarded" };
        }
      setLocal((m) => ({ ...m, ...next }));
      setToast(`${ok} drafts discarded. No questions were changed.`);
      afterWrite();
    } catch (e) {
      appToast({ title: "Could not discard the drafts", description: apiError(e).message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const retry = async (d: AiDraft) => {
    setBusyId(d.id, true);
    try {
      if (isLatex(d)) {
        // "Convert with AI" again for the same image (the failed draft names it)
        const t = d.payload as unknown as LatexPayload | null;
        if (!t?.imageSrc) throw new Error("This draft doesn't say which image to read. Open the question and use Convert with AI.");
        await assistM6(d.questionId, { kind: "latex", target: { field: t.field, imageSrc: t.imageSrc } }, "latex", () =>
          sampleDraft(d.questionId, "latex", { field: t.field, imageSrc: t.imageSrc, latex: "x" })
        );
      } else await streamAssist(d.questionId, d.kind, () => {});
      setRetried((s) => new Set(s).add(d.id));
    } catch (e) {
      appToast({ title: "Could not try again", description: apiError(e).message, variant: "destructive" });
    } finally {
      setBusyId(d.id, false);
      qc.invalidateQueries({ queryKey: ["ai-drafts-review"] });
      qc.invalidateQueries({ queryKey: ["ai", "drafts"] });
    }
  };

  const jobLabel = job.data
    ? `Run: ${BULK_COPY[job.data.kind].label} · ${
        dayjs(job.data.createdAt).isSame(dayjs(), "day") ? `today ${dayjs(job.data.createdAt).format("h:mm A")}` : dayjs(job.data.createdAt).format("D MMM, h:mm A")
      } · ${job.data.total.toLocaleString("en-IN")} ${job.data.total === 1 ? "question" : "questions"}`
    : "Run";

  return (
    <>
      <Topbar
        title="AI drafts"
        back={{ href: "/questions", label: "Bank" }}
        badge={<span className="xs muted hidden lg:inline">Nothing changes in the bank until you accept.</span>}
        actions={
          ask ? (
            <div className="row pop gap-2">
              <span className="sm font-semibold">Discard all {readyTotal.toLocaleString("en-IN")} drafts?</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsk(false)}>
                Keep them
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={discardAll}>
                Discard all
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="btn btn-ghost btn-sm" disabled={!readyTotal || bulkBusy} onClick={() => setAsk(true)}>
                Discard all
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!readyTotal || bulkBusy} onClick={acceptAll}>
                {bulkBusy ? "Working…" : `Accept all ${readyTotal.toLocaleString("en-IN")}`}
              </button>
            </>
          )
        }
      />
      <main className="col max-w-[1180px] gap-3.5 px-7 pt-5 pb-24">
        <div className="row between wrap gap-2.5">
          <div className="row wrap gap-2">
            <div className="seg" role="tablist" aria-label="Draft kind">
              {KIND_TABS.map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={kind === id} className={`tab ${kind === id ? "on" : ""}`} onClick={() => setKind(id)}>
                  {label}
                </button>
              ))}
            </div>
            {jobId && (
              <span className="chip on h-9">
                {jobLabel}
                <Link href="/questions/drafts" aria-label="Show all drafts" className="inline-flex text-inherit">
                  <X className="size-3" aria-hidden />
                </Link>
              </span>
            )}
            {questionId && (
              <span className="chip on h-9">
                Question <span className="mono">{questionId}</span>
                <Link href="/questions/drafts" aria-label="Show all drafts" className="inline-flex text-inherit">
                  <X className="size-3" aria-hidden />
                </Link>
              </span>
            )}
          </div>
          <span className="xs muted">Accept all leaves out drafts that differ from the key or whose question was edited.</span>
        </div>

        <div className="row between">
          <span className="h3">
            Ready to review <span className="muted num">· {ready.isLoading ? "…" : readyTotal.toLocaleString("en-IN")}</span>
          </span>
          <span className="xs muted">Newest first</span>
        </div>

        {ready.isLoading &&
          Array.from({ length: 3 }, (_, i) => <div key={i} className="skel h-[180px] rounded-card" />)}
        {ready.isError && <p className="sm muted m-0">The drafts could not be loaded. {apiError(ready.error).message}</p>}
        {!ready.isLoading && !ready.isError && !items.length && <p className="sm muted m-0">No drafts waiting.</p>}

        {items.map((d, i) => (
          <DraftCard key={d.id} d={d} i={i} local={local[d.id]} busy={busy.has(d.id) || bulkBusy} onAccept={accept} onDiscard={discard} />
        ))}

        {ready.hasNextPage && (
          <div className="row between">
            <span className="xs muted">
              Showing {items.length.toLocaleString("en-IN")} of {readyCount.toLocaleString("en-IN")}
            </span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={ready.isFetchingNextPage} onClick={() => ready.fetchNextPage()}>
              {ready.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {failedItems.length > 0 && (
          <div className="col mt-2.5 gap-3.5">
            <span className="h3">
              Couldn&apos;t draft <span className="muted num">· {failedItems.length}</span>
            </span>
            {failedItems.map((d, i) => (
              <FailedCard key={d.id} d={d} i={i} busy={busy.has(d.id)} onRetry={retry} />
            ))}
          </div>
        )}

        {toast && (
          <div className="aid-toast toast" role="status">
            <Check className="size-4 text-[#7BE0A6]" aria-hidden />
            <span className="sm">{toast}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setToast("")}>
              Close
            </button>
          </div>
        )}
      </main>
    </>
  );
}

/** /questions/drafts (?jobId=, ?questionId=, ?kind=): review AI drafts before they change the bank. */
export default function DraftsPage() {
  return (
    <Suspense>
      <DraftsReview />
    </Suspense>
  );
}
