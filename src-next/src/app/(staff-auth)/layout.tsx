"use client";
import { Blueboard, InkUnderline, LogoMark, Paper } from "@iitpulse/ui";
import { Check } from "lucide-react";
import "@/components/people/auth/auth.css";

/*
  Admin-Auth board: the staff console's sign-in shell. A blueboard on the left (logo, the pitch, "Student? Sign in at
  tests.iitpulse.in"), the calm paper on the right with the form. Login and reset-password live here; /signup only
  forwards to the student app's sign-up.
*/
const STUDENT_PORTAL = process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "https://tests.iitpulse.in";
const host = (() => {
  try {
    return new URL(STUDENT_PORTAL).host;
  } catch {
    return "tests.iitpulse.in";
  }
})();

export default function StaffAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Paper surface="admin" className="admin" style={{ minHeight: "100vh", display: "flex", flexWrap: "wrap", background: "var(--cl-paper)" }}>
      <Blueboard
        as="section"
        grain="calm"
        smudge={{ left: -80, top: 470, width: 420, height: 150 }}
        className="au-board"
        style={{ flex: "1 1 420px", maxWidth: 560, minHeight: "100vh", padding: 40, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 32 }}
      >
        <span style={{ background: "#fff", borderRadius: 10, padding: "8px 12px", display: "inline-flex", alignSelf: "flex-start" }}>
          <LogoMark />
        </span>
        <div className="col au-pitch" style={{ gap: 14 }}>
          <span className="eyebrow" style={{ color: "#C3C6EF" }}>
            Staff console
          </span>
          <h1 className="h1" style={{ color: "#fff", fontSize: 32, lineHeight: 1.3 }}>
            Build tests <InkUnderline tone="chalk">in minutes</InkUnderline>. See every student&rsquo;s gaps the moment results land.
          </h1>
          <div className="col sm" style={{ gap: 10, color: "#D6D8FA" }}>
            {["Import Word papers with AI parsing", "Describe a test, get a balanced draft", "Batch summaries written for teachers"].map((t) => (
              <span key={t} className="row" style={{ gap: 10 }}>
                <Check className="size-4" aria-hidden />
                {t}
              </span>
            ))}
          </div>
        </div>
        <a href={STUDENT_PORTAL} className="xs row au-stu" style={{ gap: 6, fontWeight: 600, alignSelf: "flex-start" }}>
          Student? Sign in at {host} →
        </a>
      </Blueboard>
      <section className="cl-paper cl-calm" style={{ flex: "1 1 480px", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div className="col" style={{ width: "100%", maxWidth: 420, gap: 22 }}>
          {children}
        </div>
      </section>
    </Paper>
  );
}
