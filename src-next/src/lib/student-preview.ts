// "Preview as student" (batch 7, Admin-PreviewStudent): opens the student app's /preview/<testId> in a new tab, which
// shows the real NTA exam screen read-only. That tab asks this one for the staff token over postMessage; we answer
// only that window, only at the student app's origin, only for this test. The token never goes in a URL.
import { auth } from "./api";

const PORTAL = process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "http://localhost:3001";

export function openStudentPreview(testId: string): Window | null {
  const origin = new URL(PORTAL).origin;
  const win = window.open(`${origin}/preview/${encodeURIComponent(testId)}`, `iitp-preview-${testId}`);
  if (!win) return null;
  const onMessage = async (e: MessageEvent) => {
    if (e.origin !== origin || e.source !== win) return;
    const d = e.data as { type?: string; testId?: string } | null;
    if (d?.type !== "iitp-preview-ready" || d.testId !== testId) return;
    const token = await auth.ensureToken(); // a fresh 15-minute token; the preview asks again when it needs one
    if (token) win.postMessage({ type: "iitp-preview-token", testId, token }, origin);
  };
  window.addEventListener("message", onMessage);
  // Stop answering once the preview tab is closed
  const poll = window.setInterval(() => {
    if (win.closed) {
      window.removeEventListener("message", onMessage);
      window.clearInterval(poll);
    }
  }, 2000);
  return win;
}
