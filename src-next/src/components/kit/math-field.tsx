"use client";
/*
  Kit-Math K12: the LaTeX field for stems, options, solutions, passages and list rows (QuestionEditor, BulkUpload row
  fix). Source above (maths between $…$ tinted navy, image tokens, a bad $…$ marked red), the live KaTeX preview below
  "as students see it" (300 ms after typing stops), the toolbar inserting LaTeX at the cursor (palettes for Greek and
  chemistry), and the images of the field under it: a diagram with alt text, size, Replace, Remove; a picture of an
  equation flagged "Equation is an image · needs LaTeX" with Convert with AI and Type it (never blocked).

  value/onChange are bank RichText (HTML with $…$, see lib/latex-source). onChange fires on the teacher's edits only.
  variant "inline": one-line option / list row, the render beside it, no box of its own (`boxed` gives it one).
  Tablet (narrow field): the first 8 tools, the rest under "More". Paste an image = an equation picture (flagged);
  the picture button or a drop = a diagram.
*/
import "./math-field.css";
import * as React from "react";
import { MathText } from "@iitpulse/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type FieldImage,
  type ImageSize,
  htmlToSource,
  inMath,
  issueText,
  mathRanges,
  sourceIssues,
  sourceToHtml,
  token,
  TOKEN_RE,
} from "@/lib/latex-source";
import { cx, useTablet } from "./utils";

export type { FieldImage } from "@/lib/latex-source";

export interface MathFieldProps {
  id?: string;
  /** RichText (HTML with $…$) */
  value: string;
  onChange: (html: string) => void;
  /** accessible name of the source box */
  label?: string;
  lang?: "en" | "hi";
  variant?: "block" | "inline";
  /** inline only: draw its own box (list rows) */
  boxed?: boolean;
  placeholder?: string;
  /** block: minimum source height (px) */
  minHeight?: number;
  /** "focus": the toolbar shows while the field has focus (paragraph children) */
  toolbar?: "full" | "focus" | "none";
  /** block: the preview under the field (default on) */
  preview?: boolean;
  /** an outside field error (red box; the message is drawn by the caller unless `showError`) */
  error?: string | null;
  showError?: boolean;
  disabled?: boolean;
  /** uploads a picture (picture button, paste, drop); without it pictures can't be added */
  onUploadImage?: (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<{ url: string }>;
  /** "Convert with AI" on a flagged image */
  onConvertImage?: (img: FieldImage) => void;
  /** extra UI under a flagged image (the AI draft card) */
  imageExtra?: (img: FieldImage) => React.ReactNode;
  className?: string;
  autoFocus?: boolean;
}

interface Upload {
  id: number;
  name: string;
  pct: number;
  error: string | null;
  needsLatex: boolean;
  replace: number | null;
  at: number;
  ctrl: AbortController;
}

const GREEK: Array<[string, string, string]> = [
  ["alpha", "α", "\\alpha"], ["beta", "β", "\\beta"], ["gamma", "γ", "\\gamma"], ["delta", "δ", "\\delta"], ["epsilon", "ε", "\\epsilon"],
  ["zeta", "ζ", "\\zeta"], ["eta", "η", "\\eta"], ["theta", "θ", "\\theta"], ["iota", "ι", "\\iota"], ["kappa", "κ", "\\kappa"],
  ["lambda", "λ", "\\lambda"], ["mu", "μ", "\\mu"], ["nu", "ν", "\\nu"], ["xi", "ξ", "\\xi"], ["pi", "π", "\\pi"], ["rho", "ρ", "\\rho"],
  ["sigma", "σ", "\\sigma"], ["tau", "τ", "\\tau"], ["phi", "φ", "\\phi"], ["chi", "χ", "\\chi"], ["psi", "ψ", "\\psi"], ["omega", "ω", "\\omega"],
  ["Gamma", "Γ", "\\Gamma"], ["Delta", "Δ", "\\Delta"], ["Theta", "Θ", "\\Theta"], ["Lambda", "Λ", "\\Lambda"], ["Pi", "Π", "\\Pi"],
  ["Sigma", "Σ", "\\Sigma"], ["Phi", "Φ", "\\Phi"], ["Psi", "Ψ", "\\Psi"], ["Omega", "Ω", "\\Omega"],
];
const CHEM: Array<[string, string, string]> = [
  ["Formula", "H₂O", "\\ce{▮}"],
  ["Reaction", "→", "\\ce{▮ -> }"],
  ["Equilibrium", "⇌", "\\ce{▮ <=> }"],
  ["Hydrate", "·", "\\ce{CuSO4.5H2O}"],
  ["Ion charge", "²⁺", "\\ce{Cu^{2+}}"],
  ["Gas, precipitate", "↑ ↓", "\\ce{▮ ^ v}"],
];

const Icon = {
  pic: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-8 8" />
    </svg>
  ),
  err: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  ),
  warn: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  ),
  spark: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  ),
};

function useDebouncedValue<T>(v: T, ms: number): T {
  const [d, setD] = React.useState(v);
  React.useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function useNarrow(ref: React.RefObject<HTMLElement | null>, below = 560): boolean {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < below));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, below]);
  return narrow;
}

/** The highlighted copy of the source behind the textarea (same characters, only colours change). */
function Mirror({ source, bad }: { source: string; bad: Array<{ start: number; end: number }> }) {
  const { ranges } = mathRanges(source);
  const out: React.ReactNode[] = [];
  let at = 0;
  let k = 0;
  const text = (s: string) => {
    const re = /⟦image (\d+)⟧|<\/?[a-zA-Z][^<>]*>/g;
    let last = 0;
    for (let m = re.exec(s); m; m = re.exec(s)) {
      if (m.index > last) out.push(s.slice(last, m.index));
      out.push(
        <span key={k++} className={m[1] ? `ti n${m[1]}` : "tg"}>
          {m[0]}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push(s.slice(last));
  };
  const isBad = (s: number, e: number) => bad.some((b) => b.start < e && b.end > s);
  for (const r of ranges) {
    text(source.slice(at, r.start));
    out.push(
      <span key={k++} className={isBad(r.start, r.end) ? "bad" : "tx"}>
        {source.slice(r.start, r.end)}
      </span>
    );
    at = r.end;
  }
  const tail = source.slice(at);
  const open = bad.find((b) => b.start >= at);
  if (open) {
    text(tail.slice(0, open.start - at));
    out.push(
      <span key={k++} className="bad">
        {tail.slice(open.start - at, open.end - at)}
      </span>
    );
    text(tail.slice(open.end - at));
  } else text(tail);
  return <>{out}</>;
}

function Palette({ items, onPick, label }: { items: Array<[string, string, string]>; onPick: (tex: string) => void; label: string }) {
  const [q, setQ] = React.useState("");
  const [focus, setFocus] = React.useState(0);
  const list = items.filter(([n, , t]) => !q || n.toLowerCase().includes(q.toLowerCase()) || t.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="k-mf-pal">
      <input
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setFocus(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocus((f) => Math.min(list.length - 1, f + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocus((f) => Math.max(0, f - 1));
          } else if (e.key === "Enter" && list[focus]) {
            e.preventDefault();
            onPick(list[focus][2]);
          }
        }}
        placeholder={`Search ${label.toLowerCase()}`}
        aria-label={`Search ${label.toLowerCase()}`}
      />
      <ul role="listbox" aria-label={label}>
        {list.map(([n, s, t], i) => (
          <li key={t}>
            <button type="button" role="option" aria-selected={i === focus} className={i === focus ? "focus" : ""} onClick={() => onPick(t)}>
              <span className="sym">{s}</span>
              {n}
              <span className="tex">{t.replace("▮", "")}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="xs muted px-2 py-1.5">Nothing matches &quot;{q}&quot;</li>}
      </ul>
    </div>
  );
}

function Help() {
  return (
    <div className="k-mf-help">
      <b className="sm">Typing maths</b>
      <span>
        Maths between <code>$…$</code>, e.g. <code>$\dfrac{"{a}{b}"}$</code>. A display line between <code>$$…$$</code>.
      </span>
      <span>
        Chemistry in <code>\ce{"{…}"}</code>: <code>\ce{"{N2 + 3H2 <=> 2NH3}"}</code>. Units upright: <code>$9.8\,\mathrm{"{m\\,s^{-2}}"}$</code>.
      </span>
      <span>
        Bold and italic as <code>&lt;b&gt;…&lt;/b&gt;</code>, <code>&lt;i&gt;…&lt;/i&gt;</code>. Diagrams go in with the picture button; an equation is never a picture.
      </span>
    </div>
  );
}

export function MathField(props: MathFieldProps) {
  const {
    id,
    value,
    onChange,
    label = "Text",
    lang = "en",
    variant = "block",
    boxed = false,
    placeholder,
    minHeight = 96,
    toolbar = "full",
    preview = true,
    error,
    showError = false,
    disabled = false,
    onUploadImage,
    onConvertImage,
    imageExtra,
    className,
    autoFocus,
  } = props;
  const inline = variant === "inline";
  const hi = lang === "hi";

  // doc.html is the html the field last took in or sent out (the preview shows it); emitted mirrors it for the sync effect
  const [doc, setDoc] = React.useState(() => ({ ...htmlToSource(value), html: value }));
  const emitted = React.useRef(value);
  React.useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setDoc({ ...htmlToSource(value), html: value });
    }
  }, [value]);

  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const pendingSel = React.useRef<number | null>(null);
  const fileMode = React.useRef<{ replace: number | null }>({ replace: null });
  const [focused, setFocused] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [uploads, setUploads] = React.useState<Upload[]>([]);
  // tablet (1024) or a narrow field: the first 8 tools, the rest under More (Kit-Math)
  const tablet = useTablet();
  const narrow = useNarrow(boxRef) || tablet;

  const commit = React.useCallback(
    (source: string, images: FieldImage[], caret?: number) => {
      const html = sourceToHtml(source, images, inline);
      setDoc({ source, images, html });
      emitted.current = html;
      onChange(html);
      if (caret !== undefined) pendingSel.current = caret;
    },
    [inline, onChange]
  );

  React.useLayoutEffect(() => {
    if (pendingSel.current === null || !taRef.current) return;
    const p = pendingSel.current;
    pendingSel.current = null;
    taRef.current.focus();
    taRef.current.setSelectionRange(p, p);
  });

  const { source, images } = doc;
  const issues = React.useMemo(() => sourceIssues(source), [source]);
  const present = React.useMemo(() => {
    const ns = new Set<number>();
    for (const m of source.matchAll(TOKEN_RE)) ns.add(Number(m[1]));
    return images.filter((i) => ns.has(i.n)).sort((a, b) => source.indexOf(token(a.n)) - source.indexOf(token(b.n)));
  }, [source, images]);
  const nextN = () => images.reduce((m, i) => Math.max(m, i.n), 0) + 1;

  /* ---------- inserting at the cursor ---------- */
  const insert = (snippet: string, asMath: boolean) => {
    const ta = taRef.current;
    if (!ta || disabled) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = source.slice(s, e);
    let text = snippet.includes("▮") ? snippet.replace("▮", sel) : snippet + sel;
    let caret = (snippet.includes("▮") ? snippet.indexOf("▮") : snippet.length) + sel.length;
    if (asMath && !inMath(source, s)) {
      text = `$${text}$`;
      caret += 1;
    }
    // a command followed by a letter needs a space (\alpha x)
    if (/\\[a-zA-Z]+$/.test(text) && /^[a-zA-Z]/.test(source.slice(e))) text += " ";
    commit(source.slice(0, s) + text + source.slice(e), images, s + caret);
  };

  /* ---------- pictures ---------- */
  const startUpload = (file: File, needsLatex: boolean, replace: number | null) => {
    if (!onUploadImage) return;
    const ctrl = new AbortController();
    const at = taRef.current ? taRef.current.selectionEnd : source.length;
    const up: Upload = { id: Date.now() + Math.random(), name: file.name || "image.png", pct: 0, error: null, needsLatex, replace, at, ctrl };
    setUploads((u) => [...u, up]);
    const patch = (p: Partial<Upload>) => setUploads((u) => u.map((x) => (x.id === up.id ? { ...x, ...p } : x)));
    onUploadImage(file, (pct) => patch({ pct }), ctrl.signal)
      .then(({ url }) => {
        setUploads((u) => u.filter((x) => x.id !== up.id));
        setDoc((d) => {
          let next: { source: string; images: FieldImage[] };
          if (replace !== null) next = { source: d.source, images: d.images.map((i) => (i.n === replace ? { ...i, src: url } : i)) };
          else {
            const n = d.images.reduce((m, i) => Math.max(m, i.n), 0) + 1;
            const pos = Math.min(up.at, d.source.length);
            const tok = token(n);
            next = { source: d.source.slice(0, pos) + tok + d.source.slice(pos), images: [...d.images, { n, src: url, alt: "", size: needsLatex ? null : "medium", needsLatex }] };
          }
          const html = sourceToHtml(next.source, next.images, inline);
          emitted.current = html;
          queueMicrotask(() => onChange(html));
          return { ...next, html };
        });
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError" || (e as { code?: string })?.code === "ERR_CANCELED") {
          setUploads((u) => u.filter((x) => x.id !== up.id));
          return;
        }
        const msg = (e as { code?: string })?.code === "UNSUPPORTED_IMAGE" || (e as { code?: string })?.code === "IMAGE_TOO_LARGE"
          ? "Couldn't add it: use PNG, JPG or SVG, up to 2 MB."
          : (e as Error)?.message || "Couldn't add it. Try again.";
        patch({ error: msg, pct: 0 });
      });
  };
  const choose = (replace: number | null) => {
    fileMode.current = { replace };
    fileRef.current?.click();
  };

  const updateImage = (n: number, p: Partial<FieldImage>) => commit(source, images.map((i) => (i.n === n ? { ...i, ...p } : i)));
  const removeImage = (n: number) => commit(source.replace(token(n), ""), images);
  const typeIt = (n: number) => {
    const at = source.indexOf(token(n));
    commit(source.replace(token(n), "$$"), images, at + 1);
  };

  /* ---------- toolbar ---------- */
  type Tool = { k: string; label: string; text: React.ReactNode; cls?: string; tex?: string; math?: boolean; pal?: "greek" | "chem" | "help" };
  const tools: Tool[] = [
    { k: "b", label: "Bold", text: "B", tex: "<b>▮</b>" },
    { k: "i", label: "Italic", text: <i>I</i>, tex: "<i>▮</i>" },
    { k: "x", label: "Insert inline maths", text: "$x$", cls: "w", tex: "$▮$" },
    { k: "frac", label: "Fraction", text: "a⁄b", cls: "m", tex: "\\dfrac{▮}{}", math: true },
    { k: "sqrt", label: "Square root", text: "√x", cls: "m", tex: "\\sqrt{▮}", math: true },
    { k: "pow", label: "Power", text: "x²", cls: "m", tex: "^{▮}", math: true },
    { k: "sub", label: "Subscript", text: "x₂", cls: "m", tex: "_{▮}", math: true },
    { k: "int", label: "Integral", text: "∫", cls: "m", tex: "\\int_{▮}^{}", math: true },
    { k: "sum", label: "Sum", text: "Σ", cls: "m", tex: "\\sum_{▮}^{}", math: true },
    { k: "greek", label: "Greek letters", text: "αβ", cls: "m", pal: "greek" },
    { k: "chem", label: "Chemistry", text: "⇌", cls: "m", pal: "chem" },
  ];
  const runTool = (t: Tool) => {
    if (!t.tex) return;
    // inline maths inside maths would nest the dollars
    if (t.k === "x" && inMath(source, taRef.current?.selectionStart ?? 0)) return;
    insert(t.tex, !!t.math);
  };
  const [openPal, setOpenPal] = React.useState<string | null>(null);
  const shown = narrow ? tools.slice(0, 8) : tools;
  const more = narrow ? tools.slice(8) : [];

  const toolButton = (t: Tool) => {
    if (t.pal) {
      return (
        <Popover key={t.k} open={openPal === t.k} onOpenChange={(o) => setOpenPal(o ? t.k : null)}>
          <PopoverTrigger asChild>
            <button type="button" className={cx("k-mf-tool", t.cls)} aria-label={t.label} title={t.label} onMouseDown={(e) => e.preventDefault()}>
              {t.text}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
            {t.pal === "help" ? (
              <Help />
            ) : (
              <Palette
                label={t.label}
                items={t.pal === "greek" ? GREEK : CHEM}
                onPick={(tex) => {
                  setOpenPal(null);
                  insert(tex, true);
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      );
    }
    return (
      <button key={t.k} type="button" className={cx("k-mf-tool", t.cls)} aria-label={t.label} title={t.label} onMouseDown={(e) => e.preventDefault()} onClick={() => runTool(t)} disabled={disabled}>
        {t.text}
      </button>
    );
  };

  const showToolbar = !inline && toolbar !== "none" && (toolbar === "full" || focused);
  const toolbarEl = showToolbar && (
    <div className="k-mf-tb" role="toolbar" aria-label="Formatting">
      {shown.slice(0, 2).map(toolButton)}
      <span className="k-mf-tsep" />
      {shown.slice(2).map(toolButton)}
      <span className="k-mf-tsep" />
      {onUploadImage && (
        <button type="button" className="k-mf-tool" aria-label="Insert diagram" title="Insert diagram" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(null)} disabled={disabled}>
          {Icon.pic}
        </button>
      )}
      {narrow ? (
        <Popover open={openPal === "more"} onOpenChange={(o) => setOpenPal(o ? "more" : null)}>
          <PopoverTrigger asChild>
            <button type="button" className="k-mf-tool w" aria-label="More tools" onMouseDown={(e) => e.preventDefault()}>
              More
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
            <div className="row wrap gap-1">
              {more.map((t) =>
                t.pal ? (
                  <button key={t.k} type="button" className={cx("k-mf-tool", t.cls)} aria-label={t.label} onClick={() => setOpenPal(t.k)}>
                    {t.text}
                  </button>
                ) : (
                  <button key={t.k} type="button" className={cx("k-mf-tool", t.cls)} aria-label={t.label} onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpenPal(null); runTool(t); }}>
                    {t.text}
                  </button>
                )
              )}
              <button type="button" className="k-mf-tool w" aria-label="LaTeX help" onClick={() => setOpenPal("help")}>
                ? Help
              </button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={openPal === "help"} onOpenChange={(o) => setOpenPal(o ? "help" : null)}>
          <PopoverTrigger asChild>
            <button type="button" className="k-mf-tool w ml-auto" aria-label="LaTeX help" onMouseDown={(e) => e.preventDefault()}>
              ? Help
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-3">
            <Help />
          </PopoverContent>
        </Popover>
      )}
      {/* palettes opened from "More" on a narrow field */}
      {narrow && (openPal === "greek" || openPal === "chem" || openPal === "help") && (
        <Popover open onOpenChange={(o) => !o && setOpenPal(null)}>
          <PopoverTrigger asChild>
            <span className="ml-auto" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-2" onCloseAutoFocus={(e) => e.preventDefault()}>
            {openPal === "help" ? (
              <Help />
            ) : (
              <Palette
                label={openPal === "greek" ? "Greek letters" : "Chemistry"}
                items={openPal === "greek" ? GREEK : CHEM}
                onPick={(tex) => {
                  setOpenPal(null);
                  insert(tex, true);
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );

  /* ---------- events ---------- */
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    if (!files.length || !onUploadImage) return;
    e.preventDefault();
    files.forEach((f) => startUpload(f, true, null));
  };
  const onDrop = (e: React.DragEvent) => {
    setDragging(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/") || /\.(png|jpe?g|svg)$/i.test(f.name));
    if (!files.length || !onUploadImage) return;
    e.preventDefault();
    files.forEach((f) => startUpload(f, false, null));
  };

  const debounced = useDebouncedValue(doc.html, 300);
  const previewHtml = debounced;
  const errId = `${id ?? label}-err`;
  const latexErr = issues[0] ? issueText(issues[0]) : null;
  const invalid = !!error || issues.length > 0;
  const flagged = present.some((i) => i.needsLatex);

  const editor = (
    <div className={cx("k-mf-edit", dragging && "k-mf-drop")} onDragOver={(e) => { if (onUploadImage && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <div className={cx("k-mf-src", hi && "hi")} aria-hidden style={inline ? undefined : ({ ["--k-mf-min" as string]: `${minHeight}px` } as React.CSSProperties)}>
        {source ? <Mirror source={source} bad={issues} /> : <span className="ph">{placeholder ?? ""}</span>}
        {" "}
      </div>
      <textarea
        ref={taRef}
        id={id}
        className={cx("k-mf-ta", hi && "hi")}
        value={source}
        lang={hi ? "hi" : undefined}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={latexErr || (error && showError) ? errId : undefined}
        aria-multiline={!inline}
        spellCheck={false}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={1}
        onChange={(e) => commit(e.target.value, images)}
        onKeyDown={(e) => {
          if (inline && e.key === "Enter") e.preventDefault();
          if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "i")) {
            e.preventDefault();
            insert(e.key === "b" ? "<b>▮</b>" : "<i>▮</i>", false);
          }
        }}
        onPaste={onPaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );

  const imageRows = (present.length > 0 || uploads.length > 0) && (
    <div className="k-mf-imgs">
      {present.map((img) =>
        img.needsLatex ? (
          <div key={img.n} className="col">
            <div className={inline ? "row wrap gap-2 items-center" : "k-mf-flagrow"}>
              <span className="k-mf-eq" role="img" aria-label="Pasted image of an equation">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.alt || "Equation as an image"} />
                <span className="xs mono text-amber">{token(img.n).slice(1, -1)}</span>
              </span>
              <span className="k-flag">
                {Icon.warn}Equation is an image · needs LaTeX
              </span>
              <span className="xs muted">Tests can still use it, with a warning, until it&apos;s fixed.</span>
              <span className="row ml-auto gap-2">
                {onConvertImage && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onConvertImage(img)} disabled={disabled}>
                    {Icon.spark}Convert with AI
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => typeIt(img.n)} disabled={disabled}>
                  Type it
                </button>
              </span>
            </div>
            {imageExtra?.(img)}
          </div>
        ) : (
          <div key={img.n} className="k-mf-img">
            <figure className="k-mf-fig">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt={img.alt} />
            </figure>
            <div className="col grow gap-2" style={{ minWidth: 220 }}>
              <div className="field">
                <label className="label" htmlFor={`${id ?? label}-alt-${img.n}`}>
                  Alt text <span className="xs muted font-normal">· {token(img.n).slice(1, -1)}</span>
                </label>
                <input
                  id={`${id ?? label}-alt-${img.n}`}
                  className="k-input"
                  value={img.alt}
                  placeholder="Describe the diagram"
                  onChange={(e) => updateImage(img.n, { alt: e.target.value })}
                  disabled={disabled}
                />
                <span className="hint">Read aloud to students who use a screen reader.</span>
              </div>
              <div className="row wrap gap-2">
                <span className="seg k-seg k-sm" role="radiogroup" aria-label="Diagram size">
                  {(["small", "medium", "full"] as ImageSize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={(img.size ?? "medium") === s}
                      className={cx("tab", (img.size ?? "medium") === s && "on")}
                      onClick={() => updateImage(img.n, { size: s })}
                      disabled={disabled}
                    >
                      {s === "small" ? "Small" : s === "medium" ? "Medium" : "Full width"}
                    </button>
                  ))}
                </span>
                {onUploadImage && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose(img.n)} disabled={disabled}>
                    Replace
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm danger-hover" onClick={() => removeImage(img.n)} disabled={disabled}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        )
      )}
      {uploads.map((u) =>
        u.error ? (
          <div key={u.id} className="k-mf-file bad" role="alert">
            <span className="ico">{Icon.err}</span>
            <span className="meta">
              <span className="xs font-semibold">{u.name}</span>
              <span className="xs text-[#7A1010]">{u.error}</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setUploads((x) => x.filter((y) => y.id !== u.id)); choose(u.replace); }}>
              Choose another
            </button>
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`Dismiss ${u.name}`} onClick={() => setUploads((x) => x.filter((y) => y.id !== u.id))}>
              ✕
            </button>
          </div>
        ) : (
          <div key={u.id} className="k-mf-file">
            <span className="ico">{Icon.pic}</span>
            <span className="meta">
              <span className="row between xs">
                <span className="font-semibold">Uploading {u.name}</span>
                <span className="muted num">{u.pct}%</span>
              </span>
              <span className="bar" style={{ height: 5 }}>
                <i style={{ width: `${u.pct}%`, animation: "none" }} />
              </span>
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => u.ctrl.abort()}>
              Cancel
            </button>
          </div>
        )
      )}
    </div>
  );

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) startUpload(f, false, fileMode.current.replace);
      }}
    />
  );

  const errors = (
    <>
      {latexErr && (
        <span id={errId} className="k-mf-err" role="alert">
          {Icon.err}
          {latexErr}
        </span>
      )}
      {!latexErr && error && showError && (
        <span id={errId} className="k-mf-err" role="alert">
          {Icon.err}
          {error}
        </span>
      )}
    </>
  );

  if (inline) {
    const hasRender = /[$\\]|<img|<(b|i|sub|sup)>/i.test(previewHtml);
    return (
      <div ref={boxRef} className={cx("k-mf-inline", boxed && "boxed", focused && "f", invalid && "e", className)}>
        <div className="k-mf-line">
          {editor}
          {hasRender && previewHtml && <MathText html text={previewHtml} as="span" className={cx("k-mf-rend", hi && "hi")} />}
        </div>
        {imageRows}
        {fileInput}
        {errors}
      </div>
    );
  }

  return (
    <div className={cx("col gap-1.5", className)}>
      <div ref={boxRef} className={cx("k-mf", focused && "f", invalid && "e", flagged && "flagged", disabled && "off")}>
        {toolbarEl}
        {editor}
        {preview && previewHtml && (
          <div className="k-mf-pv" aria-live="polite">
            <span className="k-mf-pv-l">
              Preview <span>· as students see it</span>
            </span>
            <MathText html text={previewHtml} as="div" className={cx("k-mf-body", hi && "hi")} />
          </div>
        )}
        {imageRows}
        {fileInput}
      </div>
      {errors}
    </div>
  );
}
