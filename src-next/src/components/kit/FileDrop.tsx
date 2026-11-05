"use client";
/*
  K11 File upload (Kit-Forms). Say the rules before the drop (types and limit under the drop text); an error repeats
  the limit and the file's size. Two progress phases: uploading (bytes), then reading (AI-styled), each cancellable.
  A read with problems is not a failure. Tablet and phone: no drag; a "Choose a file" button and the same file rows.
*/
import { useRef, useState, type ReactNode } from "react";
import { CircleAlert, Upload } from "lucide-react";
import { cx, useMediaQuery } from "./utils";

export const fmtBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Checks a file against extensions and size; returns the board's error sentence or null. */
export function checkFile(file: File, accept: string[], maxBytes: number): string | null {
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (accept.length && !accept.includes(ext)) return `${file.name} can't be read. Use ${listWords(accept)}.`;
  if (file.size > maxBytes) return `${file.name} is ${fmtBytes(file.size)}. The limit is ${fmtBytes(maxBytes)}.`;
  return null;
}
const listWords = (a: string[]) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} or ${a[a.length - 1]}`);

export function FileDrop({
  accept,
  maxBytes,
  onFile,
  rules,
  title = "Drop the file here or",
  error,
  onErrorClear,
  disabled,
  minHeight,
}: {
  /** extensions with the dot: [".xlsx", ".xls", ".csv"] */
  accept: string[];
  maxBytes: number;
  onFile: (f: File) => void;
  /** the rules line under the drop text: ".xlsx, .xls or .csv · up to 10 MB" */
  rules: ReactNode;
  title?: ReactNode;
  /** a rejected file (wrong type, too big): red drop area */
  error?: string | null;
  onErrorClear?: () => void;
  disabled?: boolean;
  minHeight?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const touch = useMediaQuery("(pointer: coarse)");
  const err = error ?? localErr;
  const take = (f: File | undefined) => {
    if (!f) return;
    const bad = checkFile(f, accept, maxBytes);
    setLocalErr(bad);
    if (!bad) onFile(f);
  };
  const browse = () => {
    setLocalErr(null);
    onErrorClear?.();
    input.current?.click();
  };
  return (
    <div
      className={cx("k-drop", over && "over", err && "bad")}
      style={minHeight ? { minHeight } : undefined}
      role={err ? "alert" : undefined}
      onDragOver={(e) => {
        if (disabled || touch) return;
        e.preventDefault();
        const f = e.dataTransfer.items?.[0];
        setOver(f?.kind === "file" ? "file" : "file");
      }}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => {
        if (disabled || touch) return;
        e.preventDefault();
        setOver(null);
        take(e.dataTransfer.files?.[0]);
      }}
    >
      <input ref={input} type="file" hidden accept={accept.join(",")} onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
      <span className="ico">{err ? <CircleAlert className="size-5" aria-hidden /> : <Upload className="size-5" aria-hidden />}</span>
      {err ? (
        <>
          <span className="sm" style={{ fontWeight: 600, color: "#7A1010" }}>
            {err}
          </span>
          <span className="xs" style={{ color: "#7A1010" }}>
            <button type="button" className="browse" onClick={browse}>
              Choose another
            </button>
          </span>
        </>
      ) : over ? (
        <span className="sm" style={{ fontWeight: 600, color: "var(--navy)" }}>
          Drop to upload
        </span>
      ) : touch ? (
        <>
          <button type="button" className="btn btn-secondary" style={{ height: 44 }} disabled={disabled} onClick={browse}>
            Choose a file
          </button>
          <span className="xs muted">{rules}</span>
        </>
      ) : (
        <>
          <span className="sm" style={{ fontWeight: 600 }}>
            {title}{" "}
            <button type="button" className="browse" disabled={disabled} onClick={browse}>
              choose a file
            </button>
          </span>
          <span className="xs muted">{rules}</span>
        </>
      )}
    </div>
  );
}

const TYPE_COLOUR: Record<string, string> = { XLSX: "#0E7A3D", XLS: "#0E7A3D", CSV: "#0E7A3D", DOCX: "#0B63C4", PDF: "#C40000", PNG: "#575C75", JPG: "#575C75", SVG: "#575C75" };

/** One file row: uploading with progress, read (with or without problems), or failed. */
export function FileRow({
  name,
  meta,
  progress,
  problem,
  failed,
  actions,
}: {
  name: string;
  /** "412 rows · 86 KB" or "1.5 of 2.4 MB" */
  meta?: ReactNode;
  /** 0–100 while uploading */
  progress?: number | null;
  /** amber line: "30 questions · 2 need a fix" */
  problem?: ReactNode;
  /** red row: "Couldn't read this file. …" */
  failed?: ReactNode;
  actions?: ReactNode;
}) {
  const ext = (name.split(".").pop() ?? "").toUpperCase();
  return (
    <div className={cx("k-file", failed && "bad")} role={failed ? "alert" : undefined}>
      <span className="ft" style={{ background: failed ? "var(--red-600)" : TYPE_COLOUR[ext] ?? "#575C75" }}>
        {ext.slice(0, 4)}
      </span>
      <span className="meta">
        <span className="row between" style={{ gap: 8 }}>
          <span className="sm k-ell" style={{ fontWeight: 600 }}>
            {name}
          </span>
          {progress != null && <span className="xs muted num">{Math.round(progress)}%</span>}
        </span>
        {progress != null && (
          <span className="bar" style={{ height: 5 }}>
            <i style={{ width: `${progress}%`, animation: "none" }} />
          </span>
        )}
        {failed ? (
          <span className="xs" style={{ color: "#7A1010" }}>
            {failed}
          </span>
        ) : problem ? (
          <span className="xs" style={{ color: "var(--amber)", fontWeight: 600 }}>
            {problem}
          </span>
        ) : meta ? (
          <span className="xs muted num">{meta}</span>
        ) : null}
      </span>
      {actions}
    </div>
  );
}
