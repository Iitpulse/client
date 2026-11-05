"use client";
/* A code in a mono pill with a copy button (promo codes, test keys). `bad` = amber (a legacy code students can't use). */
import { Copy } from "lucide-react";
import { notify } from "./Toast";
import { cx } from "./utils";

export function CopyCode({ code, bad, large, className }: { code: string; bad?: boolean; large?: boolean; className?: string }) {
  return (
    <span className={cx("k-code", bad && "bad", className)} style={large ? { height: 36, fontSize: 14, flex: 1 } : undefined}>
      {code}
      {large && <span style={{ flex: 1 }} />}
      <button
        type="button"
        aria-label={`Copy ${code}`}
        onClick={(e) => {
          e.stopPropagation();
          void navigator.clipboard?.writeText(code).then(
            () => notify.success(`Copied ${code}`),
            () => notify.error("Couldn't copy", { description: "Select the code and copy it by hand." })
          );
        }}
      >
        <Copy className="size-3" aria-hidden />
      </button>
    </span>
  );
}
