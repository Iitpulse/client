"use client";
/* Student preview (board): the question as students see it in a test, Desktop or Phone width, in the language shown. */
import * as React from "react";
import { MathText } from "@/components/math-text";
import { Segmented } from "@/components/kit/Segmented";
import { isBlankHtml, isMathsOnly } from "@/lib/latex-source";
import { KEY, PREVIEW_TYPE, type Form, type OptionF } from "./form";
import { useEditor } from "./context";

const pick = (en: string, hi: string, lang: "en" | "hi") => (lang === "hi" && !isBlankHtml(hi) ? hi : en);
const optText = (o: OptionF, lang: "en" | "hi") => (lang === "hi" ? (!isBlankHtml(o.hi) ? o.hi : isMathsOnly(o.en) ? o.en : o.en) : o.en);

function Options({ options, lang }: { options: OptionF[]; lang: "en" | "hi" }) {
  return (
    <div className="col gap-1.5 text-[15px]">
      {options.map((o, i) => (
        <span key={o.id} className="row items-baseline gap-1.5">
          <span className="font-serif">({KEY(i)})</span>
          <MathText html text={optText(o, lang)} as="span" />
        </span>
      ))}
    </div>
  );
}

export function StudentPreview({ form, loading }: { form: Form; loading?: boolean }) {
  const { lang } = useEditor();
  const [phone, setPhone] = React.useState(false);
  const hiCls = lang === "hi" ? "qe-hi" : "";
  const stem = form.type === "paragraph" ? pick(form.passage.en, form.passage.hi, lang) : pick(form.en.question, form.hi.question, lang);
  const blank = isBlankHtml(stem);
  const kid = form.children[0];
  return (
    <section className="card col overflow-hidden">
      <div className="row between wrap pad gap-2 border-b border-line-2">
        <span className="h3">Student preview</span>
        <Segmented<"desk" | "phone">
          size="sm"
          ariaLabel="Preview width"
          value={phone ? "phone" : "desk"}
          onChange={(v) => setPhone(v === "phone")}
          options={[
            { value: "desk", label: "Desktop" },
            { value: "phone", label: "Phone" },
          ]}
        />
      </div>
      <div className="col pad gap-2.5">
        {loading ? (
          <div className="skel h-32" />
        ) : (
          <div className={`qe-pv ${phone ? "phone" : ""} ${hiCls}`}>
            <div className="row between xs muted">
              <span>Question 1 · {PREVIEW_TYPE[form.type]}</span>
            </div>
            {blank ? (
              <span className="sm muted">The question shows here as you type.</span>
            ) : form.type === "paragraph" ? (
              <>
                <MathText html text={stem} as="div" className="passage" />
                {kid && (
                  <>
                    <span className="xs muted">
                      Question 1 of {form.children.length} on this passage
                    </span>
                    <MathText html text={pick(kid.en.question, kid.hi.question, lang)} as="div" />
                    {kid.type === "integer" ? (
                      <div className="field">
                        <span className="xs muted">Your answer</span>
                        <span className="fakeinput">Type a number</span>
                      </div>
                    ) : (
                      <Options options={kid.options} lang={lang} />
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <MathText html text={stem} as="div" />
                {(form.type === "single" || form.type === "multiple") && <Options options={form.options} lang={lang} />}
                {form.type === "integer" && (
                  <div className="field">
                    <span className="xs muted">Your answer</span>
                    <span className="fakeinput">Type a number</span>
                  </div>
                )}
                {form.type === "matrix" && (
                  <>
                    <div className="grid gap-x-4 gap-y-1 text-[14px]" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
                      <span className="xs font-semibold text-muted">List I</span>
                      <span className="xs font-semibold text-muted">List II</span>
                      {Array.from({ length: Math.max(form.listI.length, form.listII.length) }, (_, i) => (
                        <React.Fragment key={i}>
                          <span>{form.listI[i] && <><b className="mono">{form.listI[i].id}</b> <MathText html text={pick(form.listI[i].en, form.listI[i].hi, lang)} /></>}</span>
                          <span>{form.listII[i] && <><b className="mono">{form.listII[i].id}</b> <MathText html text={pick(form.listII[i].en, form.listII[i].hi, lang)} /></>}</span>
                        </React.Fragment>
                      ))}
                    </div>
                    <span className="xs muted">
                      Students tick the matches in a grid: rows {form.listI[0]?.id}–{form.listI[form.listI.length - 1]?.id}, columns {form.listII[0]?.id}–{form.listII[form.listII.length - 1]?.id}.
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        )}
        <span className="xs muted">Uses the test font and size. Switch English / हिन्दी above the editor.</span>
      </div>
    </section>
  );
}
