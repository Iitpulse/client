"use client";

/*
  Kit-States "Error · try again" when the root layout itself fails (nothing else can render): plain words, one
  button, a short support code. Replaces the root layout, so it brings its own <html>, <body> and styles.
*/
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const src = error.digest || error.message || "";
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) >>> 0;
  const code = `E-${(h % 0xffff).toString(16).toUpperCase().padStart(4, "0")}`;
  return (
    <html lang="en">
      <body>
        <main className="admin col min-h-screen items-center justify-center bg-ground p-6">
          <section className="card">
            <div className="k-st-box" role="alert">
              <span className="h3">Couldn&rsquo;t load this page</span>
              <span className="sm muted">Something went wrong on our side. Try again in a moment.</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
                Try again
              </button>
              <span className="xs muted mono">Code {code}</span>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
