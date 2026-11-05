"use client";
/*
  K09 field states (Kit-Forms). Label above, help below; the error text replaces the help while it lasts.
  Optional fields say "(optional)", never an asterisk. Admin 36px; `size="lg"` = the student 44px.
*/
import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { AlertCircle, CircleAlert, Lock, WifiOff } from "lucide-react";
import { cx, fmtPhone, phoneDigits } from "./utils";

export type KitSize = "md" | "lg";

export interface FieldProps {
  label?: ReactNode;
  /** id of the control, for <label htmlFor> */
  htmlFor?: string;
  optional?: boolean;
  hint?: ReactNode;
  /** Error text (≤ 6 words, says what to do; may hold a link). Replaces the hint. */
  error?: ReactNode;
  /** Counter top-right of the label, only where there is a limit: red past the limit. */
  counter?: { value: number; max: number };
  /** Grey label (a disabled field) */
  dim?: boolean;
  className?: string;
  children: ReactNode;
  /** Render the label as a <span> (group of controls) instead of <label>. */
  group?: boolean;
}

export function Field({ label, htmlFor, optional, hint, error, counter, dim, className, children, group }: FieldProps) {
  const errId = htmlFor ? `${htmlFor}-e` : undefined;
  const L = group ? "span" : "label";
  const labelNode = label ? (
    <L className="label" {...(group ? {} : { htmlFor })} style={dim ? { color: "var(--muted)" } : undefined}>
      {label}
      {optional && <span className="k-opt"> (optional)</span>}
    </L>
  ) : null;
  return (
    <div className={cx("field", className)}>
      {counter ? (
        <div className="k-label-row">
          {labelNode}
          <span className={cx("k-count", counter.value > counter.max && "over")}>
            {counter.value} / {counter.max}
          </span>
        </div>
      ) : (
        labelNode
      )}
      {children}
      {error ? <FieldError id={errId}>{error}</FieldError> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} className="k-err" role="alert">
      <AlertCircle className="size-3.5" aria-hidden />
      {children}
    </span>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { invalid?: boolean; size?: KitSize; mono?: boolean };

/** The 36px text input (`size="lg"` 44px). `invalid` draws the red ring and sets aria-invalid. */
export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput({ invalid, size, mono, className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx("k-input", size === "lg" && "k-lg", mono && "mono", invalid && "e", className)}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && rest.id ? `${rest.id}-e` : rest["aria-describedby"]}
      {...rest}
    />
  );
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function TextArea(
  { invalid, className, ...rest },
  ref
) {
  return <textarea ref={ref} className={cx("k-input", invalid && "e", className)} aria-invalid={invalid || undefined} {...rest} />;
});

/** An input with a fixed prefix or suffix: "+91", "₹", "min", "students", signed marks (tone plus/minus). */
export const AffixInput = forwardRef<
  HTMLInputElement,
  InputProps & { prefix?: ReactNode; suffix?: ReactNode; tone?: "plus" | "minus"; width?: number | string }
>(function AffixInput({ prefix, suffix, tone, invalid, size, width, className, style, ...rest }, ref) {
  return (
    <div className={cx("k-affix", size === "lg" && "k-lg", invalid && "e", className)} style={{ width, ...style }}>
      {prefix != null && (
        <span className={cx("pre", tone)} aria-hidden={tone ? true : undefined}>
          {prefix}
        </span>
      )}
      <input ref={ref} aria-invalid={invalid || undefined} aria-describedby={invalid && rest.id ? `${rest.id}-e` : undefined} {...rest} />
      {suffix != null && <span className="suf">{suffix}</span>}
    </div>
  );
});

/**
 * Phone: fixed +91, shows "98260 12345", hands back the 10 digits. Validate with `isPhone`.
 */
export function PhoneInput({
  value,
  onChange,
  ...rest
}: Omit<InputProps, "value" | "onChange"> & { value: string; onChange: (digits: string) => void }) {
  return (
    <AffixInput
      prefix="+91"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="10-digit number"
      value={fmtPhone(value) === "—" ? "" : fmtPhone(value)}
      onChange={(e) => onChange(phoneDigits(e.target.value))}
      {...rest}
    />
  );
}
export const isPhone = (v: string | null | undefined) => /^[6-9]\d{9}$/.test(phoneDigits(v));

/** Password with a Show button. Passwords are 8+ characters everywhere. */
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput({ invalid, size, className, ...rest }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className={cx("k-affix", size === "lg" && "k-lg", invalid && "e", className)}>
      <input ref={ref} type={show ? "text" : "password"} aria-invalid={invalid || undefined} aria-describedby={invalid && rest.id ? `${rest.id}-e` : undefined} {...rest} />
      <button type="button" className="show" aria-pressed={show} aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
});
export const MIN_PASSWORD = 8;

/** Read-only value: grey box with a lock; the hint says who sets it ("Set by your institute"). */
export function ReadOnlyValue({ children, size, icon = true }: { children: ReactNode; size?: KitSize; icon?: boolean }) {
  return (
    <div className={cx("k-ro", size === "lg" && "k-lg")}>
      {icon && <Lock className="size-3.5" aria-hidden />}
      {children}
    </div>
  );
}

/**
 * Top error summary after a failed Save: "2 fields need a fix · Phone · Promo code". Takes focus when it appears;
 * each name jumps to its field (by id).
 */
export function ErrorSummary({ fields, title }: { fields: Array<{ id: string; label: string }>; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = fields.map((f) => f.id).join(",");
  useEffect(() => {
    if (fields.length) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!fields.length) return null;
  return (
    <div ref={ref} className="k-sum" role="alert" tabIndex={-1}>
      <CircleAlert className="size-4" aria-hidden />
      <span className="col" style={{ gap: 4 }}>
        <span className="sm" style={{ fontWeight: 600 }}>
          {title ?? (fields.length === 1 ? "1 field needs a fix" : `${fields.length} fields need a fix`)}
        </span>
        <span className="sm">
          {fields.map((f, i) => (
            <span key={f.id}>
              {i > 0 && " · "}
              <a
                href={`#${f.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(f.id);
                  el?.focus();
                  el?.scrollIntoView({ block: "center", behavior: "smooth" });
                }}
              >
                {f.label}
              </a>
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}

/** Server error banner (amber: nothing the person typed is wrong). Input is kept. */
export function ServerErrorBanner({
  title = "Couldn't save. The server didn't answer.",
  detail = "Your changes are still here.",
  onRetry,
  offline,
}: {
  title?: string;
  detail?: ReactNode;
  onRetry?: () => void;
  offline?: boolean;
}) {
  return (
    <div className="k-srv" role="alert">
      {offline ? <WifiOff className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}
      <span className="col grow" style={{ gap: 2 }}>
        <span className="sm" style={{ fontWeight: 600 }}>
          {title}
        </span>
        {detail && <span className="xs">{detail}</span>}
      </span>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** Checkbox (saved with the form). `mixed` = some of a group. */
export function Checkbox({
  checked,
  mixed,
  onChange,
  disabled,
  invalid,
  children,
  id,
  "aria-label": ariaLabel,
  className,
}: {
  checked: boolean;
  mixed?: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  children?: ReactNode;
  id?: string;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <label className={cx("k-check", disabled && "disabled", className)} onClick={(e) => e.stopPropagation()}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-checked={mixed ? "mixed" : checked}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <CheckBox on={checked} mixed={mixed} disabled={disabled} invalid={invalid} />
      {children}
    </label>
  );
}
/** The drawn box alone (for table headers and list rows that handle the click themselves). */
export function CheckBox({ on, mixed, disabled, invalid }: { on?: boolean; mixed?: boolean; disabled?: boolean; invalid?: boolean }) {
  return (
    <span className={cx("k-cbx", mixed ? "mixed" : on && "on", disabled && "dis", invalid && "e")} aria-hidden>
      {mixed ? (
        <i />
      ) : on ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : null}
    </span>
  );
}

/** Switch: takes effect at once (confirm with a "Saved" toast). */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  hint,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: ReactNode;
  hint?: ReactNode;
  id?: string;
}) {
  const lid = id ? `${id}-l` : undefined;
  return (
    <div className="row between" style={{ gap: 12 }}>
      <span className="col" style={{ gap: 2 }}>
        <span id={lid} className="sm" style={{ fontWeight: 600, color: disabled ? "var(--muted)" : undefined }}>
          {label}
        </span>
        {hint && <span className="xs muted">{hint}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={lid}
        disabled={disabled}
        className={cx("sw", checked ? "on" : "off")}
        style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

/** Radio cards: 2–5 options that each need a line of help. */
export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; title: ReactNode; help?: ReactNode }>;
}) {
  return (
    <div className="row wrap" style={{ gap: 10 }} role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className={cx("k-radio-card", value === o.value && "on")}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span className="col" style={{ gap: 2 }}>
            <span className="sm" style={{ fontWeight: 600 }}>
              {o.title}
            </span>
            {o.help && <span className="xs muted">{o.help}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
