import { redirect } from "next/navigation";

/* Old link: subjects now lives in Batches & setup (Admin-Setup board). */
export default function Page() {
  redirect("/setup?tab=subjects");
}
