"use client";
/*
  Admin-Branding + Admin-BrandingStates (canvas v196, approved 6 Nov): the institute's address, logo, square icon and
  primary colour, with a live preview of the student home and sign-in page in those colours. Every change saves to the
  draft at once ("Unpublished changes"); Publish asks first and then goes live on the student portal. History lists
  every published version; Restore makes a new draft from one. API: lib/branding-api.ts (platform /admin/branding).
*/
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Blueboard, LogoMark } from "@iitpulse/ui";
import { contrast, deriveTenantTheme, isHexColor, parseHex, tenantCss } from "@iitpulse/ui/tenant";
import { Topbar } from "@/components/admin/Topbar";
import { ConfirmDialog, Drawer, Field, FileDrop, InlineNote, NoAccess, PageError, PageSkeleton, Segmented, TextInput, apiError, fmtDateTime, notify } from "@/components/kit";
import { examRefs, useM6Exams } from "@/lib/m6/shared";
import { brandingApi, type BrandView, type BrandingPage as PageData, type BrandingState, type UploadedAsset } from "@/lib/branding-api";

const SWATCHES = ["#00007E", "#0E6B4A", "#B4530A", "#6D28D9", "#0B63C4", "#BE123C", "#F5B700"];
const WHITE = parseHex("#FFFFFF");
const ACCEPT = [".png", ".jpg", ".jpeg", ".svg"];
const DEFAULT_TENANT = "tnt_iitpulse";

function normHex(v: string): string | null {
  const t = v.trim();
  const full = /^#?([0-9a-f]{6})$/i.exec(t);
  if (full) return `#${full[1]!.toUpperCase()}`;
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(t);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase() : null;
}

/** "logo-final.webp can't be used. Upload a PNG, JPG or SVG." (board Admin-BrandingStates) */
function uploadProblem(file: File, e: unknown): string {
  const { code, message } = apiError(e);
  if (code === "UNSUPPORTED_TYPE") return `${file.name} can't be used. Upload a PNG, JPG or SVG.`;
  if (code === "FILE_TOO_LARGE") return `The file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 1 MB. Export a smaller PNG, or use SVG.`;
  if (code === "LOGO_TOO_SMALL" || code === "ICON_TOO_SMALL" || code === "ICON_NOT_SQUARE" || code === "IMAGE_UNREADABLE") return message ?? "We couldn't use this image.";
  return message ?? "Couldn't upload the file. Try again.";
}

export function BrandingPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["branding"], queryFn: brandingApi.get, retry: false });
  const [state, setState] = useState<BrandingState | null>(null);
  const [hex, setHex] = useState("");
  const [view, setView] = useState<"home" | "login">("home");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [cleaned, setCleaned] = useState<"logo" | "icon" | null>(null);
  const [replacing, setReplacing] = useState(false);
  const hexTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const data: PageData | undefined = q.data;
  useEffect(() => {
    if (!data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the editable copy starts from each fresh server answer
    setState({ live: data.live, draft: data.draft, changes: data.changes, checks: data.checks });
    setHex((data.draft ?? data.live).primary);
  }, [data]);

  const shown: BrandView | null = state ? (state.draft ?? state.live) : null;
  const dirty = !!state && state.changes.length > 0;

  const save = useCallback(async (body: Parameters<typeof brandingApi.saveDraft>[0]) => {
    setSaving(true);
    try {
      const next = await brandingApi.saveDraft(body);
      setState(next);
      return next;
    } catch (e) {
      notify.error("Couldn't save the change", { description: apiError(e).message ?? "Try again in a moment." });
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const pickColour = (c: string) => {
    setHex(c);
    if (hexTimer.current) clearTimeout(hexTimer.current);
    if (shown && c !== shown.primary) void save({ primary: c });
  };
  const typeHex = (v: string) => {
    setHex(v);
    if (hexTimer.current) clearTimeout(hexTimer.current);
    const n = normHex(v);
    if (n && shown && n !== shown.primary) hexTimer.current = setTimeout(() => void save({ primary: n }), 450);
  };

  const upload = async (kind: "logo" | "icon", file: File) => {
    const setErr = kind === "logo" ? setLogoError : setIconError;
    setErr(null);
    setCleaned(null);
    let asset: UploadedAsset;
    try {
      asset = await brandingApi.upload(kind, file);
    } catch (e) {
      setErr(uploadProblem(file, e));
      return;
    }
    const next = await save(kind === "logo" ? { logoAssetId: asset.assetId } : { iconAssetId: asset.assetId });
    if (next) {
      if (asset.cleaned) setCleaned(kind);
      if (kind === "logo") setReplacing(false);
    }
  };

  const publish = async () => {
    if (!state?.draft) return;
    try {
      const out = await brandingApi.publish(state.draft.id!);
      setState({ live: out.live, draft: null, changes: [], checks: state.checks });
      notify.success(out.liveOn ? `Live on ${out.liveOn}` : "Branding published");
      void qc.invalidateQueries({ queryKey: ["branding-history"] });
    } catch (e) {
      const { code, message } = apiError(e);
      if (code === "DRAFT_CHANGED") void q.refetch();
      throw new Error(message ?? "Couldn't publish. Try again.");
    }
  };

  const restore = async (version: number) => {
    try {
      const next = await brandingApi.restore(version);
      setState(next);
      setHex((next.draft ?? next.live).primary);
      setHistoryOpen(false);
      notify.success(`Version ${version} is now the draft`, { description: "Publish it to make it live." });
    } catch (e) {
      notify.error("Couldn't restore that version", { description: apiError(e).message ?? undefined });
    }
  };

  if (q.isError) {
    const { status, code } = apiError(q.error);
    return (
      <>
        <Topbar title="Branding" />
        <main className="p-7">{status === 403 && code !== "TENANT_SUSPENDED" ? <NoAccess what="Branding" /> : <PageError what="branding" code={code ?? undefined} onRetry={() => q.refetch()} />}</main>
      </>
    );
  }
  if (!data || !state || !shown) {
    return (
      <>
        <Topbar title="Branding" />
        <main className="p-7">
          <PageSkeleton rows={6} />
        </main>
      </>
    );
  }

  const host = data.addresses.student;
  const [sub, rest] = host && /^[^.:]+\.[^:]+$/.test(host) ? [host.slice(0, host.indexOf(".")), host.slice(host.indexOf("."))] : [host ?? "—", ""];
  const valid = normHex(hex);
  const ratio = valid && isHexColor(valid) ? contrast(WHITE, parseHex(valid)) : null;
  const theme = valid ? deriveTenantTheme({ primary: valid, accent: shown.accent }) : null;
  const isIitp = data.tenant.id === DEFAULT_TENANT;

  return (
    <>
      <Topbar
        title="Branding"
        badge={dirty ? <span className="badge b-amber pop">Unpublished changes</span> : undefined}
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHistoryOpen(true)}>
              History
            </button>
            <button type="button" className={`btn btn-sm ${dirty ? "btn-primary" : "btn-secondary"}`} disabled={!dirty || saving} onClick={() => setConfirm(true)}>
              Publish to portal
            </button>
          </>
        }
      />
      <main className="flex flex-wrap items-start gap-[18px] px-7 pt-[22px] pb-10" data-testid="branding-page">
        <section className="col gap-3.5" style={{ flex: "1 1 380px", maxWidth: 460 }}>
          <div className="card pad-lg col rise gap-3.5" style={{ "--i": 0 } as CSSProperties}>
            <h2 className="h3">Address</h2>
            <div className="row" style={{ gap: 0 }}>
              <span className="input mono row" style={{ borderRadius: rest ? "10px 0 0 10px" : 10, background: "var(--ground)", fontSize: 13 }}>
                {sub}
              </span>
              {rest && (
                <span className="mono sm row" style={{ height: 36, padding: "0 14px", border: "1px solid var(--line)", borderLeft: 0, borderRadius: "0 10px 10px 0", background: "var(--ground)", color: "var(--muted)" }}>
                  {rest}
                </span>
              )}
            </div>
            <span className="xs muted">{host ? `Students sign in at ${host}. Ask IIT-PULSE support to change it.` : "Your student address isn't set up yet. Ask IIT-PULSE support."}</span>
          </div>

          <div className="card pad-lg col rise gap-3.5" style={{ "--i": 1 } as CSSProperties}>
            <h2 className="h3">Logo</h2>
            {shown.logo && !replacing ? (
              <div className="row gap-3">
                <div className="grow" style={{ height: 72, border: "1px dashed var(--navy-200)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the institute's uploaded logo */}
                  <img src={shown.logo.url} alt="Current logo" style={{ maxHeight: 40, maxWidth: "80%", objectFit: "contain" }} />
                </div>
                <div className="col gap-1.5">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReplacing(true)}>
                    Replace
                  </button>
                  <span className="xs muted">PNG/SVG · wide</span>
                </div>
              </div>
            ) : !replacing && isIitp ? (
              <div className="row gap-3">
                <div className="grow" style={{ height: 72, border: "1px dashed var(--navy-200)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
                  <LogoMark />
                </div>
                <div className="col gap-1.5">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReplacing(true)}>
                    Replace
                  </button>
                  <span className="xs muted">PNG/SVG · wide</span>
                </div>
              </div>
            ) : (
              <div className="col gap-2">
                <FileDrop
                  accept={ACCEPT}
                  maxBytes={data.limits.maxBytes}
                  onFile={(f) => void upload("logo", f)}
                  title="Drop a file or"
                  rules={`PNG, JPG or SVG · up to 1 MB · at least ${data.limits.minLogoWidth} px wide · shown on white`}
                  error={logoError}
                  onErrorClear={() => setLogoError(null)}
                  disabled={saving}
                  minHeight={120}
                />
                {replacing && (
                  <button type="button" className="btn btn-ghost btn-sm self-start" onClick={() => (setReplacing(false), setLogoError(null))}>
                    Keep the current logo
                  </button>
                )}
              </div>
            )}
            {cleaned && (
              <InlineNote>
                <b>We cleaned your SVG.</b> Scripts, links and embedded images were removed for safety. Check the preview looks right.
              </InlineNote>
            )}
            <div className="row gap-3">
              <span className="sm grow">Square icon (favicon, phone)</span>
              {shown.icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- the institute's uploaded icon
                <img src={shown.icon.url} alt="Current icon" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
              ) : (
                <span style={{ width: 36, height: 36, borderRadius: 10, background: theme?.primary ?? shown.primary, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                  {initials(data.tenant.displayName)}
                </span>
              )}
              <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                {shown.icon ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept={ACCEPT.join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void upload("icon", f);
                  }}
                />
              </label>
            </div>
            {iconError && (
              <p className="xs m-0" role="alert" style={{ color: "var(--red-600)" }}>
                {iconError}
              </p>
            )}
          </div>

          <div className="card pad-lg col rise gap-3.5" style={{ "--i": 2 } as CSSProperties}>
            <h2 className="h3">Primary color</h2>
            <div className="row wrap gap-2" role="radiogroup" aria-label="Suggested colors">
              {SWATCHES.map((c) => {
                const on = (valid ?? "").toUpperCase() === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Use ${c}`}
                    onClick={() => pickColour(c)}
                    style={{ width: 34, height: 34, borderRadius: 10, background: c, border: "2px solid transparent", boxShadow: on ? "0 0 0 2px #fff inset, 0 0 0 2px var(--ink)" : undefined, cursor: "pointer" }}
                  />
                );
              })}
            </div>
            <Field label="Hex" htmlFor="brand-hex" error={hex && !valid ? "Use a colour like #00007E." : undefined}>
              <TextInput id="brand-hex" mono value={hex} onChange={(e) => typeHex(e.target.value)} invalid={!!hex && !valid} style={{ width: 160 }} />
            </Field>
            {ratio !== null && theme && (
              <div className="row gap-2 rounded-[10px] px-3 py-2.5" style={{ background: theme.adjusted.primary ? "#FFF4E2" : "#E9F6EE" }} data-testid="contrast-note">
                <span className="sm font-semibold" style={{ color: theme.adjusted.primary ? "#8A4F00" : "#0B6B35" }}>
                  {theme.adjusted.primary
                    ? `⚠ Too light for white text (${ratio.toFixed(1)}:1). Buttons and text use a darker shade (${theme.primary}) instead.`
                    : `✓ White text on this color passes (${ratio.toFixed(1)}:1)`}
                </span>
              </div>
            )}
            <span className="xs muted">
              Used for buttons, highlights, the live-test card and the notebook ink and paper students see. Text colors adjust automatically so everything stays readable.
            </span>
          </div>
        </section>

        <BrandPreview view={view} onView={setView} primary={valid ?? shown.primary} accent={shown.accent} logoUrl={shown.logo?.url ?? null} name={data.tenant.displayName} isIitp={isIitp} host={host} />
      </main>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        tone="navy"
        title="Publish the new branding?"
        description="Students see it on their next page load. Anyone writing a test sees it after they submit; the exam screen doesn't change mid-test."
        confirmLabel="Publish"
        facts={[["Changes", state.changes.join(" · ")]]}
        onConfirm={publish}
      >
        <p className="sm muted m-0">You can go back to any earlier version from History.</p>
      </ConfirmDialog>

      <HistoryDrawer open={historyOpen} onOpenChange={setHistoryOpen} onRestore={restore} />
    </>
  );
}

function initials(name: string): string {
  const w = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? w[0]?.[1] ?? "")).toUpperCase();
}

/** The board's preview: the student home or sign-in page, themed with the draft colour (scoped to .brand-pv). */
function BrandPreview({ view, onView, primary, accent, logoUrl, name, isIitp, host }: { view: "home" | "login"; onView: (v: "home" | "login") => void; primary: string; accent: string; logoUrl: string | null; name: string; isIitp: boolean; host: string | null }) {
  // G69: the sign-in tagline names the institute's own exams (Setup › Exams), never a hard-coded list
  const exams = useM6Exams(isIitp);
  const examLine = examRefs(exams.data).slice(0, 3).map((e) => e.name).join(" · ");
  const css = useMemo(() => {
    try {
      return tenantCss(deriveTenantTheme({ primary, accent }), ".brand-pv");
    } catch {
      return "";
    }
  }, [primary, accent]);
  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- preview of the uploaded logo
    <img src={logoUrl} alt="" style={{ height: 22, maxWidth: 120, objectFit: "contain" }} />
  ) : isIitp ? (
    <LogoMark />
  ) : (
    <span className="sm font-semibold">{name}</span>
  );
  return (
    <section className="card col rise min-w-0 overflow-hidden" style={{ flex: "999 1 520px", "--i": 3 } as CSSProperties} aria-label="Preview">
      <div className="row between pad" style={{ borderBottom: "1px solid var(--line-2)" }}>
        <h2 className="h3">Preview</h2>
        <Segmented
          ariaLabel="Preview page"
          value={view}
          onChange={onView}
          options={[
            { value: "home", label: "Student home" },
            { value: "login", label: "Sign-in page" },
          ]}
        />
      </div>
      <div style={{ background: "var(--ground)", padding: 20 }}>
        {css && <style>{css}</style>}
        <div className="brand-pv cl-paper" style={{ borderRadius: 16, overflow: "hidden", border: "1px solid var(--line)", background: "var(--cl-paper)" }} data-testid="brand-preview">
          <div className="row" style={{ height: 56, padding: "0 18px", gap: 18, background: "#fff", borderBottom: "1px solid var(--line)" }}>
            {logo}
            <span className="sm font-semibold" style={{ color: "var(--navy)" }}>
              Home
            </span>
            <span className="sm muted">Tests</span>
            <span className="sm muted">Progress</span>
            {host && <span className="xs mono muted ml-auto">{host}</span>}
          </div>
          {view === "home" ? (
            <div className="col fade gap-3.5" style={{ padding: 18 }}>
              <Blueboard smudge={{ right: -90, top: 6, width: 300, height: 100 }} className="col gap-3" style={{ borderRadius: 18, padding: 22, color: "#fff" }}>
                <span className="xs" style={{ opacity: 0.85 }}>
                  ● Live now · ends in 02:14:36
                </span>
                <span style={{ fontSize: 26, fontWeight: 650, letterSpacing: "-.02em" }}>JEE Main Mock 12</span>
                <div className="row gap-3">
                  <span className="btn btn-sm" style={{ background: "#fff", color: "var(--navy)" }}>
                    Start test →
                  </span>
                  <span className="cl-note chalk" style={{ fontSize: 18 }}>
                    all the best!
                  </span>
                </div>
              </Blueboard>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <div className="card pad col gap-2">
                  <div className="row between gap-2">
                    <span className="xs muted">Last result</span>
                    <span className="cl-sticker" style={{ fontSize: 12 }}>
                      Personal best
                    </span>
                  </div>
                  <span style={{ fontSize: 28, fontWeight: 650 }}>
                    248 <span className="sm muted">/300</span>
                  </span>
                </div>
                <div className="col gap-2" style={{ padding: 16, borderRadius: 16, background: "var(--navy-50)", border: "1px solid var(--navy-100)" }}>
                  <span className="xs font-bold" style={{ color: "var(--navy)" }}>
                    ✦ WEAK TOPICS
                  </span>
                  <span className="sm">Rotational motion · 38%</span>
                  <span className="sm">Chemical equilibrium · 46%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="row fade" style={{ minHeight: 320, alignItems: "stretch", gap: 0 }}>
              <Blueboard className="col" style={{ flex: 1, padding: 24, color: "#fff", justifyContent: "flex-end", gap: 8 }}>
                {!isIitp && <span className="sm font-semibold">{name}</span>}
                <span style={{ fontSize: 22, fontWeight: 650 }}>Every test makes the next one easier.</span>
                <span className="xs" style={{ opacity: 0.8 }}>
                  {isIitp ? examLine : `${host ?? ""} · Powered by IIT-PULSE`}
                </span>
              </Blueboard>
              <div className="col" style={{ flex: 1, padding: 24, gap: 10, justifyContent: "center", background: "#fff" }}>
                <span className="h3">Welcome back</span>
                <span className="input" style={{ height: 36, display: "flex", alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
                  you@example.com
                </span>
                <span className="input" style={{ height: 36, display: "flex", alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
                  ••••••••
                </span>
                <span className="btn btn-primary btn-sm justify-center">Sign in</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HistoryDrawer({ open, onOpenChange, onRestore }: { open: boolean; onOpenChange: (o: boolean) => void; onRestore: (v: number) => void }) {
  const h = useQuery({ queryKey: ["branding-history"], queryFn: () => brandingApi.history(), enabled: open });
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Branding history" footer={<p className="xs muted m-0">Restoring makes a new draft; publish it to make it live.</p>}>
      {h.isLoading ? (
        <div className="col gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="skel h-[52px]" />
          ))}
        </div>
      ) : h.isError ? (
        <PageError what="the history" onRetry={() => h.refetch()} />
      ) : !h.data?.items.length ? (
        <p className="sm muted">Nothing has been published yet. Your institute shows IIT-PULSE&apos;s default look.</p>
      ) : (
        <ul className="col m-0 list-none gap-0 p-0" data-testid="branding-history">
          {h.data.items.map((v) => {
            const live = v.version === h.data.liveVersion;
            return (
              <li key={v.version} className="row gap-3" style={{ padding: "12px 0", borderTop: "1px solid var(--line-2)" }}>
                <span aria-hidden style={{ width: 22, height: 22, borderRadius: 7, background: v.primary, flex: "none" }} />
                <span className="col grow min-w-0">
                  <span className="sm font-semibold truncate">
                    {live ? "Current" : `Version ${v.version}`} · {v.publishedByName ?? "IIT-PULSE support"}
                  </span>
                  <span className="xs muted">
                    {fmtDateTime(v.publishedAt)} · {v.primary}
                    {v.logo ? "" : " · no logo"}
                  </span>
                </span>
                {live ? (
                  <span className="badge b-green">Live</span>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRestore(v.version)}>
                    Restore
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}

