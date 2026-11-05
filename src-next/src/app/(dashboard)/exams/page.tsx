import { redirect } from "next/navigation";

/* Old link: exams now lives in Batches & setup (Admin-Setup board). */
export default function Page() {
  redirect("/setup?tab=exams");
}
