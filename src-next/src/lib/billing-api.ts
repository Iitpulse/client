/*
  M9 institute billing (platform contract server/platform docs/m9-api.md "Institute billing"): /platform/admin/billing/*
  through the gateway, Owner only (403 OWNER_ONLY for anyone else; a support visit reads and gets 403 READ_ONLY on writes).
  Platform answers its fields at the top level (no { data } wrapper). Money is integer paise; prices are before GST and
  the API puts GST beside them.
*/
import axios from "axios";
import { API_GATEWAY } from "./ai-admin";
import { withSession } from "./auth-axios";

export type TaxMode = "intra" | "inter";
export interface Tax {
  mode: TaxMode;
  rateBp: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxPaise: number;
  totalPaise: number;
}
export interface Line {
  kind: string;
  description: string;
  sac?: string;
  quantity: number;
  unitPricePaise: number;
  amountPaise: number;
}
export type InvoiceDisplayStatus = "due" | "past_due" | "failed" | "paid" | "written_off" | "credited" | "credit_note";
export interface InvoiceSummary {
  id: string;
  number: string;
  kind: "subscription" | "topup" | "credit_note";
  status: "issued" | "paid" | "credited" | "written_off";
  displayStatus: InvoiceDisplayStatus;
  fy: string;
  issueDate: string;
  dueDate: string;
  periodMonth: string | null;
  periodLabel: string | null;
  tenant: { id: string; name: string };
  taxablePaise: number;
  taxPaise: number;
  totalPaise: number;
  amountPaidPaise: number;
  amountCreditedPaise: number;
  amountDuePaise: number;
  paidAt: string | null;
  paidVia: string | null;
  failedAt: string | null;
  againstInvoiceId: string | null;
}
export interface InvoiceDetail extends InvoiceSummary {
  lines: Array<Line & { position: number }>;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  taxMode: TaxMode;
  taxRatePercent: number;
  placeOfSupply: { code: string; name: string };
  amountInWords: string;
  placeholders: string[];
}
export type PaymentStatus = "created" | "attempted" | "authorized" | "captured" | "failed" | "refunded" | "cancelled" | "scheduled";
export interface Payment {
  id: string;
  kind: "topup" | "invoice" | "mandate" | "auto_topup" | "recurring" | string;
  status: PaymentStatus | string;
  amountPaise: number;
  invoiceId: string | null;
  issuedInvoiceId: string | null;
  topup: { credits: number; taxPaise: number; discountBp: number; taxablePaise: number; pricePer1000Paise: number } | null;
  recurring: boolean;
  method: string | null;
  error: { code: string; description: string | null } | null;
  chargeAfter: string | null;
  noticeSentAt: string | null;
  attempt: number;
  capturedAt: string | null;
  failedAt: string | null;
  createdAt: string;
}
export interface Checkout {
  provider: "razorpay";
  fake: boolean;
  keyId: string | null;
  orderId: string | null;
  amountPaise: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name?: string; email?: string };
  notes: Record<string, string>;
  recurring: boolean;
  customerId?: string | null;
}
export interface PastDue {
  invoiceId: string;
  invoiceNumber: string;
  amountDuePaise: number;
  dueDate: string;
  pastDueSince: string;
  suspendOn: string;
  failed: boolean;
  payUrl: string;
}
export interface BillingDetails {
  legalName: string | null;
  gstin: string | null;
  billingAddress: { line1?: string; city?: string; stateCode?: string; pincode?: string } | null;
  stateName: string | null;
  accountsEmail: string | null;
  placeOfSupply: string | null;
  taxMode?: TaxMode | null;
  registered?: boolean;
}
export interface Pack {
  credits: number;
  pricePaise: number | null;
  taxPaise: number | null;
  totalPaise: number | null;
  discountPercent: number;
}
export interface BillingOverview {
  internal: boolean;
  plan: {
    code: string;
    name: string;
    kind?: string;
    note?: string;
    version?: number;
    versionId?: string;
    pricePaise?: number | null;
    minBilledStudents?: number;
    committedSeats?: number;
    aiCreditsPerStudent?: number;
    topupPricePer1000Paise?: number | null;
    discountPercent?: number;
    trial?: { endsAt: string; active: boolean } | null;
    placeholder?: boolean;
    billingMode?: "invoice" | "mandate";
    next?: { version: number; pricePaise: number | null; aiCreditsPerStudent: number; effectiveMonth: string; noticeSentAt: string | null } | null;
    gstNote?: string;
  } | null;
  seats: { month: string; active: number | null; committed?: number; minimum?: number; extra?: number | null; extraPricePaise?: number | null; note?: string };
  credits: {
    month: string;
    included: number;
    used: number;
    balance: number;
    percentUsed: number | null;
    projectedUse: number;
    resetsOn: string;
    byFeature: Record<string, number>;
    lots: Array<{ id: string; kind: "plan" | "topup" | "grant"; total: number; remaining: number; expiresAt: string; note: string | null }>;
    overage: { mode: "pause" | "bill"; hardCapPaise: number | null; usedPaise: number; credits: number; capReached: boolean };
    paused: "credits" | "cap" | null;
  } | null;
  estimate: { month: string; estimate: true; lines: Line[]; tax: Tax | null; taxablePaise: number | null; totalPaise: number | null; invoiceDate: string; note: string } | null;
  topups?: { packs: Pack[]; validityMonths: number; pricePer1000Paise: number | null; gstNote: string };
  autoTopup?: { enabled: boolean; thresholdPercent: number; packCredits: number; maxPerMonth: number; available: boolean; thisMonth: number; thresholdCredits: number };
  mandate?: { status: "pending" | "active" | "cancelled" | "rejected"; method: string | null; last4: string | null; since: string | null } | null;
  billingDetails: BillingDetails;
  notices: { pastDue: PastDue | null; aiPaused: { reason: "credits" | "cap"; until: string } | null };
  invoices: InvoiceSummary[];
  recentPayments?: Payment[];
  payments: { mode: "live" | "fake" | null; keyId?: string | null };
}
export interface UsageReport {
  month: string;
  closed: boolean;
  report: {
    month: string;
    activeStudents: number | null;
    ai?: { byFeature: Record<string, { calls: number; credits: number; overageCredits: number; chargePaise: number }>; credits: number; overageCredits: number; overagePaise: number };
    plan?: { name: string; pricePaise: number | null; minBilledStudents: number; committedSeats: number; includedCredits: number };
    shadow?: { note: string; plan: { code: string; version: number; pricePaise: number; minBilledStudents: number }; lines: Line[]; billedStudents: number; tax: Tax };
    noInvoice?: string;
  } | null;
  invoiceId?: string | null;
  noInvoiceReason?: string | null;
  estimate?: { lines: Line[]; tax: Tax | null };
}
export interface Period {
  month: string;
  activeStudents: number | null;
  billedStudents: number | null;
  invoiceId: string | null;
  noInvoiceReason: string | null;
}
export interface Started {
  payment: Payment;
  checkout: Checkout;
  reused?: boolean;
  quote?: { credits: number; pricePaise: number; taxPaise: number; totalPaise: number; taxMode: TaxMode; validityMonths: number };
}
export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const http = axios.create({ baseURL: `${API_GATEWAY}/platform/admin/billing` });
withSession(http); // M7b auth v2 (lib/auth-axios.ts)

export const billingApi = {
  overview: () => http.get<BillingOverview>("").then((r) => r.data),
  invoices: (cursor?: string | null, status?: string) => http.get<{ invoices: InvoiceSummary[]; nextCursor: string | null }>("/invoices", { params: { cursor: cursor ?? undefined, status: status || undefined } }).then((r) => r.data),
  invoice: (id: string) => http.get<{ invoice: InvoiceDetail }>(`/invoices/${encodeURIComponent(id)}`).then((r) => r.data.invoice),
  pdf: (id: string) => http.get<Blob>(`/invoices/${encodeURIComponent(id)}/pdf`, { responseType: "blob" }).then((r) => r.data),
  saveDetails: (body: { legalName?: string | null; gstin?: string | null; billingAddress?: { line1?: string; stateCode: string; pincode?: string }; accountsEmail?: string | null }) =>
    http.put<{ billingDetails: BillingDetails }>("/details", body).then((r) => r.data.billingDetails),
  topup: (credits: number, idempotencyKey: string) => http.post<Started>("/topups", { credits }, { headers: { "Idempotency-Key": idempotencyKey } }).then((r) => r.data),
  payInvoice: (id: string) => http.post<Started>(`/invoices/${encodeURIComponent(id)}/pay`, {}).then((r) => r.data),
  mandate: () => http.post<Started>("/mandate", {}).then((r) => r.data),
  cancelMandate: () => http.delete<{ mandate: unknown }>("/mandate").then((r) => r.data),
  verify: (paymentId: string, r: RazorpayResponse) =>
    http
      .post<{ payment: Payment; creditsAdded: number | null; invoiceId: string | null }>(`/payments/${encodeURIComponent(paymentId)}/verify`, {
        razorpayOrderId: r.razorpay_order_id,
        razorpayPaymentId: r.razorpay_payment_id,
        razorpaySignature: r.razorpay_signature,
      })
      .then((x) => x.data),
  payment: (id: string) => http.get<{ payment: Payment }>(`/payments/${encodeURIComponent(id)}`).then((r) => r.data.payment),
  fakeCheckout: (paymentId: string, outcome: "success" | "failure" | "pending") =>
    http.post<{ response: RazorpayResponse | null; error: { code: string; description: string } | null }>(`/fake/checkout/${encodeURIComponent(paymentId)}`, { outcome }).then((r) => r.data),
  autoTopup: (body: { enabled: boolean; thresholdPercent: number; packCredits: number; maxPerMonth: number }) => http.put<{ autoTopup: typeof body }>("/auto-topup", body).then((r) => r.data.autoTopup),
  usage: (month?: string) => http.get<UsageReport>("/usage", { params: { month } }).then((r) => r.data),
  periods: () => http.get<{ periods: Period[] }>("/periods").then((r) => r.data.periods),
};

/* ───────────── formatting (board style: ₹1,42,887 whole rupees; ₹39.00 rates; Indian digit grouping) ───────────── */

/** "₹1,42,887" (rounded to the rupee for display; documents keep the paise) */
export const rupees = (paise: number | null | undefined) => (paise == null ? "—" : `₹${Math.round(paise / 100).toLocaleString("en-IN")}`);
/** "₹1,42,887.50" (exact, for invoice figures that carry paise) */
export const rupeesExact = (paise: number | null | undefined) =>
  paise == null ? "—" : `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
/** "₹0.90" per credit from a per-1,000 price */
export const perCredit = (per1000Paise: number | null | undefined) => (per1000Paise == null ? "—" : `₹${(per1000Paise / 100000).toFixed(2)}`);
export const nf = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-IN"));
/** "216k", "1.2M" (board meters) */
export function kfmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 1e4) return `${Math.round(n / 1e3)}k`;
  return n.toLocaleString("en-IN");
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "2026-11" → "November 2026" (`short`: "Nov 2026") */
export function monthLabel(ym: string | null | undefined, short = false): string {
  const m = /^(\d{4})-(\d{2})/.exec(ym ?? "");
  if (!m) return "—";
  const name = MONTHS[Number(m[2]) - 1]!;
  return `${short ? name.slice(0, 3) : name} ${m[1]}`;
}
export const monthName = (ym: string | null | undefined) => {
  const m = /^(\d{4})-(\d{2})/.exec(ym ?? "");
  return m ? MONTHS[Number(m[2]) - 1]! : "";
};
/** "2026-12-01" → "1 Dec" (IST calendar date) */
export function dayMonth(iso: string | null | undefined, weekday = false): string {
  if (!iso) return "—";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00+05:30`) : new Date(iso);
  return d.toLocaleDateString("en-IN", { ...(weekday ? { weekday: "short" } : {}), day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
/** GST label for a tax mode: "CGST 9% + SGST 9%" or "IGST 18%" */
export const gstLabel = (mode: TaxMode | null | undefined, rateBp = 1800) =>
  mode === "inter" ? `IGST ${rateBp / 100}%` : `CGST ${rateBp / 200}% + SGST ${rateBp / 200}%`;

/** AI feature keys (ai's runFeature names) → the board's "Where credits go" groups */
const FEATURE_GROUP: Record<string, string> = {
  review: "AI review",
  aiReview: "AI review",
  summary: "AI review",
  resultSummary: "AI review",
  doubt: "Doubt chat",
  doubtChat: "Doubt chat",
  studyPlan: "Study plans",
  study_plan: "Study plans",
};
export const featureGroup = (k: string) => FEATURE_GROUP[k] ?? "Admin tools";

/** GST state codes for the billing state field (a reference table; the field offers only the institute's own states) */
export const GST_STATE_CODES: Record<string, string> = {
  "Jammu and Kashmir": "01", "Himachal Pradesh": "02", Punjab: "03", Chandigarh: "04", Uttarakhand: "05", Haryana: "06", Delhi: "07", Rajasthan: "08",
  "Uttar Pradesh": "09", Bihar: "10", Sikkim: "11", "Arunachal Pradesh": "12", Nagaland: "13", Manipur: "14", Mizoram: "15", Tripura: "16",
  Meghalaya: "17", Assam: "18", "West Bengal": "19", Jharkhand: "20", Odisha: "21", Chhattisgarh: "22", "Madhya Pradesh": "23", Gujarat: "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26", Maharashtra: "27", Karnataka: "29", Goa: "30", Lakshadweep: "31", Kerala: "32", "Tamil Nadu": "33",
  Puducherry: "34", "Andaman and Nicobar Islands": "35", Telangana: "36", "Andhra Pradesh": "37", Ladakh: "38",
};
