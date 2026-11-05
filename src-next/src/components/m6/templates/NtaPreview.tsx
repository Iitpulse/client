"use client";
/*
  Admin-Templates live / full preview: a replica of the frozen NTA instructions page and exam screen in their own
  system font and colours (never the brand). Text that comes from the template (changed wording, filled
  placeholders, changed instruction lines) is highlighted, as on the board.
*/
import type { ExamTools, InstructionsDoc, Lang, WordingKey } from "@/lib/m6-contract";
import { fillPlaceholders, NTA_STANDARD, type TestFacts } from "@/lib/m6/nta-standard";
import type { ReactNode } from "react";

const PH = /(\{test name\}|\{duration\}|\{questions\}|\{marks\}|\{negative marks\})/;
const isPH = (p: string) => /^\{(test name|duration|questions|marks|negative marks)\}$/.test(p);

/** A line with its placeholders filled and highlighted. */
function Filled({ text, facts, mark }: { text: string; facts: TestFacts; mark: boolean }) {
  const parts = text.split(PH);
  return (
    <>
      {parts.map((p, i) =>
        isPH(p) ? (
          <span key={i} className="m6-edited">
            {fillPlaceholders(p, facts)}
          </span>
        ) : mark ? (
          <span key={i} className="m6-edited">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

export function NtaInstructions({
  doc,
  lang,
  facts,
  big,
  student = "Student name",
  filled,
}: {
  doc: InstructionsDoc | { heading: string; blocks: Array<{ title: string; lines: string[] }>; declaration: string };
  lang: Lang;
  facts: TestFacts;
  big?: boolean;
  student?: string;
  /** the doc's placeholders are already filled (preview route): no highlights by placeholder */
  filled?: boolean;
}) {
  const std = NTA_STANDARD.instructions[lang];
  const stdLines = new Set(std.blocks.flatMap((b) => b.lines));
  const hi = lang === "hi" ? "m6-hi" : "";
  return (
    <div className={`m6-nta ${big ? "big" : ""}`} aria-label="Preview of the NTA instructions page">
      <div className="hd">
        <span className="lg">IIT-PULSE</span>
        <span style={{ fontSize: big ? 12 : 11 }}>{student}</span>
      </div>
      <div className="bar">
        <span className={hi}>{lang === "hi" ? "सामान्य निर्देश" : "GENERAL INSTRUCTIONS"}</span>
        <span className={`sel ${hi}`}>{lang === "hi" ? "हिन्दी" : "English"} ▾</span>
      </div>
      <div className={`bd ${hi}`}>
        <div className="t">{filled ? doc.heading : <Filled text={doc.heading} facts={facts} mark={doc.heading !== std.heading} />}</div>
        {doc.blocks.map((b, i) => (
          <div key={i} className="col" style={{ gap: 4 }}>
            <u>{b.title}</u>
            <ol>
              {b.lines.map((l, j) => (
                <li key={j}>{filled ? l : <Filled text={l} facts={facts} mark={!stdLines.has(l)} />}</li>
              ))}
            </ol>
          </div>
        ))}
        <div className="red">{lang === "hi" ? "सभी प्रश्न आपकी चुनी हुई भाषा में दिखेंगे।" : "Please note all questions will appear in your default language."}</div>
        <div className="row" style={{ gap: 6, alignItems: "flex-start" }}>
          <span style={{ width: 11, height: 11, border: "1px solid #6B7280", borderRadius: 2, flex: "none", marginTop: 2 }} />
          <span>{filled ? doc.declaration : <Filled text={doc.declaration} facts={facts} mark={doc.declaration !== std.declaration} />}</span>
        </div>
        <div className="go">PROCEED</div>
      </div>
    </div>
  );
}

export function NtaExamScreen({ wording, tools, lang, big }: { wording: Record<WordingKey, string>; tools: ExamTools; lang: Lang; big?: boolean }) {
  const std = NTA_STANDARD.wording[lang];
  const w = (k: WordingKey): ReactNode => (wording[k] !== std[k] ? <span className="m6-edited">{wording[k]}</span> : wording[k]);
  return (
    <div className={`m6-nta ${big ? "big" : ""}`} aria-label="Preview of the NTA exam screen">
      <div className="hd">
        <span className="lg">IIT-PULSE</span>
        <span className="row" style={{ gap: 6 }}>
          {tools.viewQuestionPaper && (
            <span className="b" style={{ background: "#22B357", color: "#fff" }}>
              View Question Paper
            </span>
          )}
          {tools.viewInstructions && (
            <span className="b" style={{ background: "#3B82F6", color: "#fff" }}>
              View Instruction
            </span>
          )}
          {tools.languageSwitch && <span className="sel">{lang === "hi" ? "हिन्दी" : "English"} ▾</span>}
        </span>
      </div>
      <div className={`bd ${lang === "hi" ? "m6-hi" : ""}`} style={{ gap: 10 }}>
        <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
          <div className="col" style={{ flex: 1, gap: 8, border: "1px solid #D6E4FF", borderRadius: 4, padding: 10, minHeight: 120 }}>
            <span style={{ color: "#1D63E8" }}>Section A</span>
            <b style={{ color: "#111827" }}>Question 1</b>
            <span>{lang === "hi" ? "प्रश्न का पाठ यहाँ दिखेगा…" : "The question text shows here…"}</span>
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="pal">
              <span style={{ background: "#E5484D", color: "#fff", borderColor: "#E5484D" }}>1</span>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
            <span style={{ fontSize: 10 }}>
              ■ {w("notAnswered")} · ■ Answered{tools.markForReview ? " · ■ Marked for Review" : ""}
            </span>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="b" style={{ background: "#5BB974", color: "#fff" }}>
            {w("saveNext")}
          </span>
          <span className="b" style={{ border: "1px solid #111827", color: "#111827" }}>
            {w("clear")}
          </span>
          {tools.markForReview && (
            <>
              <span className="b" style={{ background: "#3C1478", color: "#fff" }}>
                {w("saveMarkReview")}
              </span>
              <span className="b" style={{ background: "#74B9F5", color: "#fff" }}>
                {w("markReviewNext")}
              </span>
            </>
          )}
          <span className="b" style={{ background: "#13C756", color: "#fff", marginLeft: "auto" }}>
            {w("submit")}
          </span>
        </div>
      </div>
    </div>
  );
}
