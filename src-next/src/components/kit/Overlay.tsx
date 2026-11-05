"use client";
/*
  K06 Which surface (Kit-Overlays). Dialog: a short decision or up to 3 fields, centred, 440px (560 with a list).
  Drawer: create or edit one thing from a list (440px, header with title and close, body scrolls, footer pinned with
  Cancel and Save, "Unsaved" badge after the first change). No drop shadows: a scrim and a border lift them off.
  Focus goes to the first field (or the safe button in a confirm) and returns to the trigger on close. Esc and the
  scrim close it, unless there are unsaved changes: a drawer then replaces its footer with an inline confirm
  (never a dialog on a dialog). Phone (< 640px): both become bottom sheets.
*/
import { Dialog as D } from "radix-ui";
import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "./utils";

export interface KitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** leading tinted icon (confirmations) */
  icon?: ReactNode;
  iconTone?: "red" | "amber" | "navy" | "grey";
  /** md 440 · w500 500 · wide 560 (a list inside) */
  width?: "md" | "w500" | "wide";
  /** alertdialog for confirmations */
  alert?: boolean;
  /** show the × in the header (forms; confirmations use Cancel) */
  closeButton?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  /** footer with Discard on the left */
  splitFooter?: boolean;
  /** element id to focus first (defaults to the first focusable) */
  initialFocus?: string;
  /** block Esc / scrim while busy */
  busy?: boolean;
}

export function KitDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  iconTone = "red",
  width = "md",
  alert,
  closeButton,
  children,
  footer,
  splitFooter,
  initialFocus,
  busy,
}: KitDialogProps) {
  return (
    <D.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <D.Portal>
        <D.Overlay className="k-scrim" style={{ zIndex: 39 }} />
        <div className="k-dialog-wrap">
          <D.Content
            role={alert ? "alertdialog" : "dialog"}
            className={cx("k-dlg", width === "wide" && "wide", width === "w500" && "w500")}
            onOpenAutoFocus={(e) => {
              if (initialFocus) {
                const el = document.getElementById(initialFocus);
                if (el) {
                  e.preventDefault();
                  el.focus();
                }
              }
            }}
            aria-describedby={description ? undefined : undefined}
          >
            <div className="row" style={{ gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
              <div className="row" style={{ gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                {icon && <span className={cx("k-ic", iconTone)}>{icon}</span>}
                <div className="col" style={{ gap: 4, minWidth: 0 }}>
                  <D.Title className="h3">{title}</D.Title>
                  {description ? (
                    <D.Description asChild>
                      <div className="sm muted">{description}</div>
                    </D.Description>
                  ) : (
                    <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>
                  )}
                </div>
              </div>
              {closeButton && (
                <D.Close className="k-xbtn" aria-label="Close" disabled={busy}>
                  <X className="size-4" aria-hidden />
                </D.Close>
              )}
            </div>
            {children}
            {footer && <div className={cx("ft", splitFooter && "split")}>{footer}</div>}
          </D.Content>
        </div>
      </D.Portal>
    </D.Root>
  );
}

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** under the title (detail drawers: "Vijay Nagar centre · English") */
  subtitle?: ReactNode;
  /** leading node in the header (avatar) */
  leading?: ReactNode;
  /** right side of the header before × (Edit, ⋯) */
  headerActions?: ReactNode;
  /** unsaved changes: shows the "Unsaved" badge and asks before closing */
  dirty?: boolean;
  /** footer (Cancel + Save); pinned */
  footer?: ReactNode;
  /** content between the header and the body (action row, tabs) */
  belowHeader?: ReactNode;
  children: ReactNode;
  width?: "md" | "wide";
  "aria-label"?: string;
  busy?: boolean;
}

export function Drawer({ open, onOpenChange, title, subtitle, leading, headerActions, dirty, footer, belowHeader, children, width = "md", busy, ...rest }: DrawerProps) {
  const [asking, setAsking] = useState(false);
  const tryClose = () => {
    if (busy) return;
    if (dirty) setAsking(true);
    else onOpenChange(false);
  };
  return (
    <D.Root
      open={open}
      onOpenChange={(o) => {
        if (o) onOpenChange(true);
        else tryClose();
      }}
    >
      <D.Portal>
        <D.Overlay className="k-scrim" />
        <D.Content className={cx("k-drawer", width === "wide" && "wide")} aria-label={rest["aria-label"]} aria-describedby={undefined}>
          <div className="hd" style={subtitle || leading ? { alignItems: "flex-start" } : undefined}>
            <div className="row" style={{ gap: 12, minWidth: 0 }}>
              {leading}
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <div className="row" style={{ gap: 8, minWidth: 0 }}>
                  <D.Title className="h3 k-ell">{title}</D.Title>
                  {dirty && <span className="badge b-amber">Unsaved</span>}
                </div>
                {subtitle && <span className="xs muted">{subtitle}</span>}
              </div>
            </div>
            <div className="row" style={{ gap: 4 }}>
              {headerActions}
              <button type="button" className="k-xbtn" aria-label="Close" onClick={tryClose}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          {belowHeader}
          <div className="bd">{children}</div>
          {asking ? (
            <div className="fo confirm" role="alertdialog" aria-label="Leave without saving?">
              <span className="sm" style={{ fontWeight: 600, color: "#5C3600" }}>
                Leave without saving?
              </span>
              <span className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm danger-hover"
                  onClick={() => {
                    setAsking(false);
                    onOpenChange(false);
                  }}
                >
                  Discard changes
                </button>
                <button type="button" className="btn btn-secondary btn-sm" autoFocus onClick={() => setAsking(false)}>
                  Keep editing
                </button>
              </span>
            </div>
          ) : (
            footer && <div className="fo">{footer}</div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
