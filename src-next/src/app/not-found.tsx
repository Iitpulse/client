/*
  Kit-States "Not found · 404" outside the admin frame (an address under the sign-in pages, or before a session):
  short and calm, with the way home. Inside the dashboard, (dashboard)/not-found.tsx keeps the sidebar.
*/
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="admin col min-h-screen items-center justify-center bg-ground p-6" data-testid="page-not-found">
      <section className="card">
        <div className="k-st-box">
          <span className="num" style={{ fontSize: 32, fontWeight: 650, color: "var(--navy-200)", letterSpacing: "-.02em" }}>
            404
          </span>
          <span className="h3">Page not found</span>
          <span className="sm muted">The link may be old or mistyped.</span>
          <Link href="/" className="btn btn-primary btn-sm">
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
