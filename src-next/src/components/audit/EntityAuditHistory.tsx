"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  History,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  UserPlus,
  Trash2,
  RotateCcw,
  Edit,
  Users,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import api, { AuditLogEntry } from "@/lib/api";

interface EntityAuditHistoryProps {
  entityType: string;
  entityId: string;
  maxHeight?: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  RESTORE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  BULK_CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  BULK_DELETE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <UserPlus className="h-3 w-3" />,
  UPDATE: <Edit className="h-3 w-3" />,
  DELETE: <Trash2 className="h-3 w-3" />,
  RESTORE: <RotateCcw className="h-3 w-3" />,
  BULK_CREATE: <Users className="h-3 w-3" />,
  BULK_DELETE: <Layers className="h-3 w-3" />,
};

export function EntityAuditHistory({
  entityType,
  entityId,
  maxHeight = "400px",
}: EntityAuditHistoryProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchHistory = async (reset = false) => {
    setLoading(true);
    try {
      const currentPage = reset ? 1 : page;
      const response = await api.audit.getEntityHistory(entityType, entityId, {
        page: currentPage,
        limit: 10,
      });
      const newLogs = response.data.data;

      if (reset) {
        setLogs(newLogs);
        setPage(1);
      } else {
        setLogs((prev) => [...prev, ...newLogs]);
      }

      setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
    } catch (error) {
      console.error("Failed to fetch entity audit history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, [entityType, entityId]);

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (page > 1) {
      fetchHistory();
    }
  }, [page]);

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "MMM d, yyyy HH:mm");
    } catch {
      return timestamp;
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground text-sm">No history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Change History
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchHistory(true)}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <ScrollArea style={{ maxHeight }}>
        <div className="space-y-2">
          {logs.map((log) => (
            <Collapsible key={log._id}>
              <div
                className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  if (log.changes && log.changes.length > 0) {
                    toggleRowExpanded(log._id);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {log.changes && log.changes.length > 0 && (
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpanded(log._id);
                          }}
                        >
                          {expandedRows.has(log._id) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                    <Badge
                      variant="secondary"
                      className={`${ACTION_COLORS[log.action]} flex items-center gap-1 text-xs`}
                    >
                      {ACTION_ICONS[log.action]}
                      {log.action}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(log.timestamp)}
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">by </span>
                  <span className="font-medium">{log.userName || log.userId}</span>
                  <span className="text-muted-foreground"> ({log.userType})</span>
                  {log.changes && log.changes.length > 0 && (
                    <span className="text-muted-foreground ml-2">
                      - {log.changes.length} field(s) changed
                    </span>
                  )}
                </div>

                {log.changes && log.changes.length > 0 && expandedRows.has(log._id) && (
                  <CollapsibleContent>
                    <div className="mt-3 pt-3 border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs h-8">Field</TableHead>
                            <TableHead className="text-xs h-8">Old</TableHead>
                            <TableHead className="text-xs h-8">New</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {log.changes.map((change, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs py-2 font-medium">
                                {change.field}
                              </TableCell>
                              <TableCell className="text-xs py-2 font-mono text-red-600 dark:text-red-400 max-w-[120px] truncate">
                                {formatValue(change.oldValue)}
                              </TableCell>
                              <TableCell className="text-xs py-2 font-mono text-green-600 dark:text-green-400 max-w-[120px] truncate">
                                {formatValue(change.newValue)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          ))}
        </div>

        {hasMore && (
          <div className="text-center pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
