import { redirect } from "next/navigation";

/* Old link: institutes now lives in Batches & setup (Admin-Setup board). */
export default function Page() {
  redirect("/setup?tab=centres&moved=1");
}
