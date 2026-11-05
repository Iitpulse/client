import { redirect } from "next/navigation";

/** The old Exam UI templates route: Admin-Templates lives at /templates (M6). */
export default function UiTemplatesRedirect() {
  redirect("/templates");
}
