/*
  The LaTeX field's source format (board Kit-Math, K12): bank RichText (HTML with $…$ maths) ↔ the text a teacher edits.

  - Paragraphs and <br> become line breaks; text is shown decoded ("a < b"), maths as typed ($\dfrac{3F}{2mL}$).
  - Inline formatting stays as tags in the source (<b>…</b>, <i>…</i>, <sub>, <sup>, <u>); other markup the bank may
    hold (tables, lists from Word imports) stays verbatim, so editing a question never drops it.
  - Each <img> becomes a token "⟦image n⟧"; the field lists the images under the text (alt text, size, the
    "needs LaTeX" flag). Deleting the token removes the image.
  Saving escapes text and maths again (&, <, > inside $…$ always; outside, a "<" that does not start a known tag).
  Every $…$ is checked with KaTeX ("Line 1: a "{" is never closed"); the editor keeps Save off until it parses.
  Browser only (DOMParser).
*/
import katex from "katex";
import "katex/contrib/mhchem";

export type ImageSize = "small" | "medium" | "full";
export interface FieldImage {
  /** token number: ⟦image n⟧ */
  n: number;
  src: string;
  alt: string;
  size: ImageSize | null;
  /** data-needs-latex="true": an equation pasted as a picture */
  needsLatex: boolean;
}

export const TOKEN_RE = /⟦image (\d+)⟧/g;
export const token = (n: number) => `⟦image ${n}⟧`;

/** Inline tags kept as tags in the source. */
const INLINE_TAGS = new Set(["b", "i", "u", "s", "sub", "sup"]);
const RENAME: Record<string, string> = { strong: "b", em: "i", strike: "s" };
/** Tags that pass through verbatim when saving (anything else starting with "<" is text). */
const KNOWN_TAGS = new Set([
  "b", "i", "u", "s", "sub", "sup", "strong", "em", "strike", "span", "small", "mark", "code", "pre", "br", "hr", "p", "div",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col", "ol", "ul", "li", "blockquote", "a", "font", "center",
]);

const escText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/* ─────────────────────────────── maths ranges in the source ─────────────────────────────── */

export interface MathRange {
  start: number;
  /** end (exclusive), including the closing delimiter */
  end: number;
  tex: string;
  display: boolean;
}

/**
 * $…$, $$…$$, \(…\), \[…\] ranges (pandoc's dollar rules, as @iitpulse/ui splitMath): an opening $ is followed by a
 * non-space, a closing $ follows a non-space and is not followed by a digit; inline $ never spans a blank line;
 * \$ is a literal dollar. Unclosed openers are reported in `open`.
 */
export function mathRanges(src: string): { ranges: MathRange[]; open: number[] } {
  const ranges: MathRange[] = [];
  const open: number[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "\\" && (src[i + 1] === "(" || src[i + 1] === "[")) {
      const close = src[i + 1] === "(" ? "\\)" : "\\]";
      const j = src.indexOf(close, i + 2);
      if (j < 0) {
        open.push(i);
        i += 2;
        continue;
      }
      ranges.push({ start: i, end: j + 2, tex: src.slice(i + 2, j), display: src[i + 1] === "[" });
      i = j + 2;
      continue;
    }
    if (c === "\\" && src[i + 1] === "$") {
      i += 2;
      continue;
    }
    if (c === "$") {
      if (src[i + 1] === "$") {
        const j = src.indexOf("$$", i + 2);
        if (j < 0) {
          open.push(i);
          i += 2;
          continue;
        }
        ranges.push({ start: i, end: j + 2, tex: src.slice(i + 2, j), display: true });
        i = j + 2;
        continue;
      }
      if (i + 1 < n && !/\s/.test(src[i + 1])) {
        let j = i + 1;
        let found = -1;
        while (j < n) {
          if (src[j] === "\\") {
            j += 2;
            continue;
          }
          if (src[j] === "\n" && src[j + 1] === "\n") break;
          if (src[j] === "$" && !/\s/.test(src[j - 1]) && !/\d/.test(src[j + 1] ?? "")) {
            found = j;
            break;
          }
          j++;
        }
        if (found > 0) {
          ranges.push({ start: i, end: found + 1, tex: src.slice(i + 1, found), display: false });
          i = found + 1;
          continue;
        }
        // "$\frac…" with no closer is unfinished maths; "$5" is a price
        if (/[\\a-zA-Z{]/.test(src[i + 1])) open.push(i);
      }
    }
    i++;
  }
  return { ranges, open };
}

export function inMath(src: string, pos: number): boolean {
  return mathRanges(src).ranges.some((r) => pos > r.start && pos < r.end);
}

/* ─────────────────────────────── checks ─────────────────────────────── */

export interface LatexIssue {
  line: number;
  message: string;
  /** source range of the bad maths (for the red mark) */
  start: number;
  end: number;
}

function braceProblem(tex: string): string | null {
  let depth = 0;
  for (let i = 0; i < tex.length; i++) {
    const c = tex[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth < 0) return 'a "}" has no matching "{"';
    }
  }
  return depth > 0 ? 'a "{" is never closed' : null;
}

function katexProblem(tex: string, display: boolean): string | null {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: "ignore", trust: false, displayMode: display, maxExpand: 1000, maxSize: 50 });
    return null;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    const undef = /Undefined control sequence: (\\[A-Za-z]+)/.exec(m);
    if (undef) return `${undef[1]} isn't a maths command`;
    if (/Expected '\\right'|Missing \\right/i.test(m)) return 'a "\\left" has no "\\right"';
    if (/Expected 'EOF', got '\\right'/i.test(m)) return 'a "\\right" has no "\\left"';
    if (/Expected group after '\^'|Expected group after '_'/.test(m)) return "a ^ or _ has nothing after it";
    return m.replace(/^KaTeX parse error:\s*/, "").replace(/ at position \d+:[\s\S]*$/, "").trim() || "this maths doesn't parse";
  }
}

/** Problems in a field's source (lines are 1-based). */
export function sourceIssues(src: string): LatexIssue[] {
  const out: LatexIssue[] = [];
  const lineOf = (pos: number) => src.slice(0, pos).split("\n").length;
  const { ranges, open } = mathRanges(src);
  for (const r of ranges) {
    if (!r.tex.trim()) continue;
    const msg = braceProblem(r.tex) ?? katexProblem(r.tex, r.display);
    if (msg) out.push({ line: lineOf(r.start), message: msg, start: r.start, end: r.end });
  }
  for (const p of open) {
    const d = src.startsWith("$$", p) ? "$$" : src.startsWith("\\(", p) ? "\\(" : src.startsWith("\\[", p) ? "\\[" : "$";
    const lineEnd = src.indexOf("\n", p);
    out.push({ line: lineOf(p), message: `a "${d}" is never closed`, start: p, end: lineEnd < 0 ? src.length : lineEnd });
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Problems in stored RichText (the editor's Save check). */
export function latexIssues(html: string): LatexIssue[] {
  if (!html || !/[$\\]/.test(html)) return [];
  return sourceIssues(htmlToSource(html).source);
}

export function issueText(i: LatexIssue): string {
  return `Line ${i.line}: ${i.message}. Save is off until it's fixed.`;
}

/* ─────────────────────────────── HTML → source ─────────────────────────────── */

const BLOCKS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"]);
const VERBATIM = new Set(["TABLE", "OL", "UL", "PRE", "CODE", "A", "FONT", "CENTER", "HR"]);

function parse(html: string): Document | null {
  if (typeof DOMParser === "undefined") return null;
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
}

function imageOf(el: Element, n: number): FieldImage {
  const size = el.getAttribute("data-size");
  return {
    n,
    src: el.getAttribute("src") ?? "",
    alt: el.getAttribute("alt") ?? "",
    size: size === "small" || size === "medium" || size === "full" ? size : null,
    needsLatex: el.getAttribute("data-needs-latex") === "true",
  };
}

/**
 * Stored HTML → editable source and its images. `inline` (options, list rows): no paragraphs, line breaks are <br>.
 * Plain text without tags (old option values) passes through as is.
 */
export function htmlToSource(html: string, startAt = 1): { source: string; images: FieldImage[] } {
  const images: FieldImage[] = [];
  if (!html) return { source: "", images };
  if (!/[<&]/.test(html)) return { source: html, images };
  const doc = parse(html);
  if (!doc) return { source: html, images };
  let next = startAt;
  const walk = (node: Node): string => {
    let out = "";
    node.childNodes.forEach((ch) => {
      if (ch.nodeType === 3) {
        out += (ch as Text).data.replace(/\u00a0/g, " ");
        return;
      }
      if (ch.nodeType !== 1) return;
      const el = ch as Element;
      const tag = el.tagName;
      if (tag === "IMG") {
        const img = imageOf(el, next++);
        images.push(img);
        out += token(img.n);
        return;
      }
      if (tag === "BR") {
        out += "\n";
        return;
      }
      const lower = tag.toLowerCase();
      const name = RENAME[lower] ?? lower;
      if (INLINE_TAGS.has(name)) {
        const inner = walk(el);
        out += inner ? `<${name}>${inner}</${name}>` : "";
        return;
      }
      if (VERBATIM.has(tag)) {
        // keep the markup; images inside still become tokens
        const clone = el.cloneNode(true) as Element;
        clone.querySelectorAll("img").forEach((im) => {
          const img = imageOf(im, next++);
          images.push(img);
          im.replaceWith(doc.createTextNode(token(img.n)));
        });
        out += clone.outerHTML;
        return;
      }
      if (BLOCKS.has(tag)) {
        if (out && !out.endsWith("\n")) out += "\n";
        const inner = walk(el);
        out += inner === "\n" ? "" : inner;
        out += "\n";
        return;
      }
      out += walk(el); // span and other wrappers: their content
    });
    return out;
  };
  const source = walk(doc.body).replace(/\n$/, "");
  return { source, images };
}

/* ─────────────────────────────── source → HTML ─────────────────────────────── */

function imgHtml(img: FieldImage): string {
  return `<img src="${escAttr(img.src)}" alt="${escAttr(img.alt)}"${img.size ? ` data-size="${img.size}"` : ""}${img.needsLatex ? ' data-needs-latex="true"' : ""}>`;
}

/** Escapes one text run: known tags and entities pass, other < > & are escaped; tokens become <img>. */
function textRun(s: string, images: Map<number, FieldImage>): string {
  let out = "";
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)(\s[^<>]*)?\/?>|&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]{2,8});|⟦image (\d+)⟧/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    const tagName = m[1]?.toLowerCase();
    if (tagName && !KNOWN_TAGS.has(tagName)) continue;
    out += escText(s.slice(last, m.index));
    if (m[4]) {
      const img = images.get(Number(m[4]));
      out += img ? imgHtml(img) : "";
    } else out += m[0];
    last = m.index + m[0].length;
  }
  return out + escText(s.slice(last));
}

/** One line (or the whole inline value) → HTML: maths escaped whole, text with tags and tokens. */
function lineHtml(line: string, images: Map<number, FieldImage>): string {
  const { ranges } = mathRanges(line);
  let out = "";
  let at = 0;
  for (const r of ranges) {
    out += textRun(line.slice(at, r.start), images);
    out += escText(line.slice(r.start, r.end));
    at = r.end;
  }
  return out + textRun(line.slice(at), images);
}

/** Editable source → stored HTML. Block: a <p> per line (empty lines kept); inline: lines joined with <br>. */
export function sourceToHtml(source: string, images: FieldImage[], inline = false): string {
  const map = new Map(images.map((i) => [i.n, i]));
  if (!source.trim()) return "";
  if (inline) return source.split("\n").map((l) => lineHtml(l, map)).join("<br>");
  // display maths may span lines: split on newlines outside $$…$$ / \[…\]
  const { ranges } = mathRanges(source);
  const lines: string[] = [];
  let cur = "";
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\n" && !ranges.some((r) => i > r.start && i < r.end)) {
      lines.push(cur);
      cur = "";
    } else cur += ch;
  }
  lines.push(cur);
  return lines
    .map((l) => {
      // verbatim blocks (tables, lists) stand on their own
      if (/^\s*<(table|ol|ul|pre|hr)\b/i.test(l)) return lineHtml(l, map);
      return l.trim() ? `<p>${lineHtml(l, map)}</p>` : "<p><br></p>";
    })
    .join("");
}

/* ─────────────────────────────── helpers for forms ─────────────────────────────── */

/** True when the value has no visible text and no image. */
export function isBlankHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  if (/<img\b/i.test(html)) return false;
  return !html.replace(/<[^>]+>/g, "").replace(/&nbsp;|\u00a0/g, " ").trim();
}

/** Only maths (and spaces/punctuation): the same in Hindi ("Options are maths only, so they're the same in Hindi"). */
export function isMathsOnly(html: string | null | undefined): boolean {
  if (!html || isBlankHtml(html) || /<img\b/i.test(html)) return false;
  const src = htmlToSource(html).source;
  const { ranges } = mathRanges(src);
  if (!ranges.length) return /^[\s\d.,+\-−×/()=%]+$/.test(src.replace(/<[^>]+>/g, ""));
  let rest = "";
  let at = 0;
  for (const r of ranges) {
    rest += src.slice(at, r.start);
    at = r.end;
  }
  rest += src.slice(at);
  return !/[A-Za-z\u0900-\u097F\u00C0-\u024F]/.test(rest.replace(/<[^>]+>/g, ""));
}

/** Images in stored HTML. */
export function imagesIn(html: string | null | undefined): FieldImage[] {
  if (!html || !/<img\b/i.test(html)) return [];
  return htmlToSource(html).images;
}

/** data-needs-latex images in a value. */
export function needsLatexCount(html: string | null | undefined): number {
  if (!html || !/data-needs-latex/i.test(html)) return 0;
  return imagesIn(html).filter((i) => i.needsLatex).length;
}

/** "Convert with AI" accepted: that one <img> becomes $latex$ (the flag goes with it). */
export function replaceImageWithLatex(html: string, imageSrc: string, latex: string): string {
  const { source, images } = htmlToSource(html);
  const hit = images.find((i) => i.src === imageSrc);
  if (!hit) return html;
  const tex = latex.trim().replace(/^\$+|\$+$/g, "");
  const next = source.replace(token(hit.n), `$${tex}$`);
  const inline = !/^\s*<p[\s>]/i.test(html);
  return sourceToHtml(next, images, inline);
}

/** Plain text for one-line summaries (tokens dropped). */
export function sourcePreview(html: string, max = 120): string {
  const { source } = htmlToSource(html);
  const t = source.replace(TOKEN_RE, "[image]").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
