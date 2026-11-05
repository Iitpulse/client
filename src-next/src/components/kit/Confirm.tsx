"use client";
/*
  K07 Confirmation family (Kit-Overlays): the weight of the confirm matches the harm.
    - can be undone          → no dialog: do it, then toast with Undo (notify.undo)
    - can't be undone        → <ConfirmDialog tone="danger">
    - big effect, safe       → <ConfirmDialog tone="navy"> (facts list, focus on the action)
    - removes students' data or access (delete a user, batch, role, published test or its results; sign out
      everywhere) → <ReauthDialog>: asks for the password, gets a 5-minute re-auth token (POST /users/auth/reauth)
      and hands it to the action, which sends it as the `x-reauth-token` header
    - not allowed right now  → <BlockedDialog> (why, when, one way forward)
    - a whole institute      → <TypedConfirmDialog>
    - leaving with changes   → <UnsavedChangesDialog> (Discard on the left)
  Name the thing and the count; the action button repeats verb and object; danger red only for loss. Focus starts
  on Cancel in red confirms and on the action in navy ones. Password confirms stay open on a wrong password.
*/
import { useEffect, useId, useState, type ReactNode } from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { apiUsers } from "@/lib/api";
import { FieldError, PasswordInput, ServerErrorBanner } from "./Field";
import { KitDialog } from "./Overlay";
import { apiError, cx } from "./utils";

/** Header that carries the re-auth token (contract REAUTH_HEADER). */
export const REAUTH_HEADER = "x-reauth-token";

/** POST /users/auth/reauth → the 5-minute token. Throws the axios error (401 WRONG_PASSWORD, 429 TOO_MANY_ATTEMPTS). */
export async function requestReauth(password: string): Promise<string> {
  const r = await apiUsers.post("/auth/reauth", { password });
  const d = r.data?.data ?? r.data;
  return d.reauthToken as string;
}
/** Axios config with the re-auth header. */
export const withReauth = (token: string) => ({ headers: { [REAUTH_HEADER]: token } });

function errText(e: unknown, fallback: string) {
  const a = apiError(e);
  return a.message || fallback;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  tone = "danger",
  confirmLabel,
  onConfirm,
  children,
  facts,
  secondary,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  tone?: "danger" | "navy";
  /** the verb and object: "Delete pattern", "Re-score 212 students" */
  confirmLabel: string;
  /** may be async; a thrown error shows in the dialog and keeps it open */
  onConfirm: () => unknown | Promise<unknown>;
  children?: ReactNode;
  /** navy confirms: a facts list ("Scores · 212 recalculated, ranks too") */
  facts?: Array<[ReactNode, ReactNode]>;
  secondary?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cancelId = useId();
  const okId = useId();
  useEffect(() => {
    if (open) setErr(null);
  }, [open]);
  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (e) {
      setErr(errText(e, "Couldn't finish. Try again."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog
      open={open}
      onOpenChange={onOpenChange}
      alert
      busy={busy}
      title={title}
      description={description}
      icon={tone === "danger" ? <CircleAlert className="size-[18px]" aria-hidden /> : undefined}
      iconTone="red"
      initialFocus={tone === "danger" ? cancelId : okId}
      footer={
        <>
          <button id={cancelId} type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          {secondary}
          <button id={okId} type="button" className={cx("btn btn-sm", tone === "danger" ? "k-danger" : "btn-primary")} disabled={busy} onClick={go}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      {facts && (
        <div className="k-facts">
          {facts.map(([k, v], i) => (
            <span key={i} style={{ display: "contents" }}>
              <span className="muted">{k}</span>
              <span className="num">{v}</span>
            </span>
          ))}
        </div>
      )}
      {children}
      {err && <ServerErrorBanner title="Couldn't finish" detail={err} />}
    </KitDialog>
  );
}

export function BlockedDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  closeLabel = "Got it",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** "Can't delete JEE Main Mock 12 yet" */
  title: ReactNode;
  /** why, and when it will be possible */
  description: ReactNode;
  /** one useful way forward ("Show the 2 tests", "Watch it live") */
  action?: ReactNode;
  closeLabel?: string;
}) {
  return (
    <KitDialog
      open={open}
      onOpenChange={onOpenChange}
      alert
      title={title}
      description={description}
      icon={<TriangleAlert className="size-[18px]" aria-hidden />}
      iconTone="amber"
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </button>
          {action}
        </>
      }
    />
  );
}

export function ReauthDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  secondary,
  footnote,
  passwordHint = "We ask because this changes someone's account.",
  width = "md",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** "Delete batch", "Deactivate & anonymise", "Erase everything" */
  confirmLabel: string;
  /** called with the re-auth token; send it as `x-reauth-token` (withReauth). Throw to show the error. */
  onConfirm: (reauthToken: string) => Promise<unknown> | unknown;
  /** body between the title and the password (lists, warnings) */
  children?: ReactNode;
  /** a safer alternative button ("Archive instead") */
  secondary?: ReactNode;
  /** a line under the buttons ("A privacy request? Erase everything instead") */
  footnote?: ReactNode;
  passwordHint?: ReactNode;
  width?: "md" | "w500" | "wide";
}) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pid = useId().replace(/:/g, "");
  useEffect(() => {
    if (open) {
      setPw("");
      setPwErr(null);
      setErr(null);
    }
  }, [open]);
  const go = async () => {
    if (!pw) {
      setPwErr("Type your password");
      return;
    }
    setBusy(true);
    setPwErr(null);
    setErr(null);
    let token: string;
    try {
      token = await requestReauth(pw);
    } catch (e) {
      const a = apiError(e);
      if (a.code === "WRONG_PASSWORD" || a.status === 401) {
        const left = (a.details as { triesLeft?: number } | null)?.triesLeft;
        setPwErr(left != null && left <= 2 ? `That's not your password · ${left} ${left === 1 ? "try" : "tries"} left` : "That's not your password");
      } else if (a.code === "TOO_MANY_ATTEMPTS" || a.status === 429) {
        const s = (a.details as { retryAfterSeconds?: number } | null)?.retryAfterSeconds ?? 900;
        setPwErr(`Too many tries. Try again in ${Math.max(1, Math.ceil(s / 60))} minutes`);
      } else setErr(a.message || "The server didn't answer. Try again.");
      setBusy(false);
      return;
    }
    try {
      await onConfirm(token);
      onOpenChange(false);
    } catch (e) {
      setErr(errText(e, "Couldn't finish. Try again."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <KitDialog
      open={open}
      onOpenChange={onOpenChange}
      alert
      busy={busy}
      width={width}
      title={title}
      description={description}
      icon={<CircleAlert className="size-[18px]" aria-hidden />}
      iconTone="red"
      initialFocus={pid}
    >
      {children}
      <form
        className="col"
        style={{ gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          void go();
        }}
      >
        <div className="field">
          <label className="label" htmlFor={pid}>
            Your password
          </label>
          <PasswordInput id={pid} invalid={!!pwErr} value={pw} autoComplete="current-password" placeholder="Type your password to confirm" onChange={(e) => (setPw(e.target.value), setPwErr(null))} />
          {pwErr ? <FieldError id={`${pid}-e`}>{pwErr}</FieldError> : passwordHint ? <span className="hint">{passwordHint}</span> : null}
        </div>
        {err && <ServerErrorBanner title="Couldn't finish" detail={err} />}
        <div className="ft" style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          {secondary}
          <button type="submit" className="btn btn-sm k-danger" disabled={busy}>
            {busy ? "Checking…" : confirmLabel}
          </button>
        </div>
      </form>
      {footnote && (
        <span className="xs muted" style={{ borderTop: "1px solid var(--line-2)", paddingTop: 10 }}>
          {footnote}
        </span>
      )}
    </KitDialog>
  );
}

export function TypedConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  word,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** what to type (lower case) */
  word: string;
  confirmLabel: string;
  onConfirm: () => unknown | Promise<unknown>;
}) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    if (open) setV("");
  }, [open]);
  return (
    <KitDialog
      open={open}
      onOpenChange={onOpenChange}
      alert
      busy={busy}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-sm k-danger"
            disabled={v.trim().toLowerCase() !== word.toLowerCase() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label" htmlFor={id}>
          Type <span className="mono" style={{ color: "var(--ink)" }}>{word}</span> to confirm
        </label>
        <input id={id} className="k-input mono" style={{ textTransform: "none" }} autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} />
      </div>
    </KitDialog>
  );
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  what,
  onDiscard,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** "You changed the question text and 2 options of QS_c865." */
  what?: ReactNode;
  onDiscard: () => void;
  /** omit when there's nothing to save from here */
  onSave?: () => void | Promise<void>;
}) {
  return (
    <KitDialog
      open={open}
      onOpenChange={onOpenChange}
      alert
      title="Leave without saving?"
      description={what}
      splitFooter
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-sm danger-hover" onClick={onDiscard}>
            Discard changes
          </button>
          <span className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenChange(false)}>
              Keep editing
            </button>
            {onSave && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void onSave()}>
                Save and leave
              </button>
            )}
          </span>
        </>
      }
    />
  );
}
