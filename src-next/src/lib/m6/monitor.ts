/*
  Live Monitor (Admin-Monitor board; contract m6-api.md "Live Monitor and extra time"):
    GET  /tests/admin/tests/:id/monitor?filter=&q=&batchId=&page=&pageSize=   [READ_TEST], polled every 15 s
    GET  /tests/admin/tests/:id/monitor/students/:sid                          [READ_TEST]
    POST /tests/admin/tests/:id/monitor/students/:sid/extra-time {minutes, reason}  [UPDATE_TEST]; reason required
    GET  /tests/admin/tests/:id/monitor.csv
  "Copy their sign-in link" reads GET /users/admin/test-links?testId&batchId (the student's row).
  Sample data (area "monitor") while the routes are not on the backend: ./fixtures/monitor.ts.
*/
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MONITOR_POLL_SECONDS,
  type ExtraTimeRequest,
  type ExtraTimeResponse,
  type MonitorResponse,
  type MonitorStatus,
  type MonitorStudentDetail,
  type TestLinksResponse,
} from "../m6-contract";
import { m6Call, m6Tests, m6Users, scenario, source, unwrap } from "./client";
import { fixtureExtraTime, fixtureMonitor, fixtureMonitorStudent, fixtureStudentLink } from "./fixtures/monitor";

/** Tile filters: a status, or "flagged" (fullscreen exits ≥ the flag line). */
export type MonitorFilter = "all" | MonitorStatus | "flagged";

export interface MonitorQuery {
  filter: MonitorFilter;
  q: string;
  batchId: string;
  page: number;
  pageSize: number;
}

const enc = encodeURIComponent;

export function useMonitor(testId: string, query: MonitorQuery) {
  return useQuery({
    queryKey: ["m6", "monitor", testId, query],
    enabled: !!testId,
    placeholderData: keepPreviousData,
    refetchInterval: MONITOR_POLL_SECONDS * 1000,
    refetchIntervalInBackground: false,
    retry: 1,
    queryFn: () => {
      const params = {
        filter: query.filter === "all" ? undefined : query.filter === "flagged" ? "exitsFlagged" : query.filter,
        q: query.q || undefined,
        batchId: query.batchId || undefined,
        page: query.page,
        pageSize: query.pageSize,
      };
      return m6Call<MonitorResponse>(
        "monitor",
        async () => unwrap<MonitorResponse>((await m6Tests.get(`/admin/tests/${enc(testId)}/monitor`, { params })).data),
        () => fixtureMonitor(testId, params, scenario() === "empty"),
        true
      );
    },
  });
}

export function useMonitorStudent(testId: string, studentId: string | null) {
  return useQuery({
    queryKey: ["m6", "monitor-student", testId, studentId],
    enabled: !!testId && !!studentId,
    refetchInterval: MONITOR_POLL_SECONDS * 1000,
    retry: 1,
    queryFn: () =>
      m6Call<MonitorStudentDetail>(
        "monitor",
        async () => unwrap<MonitorStudentDetail>((await m6Tests.get(`/admin/tests/${enc(testId)}/monitor/students/${enc(studentId!)}`)).data),
        () => fixtureMonitorStudent(testId, studentId!)
      ),
  });
}

export function useGiveExtraTime(testId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, body }: { studentId: string; body: ExtraTimeRequest }) =>
      m6Call<ExtraTimeResponse>(
        "monitor",
        async () =>
          unwrap<ExtraTimeResponse>(
            (await m6Tests.post(`/admin/tests/${enc(testId)}/monitor/students/${enc(studentId)}/extra-time`, body, source("Monitor · Give extra time"))).data
          ),
        () => fixtureExtraTime(testId, studentId, body)
      ),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["m6", "monitor", testId] });
      qc.invalidateQueries({ queryKey: ["m6", "monitor-student", testId, v.studentId] });
    },
  });
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET …/monitor.csv; sample mode builds the same columns from the rows. */
export async function fetchMonitorCsv(testId: string): Promise<string> {
  return m6Call<string>(
    "monitor",
    async () => {
      const r = await m6Tests.get(`/admin/tests/${enc(testId)}/monitor.csv`, { responseType: "text", transformResponse: (d) => d });
      return String(r.data);
    },
    async () => {
      const m = await fixtureMonitor(testId, { page: 1, pageSize: 1000 }, false);
      const head = ["Student", "Batch", "Phone", "Status", "Reason", "Started", "Answered", "Seconds left", "Fullscreen exits", "Last seen", "Extra minutes"];
      const lines = m.items.map((r) =>
        [r.student.name, r.student.batch?.name, r.student.phone, r.status, r.reason, r.startedAt, r.answered, r.secondsLeft, r.fullscreenExits, r.lastSeenAt, r.extraMinutes]
          .map(csvCell)
          .join(",")
      );
      return [head.join(","), ...lines].join("\n");
    }
  );
}

/** The student's sign-in link for this test (users test-links list of their batch). null when they have none. */
export async function fetchStudentLink(testId: string, batchId: string | null, studentId: string): Promise<string | null> {
  return m6Call<string | null>(
    "links",
    async () => {
      const d = unwrap<TestLinksResponse>((await m6Users.get("/admin/test-links", { params: { testId, batchId: batchId ?? undefined } })).data);
      return d.items.find((x) => x.student.id === studentId)?.url ?? null;
    },
    () => fixtureStudentLink(testId, studentId)
  );
}
