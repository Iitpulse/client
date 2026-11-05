/*
  Sample stream for the AI test builder (POST /ai/admin/tests/:id/build) while the ai route is not on the backend.
  Events as the contract: start → stage readingPattern → stage picking (n of m) → stage balancing → done.
  Outcome for screenshots and QA: localStorage "iitp.m6.aiBuild" =
    "" (built, every slot) | "short" (shortfall: one chapter has too few unused questions) | "paused" (503 AI_PAUSED) |
    "daily" (429 ADMIN_AI_DAILY_LIMIT) | "rate" (429 AI_RATE_LIMITED) | "running" (409 BUILD_RUNNING) |
    "changed" (409 PAPER_CHANGED) | "locked" (409 TEST_LOCKED) | "failed" (done with status failed, credits refunded).
  No model is called; nothing is billed.
*/
import type { TestBuild, TestBuildRequest, TestBuildStreamEvent } from "../../m6-contract";
import { fixtureError } from "../client";
import { fillByAi, paperState } from "./builder-paper";
import { sampleTests } from "./tests";

function outcome(): string {
  try {
    return localStorage.getItem("iitp.m6.aiBuild") ?? "";
  } catch {
    return "";
  }
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

let used = 3;

export async function sampleBuildStream(
  testId: string,
  req: TestBuildRequest,
  onEvent: (e: TestBuildStreamEvent) => void,
  signal?: AbortSignal
): Promise<"done" | "dropped"> {
  const o = outcome();
  if (o === "paused") throw fixtureError(503, "AI_PAUSED", "AI is paused for your institute.");
  if (o === "daily") throw fixtureError(429, "ADMIN_AI_DAILY_LIMIT", "Today's AI test builds are used up.", { resetsAt: null });
  if (o === "rate") throw fixtureError(429, "AI_RATE_LIMITED", "Too many AI requests just now. Try again in a minute.", { retryAfterSeconds: 60 });
  if (o === "running") throw fixtureError(409, "BUILD_RUNNING", "A build is already running for this test.", { buildId: "sample-build-running" });
  if (o === "changed") throw fixtureError(409, "PAPER_CHANGED", "The questions changed since you opened this page.", { revision: 0 });
  if (o === "locked") throw fixtureError(409, "TEST_LOCKED", "Students have started this test, so its questions can't change.");

  const t = (await sampleTests()).find((x) => x.testId === testId);
  if (!t) throw fixtureError(404, "TEST_NOT_FOUND", "This test was deleted or never existed.");
  const st = await paperState(t);
  const total = req.keepManual ? t.questions.needed - st.manual : t.questions.needed;
  const at = new Date().toISOString();
  const build: TestBuild = {
    id: `sample-build-${Date.now()}`,
    testId,
    status: "running",
    built: 0,
    total,
    keptManual: req.keepManual ? st.manual : 0,
    replaced: req.keepManual ? st.ai : st.ai + st.manual,
    shortfalls: [],
    previousRevision: null,
    error: null,
    credits: 50,
    modelId: null,
    createdAt: at,
  };
  used += 1;
  onEvent({ event: "start", data: { build, quota: { usedToday: used, perDay: 60, resetsAt: new Date(Date.now() + 8 * 3_600_000).toISOString() } } });
  await wait(600, signal);
  onEvent({ event: "stage", data: { stage: "readingPattern" } });
  await wait(700, signal);
  onEvent({ event: "stage", data: { stage: "picking", picked: Math.round(total / 2), total } });
  await wait(700, signal);
  onEvent({ event: "stage", data: { stage: "balancing" } });
  await wait(600, signal);

  if (o === "failed") {
    onEvent({ event: "done", data: { build: { ...build, status: "failed", credits: 0, error: { code: "AI_UNAVAILABLE", message: "The AI service didn't answer. No credits were used." } }, paper: null } });
    return "done";
  }
  const short = o === "short" ? 3 : 0;
  const result = await fillByAi(t, { keepManual: req.keepManual, short });
  onEvent({
    event: "done",
    data: {
      build: {
        ...build,
        status: "done",
        built: total - short,
        previousRevision: result.previousRevision,
        shortfalls: short ? [{ subsectionId: result.shortSubsectionId ?? "", chapter: result.shortChapter, wanted: 5, available: 2 }] : [],
      },
      paper: null,
    },
  });
  return "done";
}
