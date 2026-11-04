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
  MathType's mid-sentence \[…\] ("… 0.5 M \[NaOH\] solution …") renders inline in MathText itself (0.1.1+).
*/
const RenderWithLatex: React.FC<Props> = ({ quillString, className }) => {
  if (!quillString?.length || quillString === "<p><br></p>") {
    return <div className="text-muted-foreground text-sm">Nothing to preview</div>;
  }

  return (
    <MathText
      html
      as="div"
      text={quillString}
      className={cn("font-normal", className)}
    />
  );
};

export default memo(RenderWithLatex);
