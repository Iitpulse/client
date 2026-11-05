/* Users area helpers: tab ↔ type, labels, pronouns, removed-student detection. */
import type { UserDetail, UserListItem, UserType } from "@/lib/m6-contract";
import { REMOVED_STUDENT_NAME } from "@/lib/m6-contract";

export const TABS: Array<{ type: UserType; label: string; noun: string; col: string }> = [
  { type: "student", label: "Students", noun: "student", col: "Student" },
  { type: "teacher", label: "Teachers", noun: "teacher", col: "Teacher" },
  { type: "admin", label: "Admins", noun: "admin", col: "Admin" },
  { type: "operator", label: "Operators", noun: "operator", col: "Operator" },
  { type: "manager", label: "Managers", noun: "manager", col: "Manager" },
];
export const tabOf = (t: string) => TABS.find((x) => x.type === t) ?? TABS[0]!;
export const isStaffType = (t: UserType) => t === "admin" || t === "operator" || t === "manager";

/** Anonymised people show as "Removed student" (contract) / "Removed teacher". */
export const isRemoved = (u: Pick<UserListItem, "name"> & { anonymisedAt?: string | null }) => !!u.anonymisedAt || /^Removed (student|teacher|person|staff)/i.test(u.name) || u.name === REMOVED_STUDENT_NAME;

export function pron(g: UserDetail["gender"] | undefined) {
  if (g === "Male") return { he: "he", his: "his", him: "him", He: "He", His: "His" };
  if (g === "Female") return { he: "she", his: "her", him: "her", He: "She", His: "Her" };
  return { he: "they", his: "their", him: "them", He: "They", His: "Their" };
}

/** "english" → "English" (the API stores medium lower-case). */
export const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s ?? null);
