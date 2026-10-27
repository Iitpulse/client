"use client";

import React, { memo, useEffect, useState } from "react";
import katex from "katex";
import DOMPurify from "dompurify";
import "katex/dist/katex.min.css";

interface Props {
  quillString: string;
  className?: string;
}

// p.innerHTML re-encodes entities, so LaTeX like "a & b" arrives as "a &amp; b"; KaTeX needs the raw characters.
function decodeEntities(tex: string): string {
  return tex
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

const RenderWithLatex: React.FC<Props> = ({ quillString, className }) => {
  const [previewHTML, setPreviewHTML] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPreviewHTML("");
    setIsLoading(true);

    if (quillString?.length && quillString !== "<p><br></p>") {
      // Option text from plain inputs is a bare string; wrap it so the <p> pass below sees it.
      const value = /<(p|div|ul|ol|li|table|h[1-6]|blockquote|pre)\b/i.test(quillString) ? quillString : `<p>${quillString}</p>`;
      const parser = new DOMParser();
      // Question HTML comes from staff, imports and the AI parser: strip scripts, event handlers and
      // javascript: URLs before rendering (KaTeX output is generated below and trusted)
      const doc = parser.parseFromString(DOMPurify.sanitize(value), "text/html");

      // Extract from all <p> tags
      const pTags = doc.getElementsByTagName("p");

      [...pTags]?.forEach((p) => {
        let html = p.innerHTML;

        // Match \[...\] patterns - render as inline math since these are typically
        // used inline within question text (not as standalone display equations)
        // This handles nested braces like \[{{0}^{0}}C\]
        html = html.replace(/\\\[([\s\S]*?)\\\]/g, (match, inner) => {
          try {
            const rendered = katex.renderToString(decodeEntities(inner), {
              throwOnError: false,
              displayMode: false, // Use inline mode for \[...\] in this context
            });
            return rendered;
          } catch {
            return match;
          }
        });

        // Match $...$ patterns (inline math)
        html = html.replace(/\$((?:[^$\\]|\\.)*)\$/g, (match, inner) => {
          try {
            const rendered = katex.renderToString(decodeEntities(inner), {
              throwOnError: false,
              displayMode: false,
            });
            return rendered;
          } catch {
            return match;
          }
        });

        p.innerHTML = html;
      });

      setPreviewHTML(doc.body.innerHTML);
    } else {
      setPreviewHTML("");
    }
    setIsLoading(false);
  }, [quillString]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!previewHTML) {
    return (
      <div className="text-muted-foreground text-sm">
        Nothing to preview
      </div>
    );
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: previewHTML }}
      className={className}
      style={{ fontWeight: "normal" }}
    />
  );
};

export default memo(RenderWithLatex);
