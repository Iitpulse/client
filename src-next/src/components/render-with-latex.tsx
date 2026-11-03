"use client";

import React, { memo } from "react";
import { MathText } from "@iitpulse/ui";
import { cn } from "@/lib/utils";

interface Props {
  quillString: string;
  className?: string;
}

/*
  Question HTML (stems, options, solutions, in English and Hindi) with its LaTeX rendered by KaTeX through
  @iitpulse/ui's MathText, the same renderer the student app uses: one KaTeX version, DOMPurify sanitising,
  $…$ / \(…\) inline, $$…$$ display, mhchem. Equations stay LaTeX text, never images.

  The question bank is mostly Word/MathType exports that write inline maths as \[…\] mid-sentence
  ("… 0.5 M \[NaOH\] solution …"); the NTA exam screen and this preview have always rendered those inline.
  MathText treats \[…\] as display maths, so they are passed as \(…\) to keep the sentence on one line.
*/
const INLINE_BRACKETS = /(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]/g;

function toInlineBrackets(html: string): string {
  return html.replace(INLINE_BRACKETS, (_match, tex: string) => `\\(${tex}\\)`);
}

const RenderWithLatex: React.FC<Props> = ({ quillString, className }) => {
  if (!quillString?.length || quillString === "<p><br></p>") {
    return <div className="text-muted-foreground text-sm">Nothing to preview</div>;
  }

  return (
    <MathText
      html
      as="div"
      text={toInlineBrackets(quillString)}
      className={cn("font-normal", className)}
    />
  );
};

export default memo(RenderWithLatex);
