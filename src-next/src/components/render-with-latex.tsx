"use client";

import React, { memo, useEffect, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface Props {
  quillString: string;
  className?: string;
}

const RenderWithLatex: React.FC<Props> = ({ quillString, className }) => {
  const [previewHTML, setPreviewHTML] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPreviewHTML("");
    setIsLoading(true);

    if (quillString?.length && quillString !== "<p><br></p>") {
      const value = quillString;
      const parser = new DOMParser();
      const doc = parser.parseFromString(value, "text/html");

      // Extract from all <p> tags
      const pTags = doc.getElementsByTagName("p");

      [...pTags]?.forEach((p) => {
        let html = p.innerHTML;

        // Match \[...\] patterns - render as inline math since these are typically
        // used inline within question text (not as standalone display equations)
        // This handles nested braces like \[{{0}^{0}}C\]
        html = html.replace(/\\\[([\s\S]*?)\\\]/g, (match, inner) => {
          try {
            const rendered = katex.renderToString(inner, {
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
            const rendered = katex.renderToString(inner, {
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
