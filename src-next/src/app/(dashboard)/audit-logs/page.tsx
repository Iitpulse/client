"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  History,
  User,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileText,
  UserPlus,
  Trash2,
  RotateCcw,
  LogIn,
  LogOut,
  Edit,
  Users,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import api, { AuditLogEntry, AuditLogQueryParams } from "@/lib/api";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  RESTORE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  BULK_CREATE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  BULK_DELETE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  LOGIN: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  LOGOUT: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE: <UserPlus className="h-4 w-4" />,
  UPDATE: <Edit className="h-4 w-4" />,
  DELETE: <Trash2 className="h-4 w-4" />,
  RESTORE: <RotateCcw className="h-4 w-4" />,
  BULK_CREATE: <Users className="h-4 w-4" />,
  BULK_DELETE: <Layers className="h-4 w-4" />,
  LOGIN: <LogIn className="h-4 w-4" />,
  LOGOUT: <LogOut className="h-4 w-4" />,
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
  operator: "Operator",
  manager: "Manager",
  batch: "Batch",
  institute: "Institute",
  role: "Role",
  auth: "Authentication",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState<AuditLogQueryParams>({
    page: 1,
    limit: 20,
  });
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);

  // Detail dialog
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Expanded rows for changes
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.audit.query(filters);
      setLogs(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchMetadata = async () => {
    try {
      const [actionsRes, typesRes] = await Promise.all([
        api.audit.getActions(),
        api.audit.getEntityTypes(),
      ]);
      setActions(actionsRes.data.data);
      setEntityTypes(typesRes.data.data);
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key: keyof AuditLogQueryParams, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

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
      return format(new Date(timestamp), "MMM d, yyyy HH:mm:ss");
    } catch {
      return timestamp;
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">
            Track all changes and activities across the platform
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select
                value={filters.entityType || "all"}
                onValueChange={(v) => handleFilterChange("entityType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ENTITY_TYPE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={filters.action || "all"}
                onValueChange={(v) => handleFilterChange("action", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => handleFilterChange("startDate", e.target.value || undefined)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value || undefined)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Search by user ID..."
                value={filters.userId || ""}
                onChange={(e) => handleFilterChange("userId", e.target.value || undefined)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {logs.length} of {pagination.total} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No audit logs found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <>
              <Table containerClassName="max-h-[calc(100vh-450px)] min-h-[300px]">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <Collapsible key={log._id} asChild>
                      <>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            if (log.changes && log.changes.length > 0) {
                              toggleRowExpanded(log._id);
                            } else {
                              setSelectedLog(log);
                              setDetailOpen(true);
                            }
                          }}
                        >
                          <TableCell>
                            {log.changes && log.changes.length > 0 && (
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRowExpanded(log._id);
                                  }}
                                >
                                  {expandedRows.has(log._id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {formatTimestamp(log.timestamp)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`${ACTION_COLORS[log.action]} flex items-center gap-1 w-fit`}
                            >
                              {ACTION_ICONS[log.action]}
                              {log.action.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {ENTITY_TYPE_LABELS[log.entityType] || log.entityType}
                              </span>
                              {log.entityName && (
                                <span className="text-muted-foreground ml-2">
                                  ({log.entityName})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {log.entityId}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {log.userName || log.userId}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {log.userType}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.changes && log.changes.length > 0 ? (
                              <span className="text-sm text-muted-foreground">
                                {log.changes.length} field(s) changed
                              </span>
                            ) : log.ipAddress ? (
                              <span className="text-sm text-muted-foreground font-mono">
                                IP: {log.ipAddress}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                        {log.changes && log.changes.length > 0 && expandedRows.has(log._id) && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-muted/30 p-0">
                              <CollapsibleContent>
                                <div className="p-4">
                                  <h4 className="text-sm font-medium mb-3">Changes</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Field</TableHead>
                                        <TableHead>Old Value</TableHead>
                                        <TableHead>New Value</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {log.changes.map((change, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="font-medium">
                                            {change.field}
                                          </TableCell>
                                          <TableCell className="font-mono text-sm text-red-600 dark:text-red-400">
                                            {formatValue(change.oldValue)}
                                          </TableCell>
                                          <TableCell className="font-mono text-sm text-green-600 dark:text-green-400">
                                            {formatValue(change.newValue)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CollapsibleContent>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Full details of the audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <div>
                    <Badge className={ACTION_COLORS[selectedLog.action]}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <div>{formatTimestamp(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
                  <div>{ENTITY_TYPE_LABELS[selectedLog.entityType] || selectedLog.entityType}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity ID</label>
                  <div className="font-mono text-sm">{selectedLog.entityId}</div>
                </div>
                {selectedLog.entityName && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Entity Name</label>
                    <div>{selectedLog.entityName}</div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <div>{selectedLog.userName || selectedLog.userId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User Type</label>
                  <div>{selectedLog.userType}</div>
                </div>
                {selectedLog.ipAddress && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                    <div className="font-mono">{selectedLog.ipAddress}</div>
                  </div>
                )}
              </div>
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Metadata</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
