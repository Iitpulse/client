"use client";
/*
  The app's MathText: @iitpulse/ui's KaTeX renderer, plus a text alternative for figures. Question HTML from older
  imports carries <img> without alt (axe image-alt); in html mode every such image gets alt="Figure" (Kit-Math: an
  image keeps its own alt when it has one). Import MathText from here, not from @iitpulse/ui.
*/
import { memo } from "react";
import { MathText as UiMathText, type MathTextProps } from "@iitpulse/ui";

/** Adds alt="Figure" to <img> tags that have no alt attribute. */
export function withImgAlt(html: string): string {
  return html.includes("<img") ? html.replace(/<img\b(?![^>]*\balt\s*=)/gi, '<img alt="Figure"') : html;
}

export const MathText = memo(function MathText({ children, ...p }: MathTextProps) {
  const src = p.text ?? children;
  return <UiMathText {...p} text={p.html && typeof src === "string" ? withImgAlt(src) : src} />;
});
