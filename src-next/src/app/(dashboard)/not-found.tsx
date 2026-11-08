"use client";

/*
  Kit-States "Not found · 404" (K13, admin column): short and calm, the way home and search (⌘K). The frame stays
  (this renders inside the dashboard layout); an old link to something deleted shows the same page.
*/
import { Topbar } from "@/components/admin/Topbar";
import { NotFoundState } from "@/components/kit";

export default function DashboardNotFound() {
  return (
    <>
      <Topbar title={" "} />
      <main className="col" style={{ padding: "22px 28px 40px" }} data-testid="page-not-found">
        <NotFoundState search />
      </main>
    </>
  );
}
