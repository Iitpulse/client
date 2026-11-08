/*
  History panel (batch 8, board Admin-HistoryPanel; owner 8 Nov: visible to every role that can open the item):
    GET /tests/admin/tests/:id/history?filter=all|questions|settings|publish&before=&limit=
    GET /tests/admin/questions/:id/history?filter=all|content|key|use&before=&limit=
  From the audit log; names, not IDs.
*/
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiError, m6Tests, unwrap } from "./client";

export type HistoryType = "test" | "question";
export interface HistoryItem {
  id: string;
  at: string;
  action: string;
  category: string;
  summary: string;
  actor: { type: string; id: string | null; name: string | null; role: string | null };
  ai: boolean;
  via: { type: string | null; id: string | null } | null;
  diff: Record<string, { from?: unknown; to?: unknown } | unknown> | null;
  metadata: Record<string, unknown>;
}
export interface HistoryResponse {
  now: string;
  type: HistoryType;
  id: string;
  filter: string;
  counts: Record<string, number>;
  items: HistoryItem[];
  nextBefore: string | null;
}

export function useItemHistory(type: HistoryType, id: string | null | undefined, filter: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["m6", "history", type, id, filter],
    enabled: enabled && !!id,
    initialPageParam: null as string | null,
    getNextPageParam: (last: HistoryResponse) => last.nextBefore,
    retry: (n, e) => n < 1 && ![403, 404].includes(apiError(e).status ?? 0),
    queryFn: async ({ pageParam }) => {
      const path = type === "test" ? `/admin/tests/${encodeURIComponent(id!)}/history` : `/admin/questions/${encodeURIComponent(id!)}/history`;
      try {
        return unwrap<HistoryResponse>((await m6Tests.get(path, { params: { filter, limit: 20, ...(pageParam ? { before: pageParam } : {}) } })).data);
      } catch (e) {
        throw apiError(e);
      }
    },
  });
}
