/*
  Admin-Calendar (M6): GET /tests/admin/calendar?from&to&batchIds&examId (IST days, ≤ 62 days) and
  POST /tests/admin/tests/:id/reschedule { opensAt, closesAt, confirm } (confirm=false answers the impact only).
  Sample-data fallback area "calendar": ./client.ts.
*/
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CalendarResponse, RescheduleRequest, RescheduleResponse } from "../m6-contract";
import { m6Call, m6Tests, source, unwrap } from "./client";
import { fixtureCalendar, fixtureReschedule, type CalendarParams } from "./fixtures/calendar";

export type { CalendarParams };

export function useCalendar(p: CalendarParams, enabled = true) {
  return useQuery({
    queryKey: ["m6", "calendar", p],
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    queryFn: () =>
      m6Call<CalendarResponse>(
        "calendar",
        async () =>
          unwrap<CalendarResponse>(
            (
              await m6Tests.get("/admin/calendar", {
                params: { from: p.from, to: p.to, ...(p.batchIds?.length ? { batchIds: p.batchIds.join(",") } : {}), ...(p.examId ? { examId: p.examId } : {}) },
              })
            ).data
          ),
        () => fixtureCalendar(p),
        true
      ),
  });
}

export function reschedule(testId: string, body: RescheduleRequest) {
  return m6Call<RescheduleResponse>(
    "calendar",
    async () => unwrap<RescheduleResponse>((await m6Tests.post(`/admin/tests/${encodeURIComponent(testId)}/reschedule`, body, source("Calendar"))).data),
    () => fixtureReschedule(testId, body)
  );
}
