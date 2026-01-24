"use client";

import * as React from "react";
import {
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ImportType = "students" | "teachers" | "batches";

interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  isValid: boolean;
}

interface PreviewData {
  rows: ParsedRow[];
  validCount: number;
  invalidCount: number;
  totalCount: number;
  headers: string[];
}

interface ImportResult {
  created: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ImportType;
  onSuccess?: () => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  type,
  onSuccess,
}: BulkImportDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<PreviewData | null>(null);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const typeLabels: Record<ImportType, string> = {
    students: "Students",
    teachers: "Teachers",
    batches: "Batches",
  };

  const resetState = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.bulk.downloadTemplate(type);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError("Failed to download template");
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const isValid = validExtensions.some((ext) =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!isValid) {
      setError("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setPreviewData(null);
    setImportResult(null);
    setIsLoading(true);

    try {
      let response;
      if (type === "students") {
        response = await api.bulk.previewStudents(selectedFile);
      } else if (type === "teachers") {
        response = await api.bulk.previewTeachers(selectedFile);
      } else {
        response = await api.bulk.previewBatches(selectedFile);
      }

      setPreviewData(response.data.data);
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; error?: { message?: string } } };
      };
      setError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Failed to parse file"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setError(null);

    try {
      let response;
      if (type === "students") {
        response = await api.bulk.importStudents(file);
      } else if (type === "teachers") {
        response = await api.bulk.importTeachers(file);
      } else {
        response = await api.bulk.importBatches(file);
      }

      setImportResult(response.data.data);

      if (response.data.data.created > 0) {
        onSuccess?.();
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string; error?: { message?: string } } };
      };
      setError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Import failed"
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import {typeLabels[type]}</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import {type}. Download the template to
            see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Template download */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1">
              Need a template? Download one with the correct format.
            </span>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File upload area */}
          {!previewData && !importResult && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
              />

              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Parsing file...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm font-medium mb-1">
                    Drag and drop your file here, or{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports CSV, XLSX, and XLS files (max 10MB)
                  </p>
                </>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Preview table */}
          {previewData && !importResult && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{previewData.totalCount} rows</Badge>
                  <Badge variant="default" className="bg-green-500">
                    {previewData.validCount} valid
                  </Badge>
                  {previewData.invalidCount > 0 && (
                    <Badge variant="destructive">
                      {previewData.invalidCount} invalid
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                >
                  Change file
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead className="w-16">Status</TableHead>
                      {previewData.headers.slice(0, 5).map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                      {previewData.headers.length > 5 && (
                        <TableHead>...</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.rows.slice(0, 50).map((row) => (
                      <TableRow
                        key={row.rowNumber}
                        className={row.isValid ? "" : "bg-destructive/5"}
                      >
                        <TableCell className="font-mono text-xs">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-4 w-4 text-destructive" />
                              <span
                                className="text-xs text-destructive truncate max-w-[150px]"
                                title={row.errors.join(", ")}
                              >
                                {row.errors[0]}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        {previewData.headers.slice(0, 5).map((header) => {
                          const key = header.toLowerCase().replace(/\s+/g, "");
                          return (
                            <TableCell
                              key={header}
                              className="max-w-[150px] truncate"
                            >
                              {row.data[key] || "-"}
                            </TableCell>
                          );
                        })}
                        {previewData.headers.length > 5 && (
                          <TableCell className="text-muted-foreground">
                            ...
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.rows.length > 50 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    Showing first 50 rows of {previewData.rows.length}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                )}
                <div>
                  <p className="font-medium">Import Complete</p>
                  <p className="text-sm text-muted-foreground">
                    {importResult.created} {type} imported successfully.
                    {importResult.failed > 0 &&
                      ` ${importResult.failed} failed.`}
                  </p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <ScrollArea className="max-h-[200px] border rounded-lg">
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-medium text-destructive">
                      Failed rows:
                    </p>
                    {importResult.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-muted-foreground flex gap-2"
                      >
                        <span className="font-mono">Row {err.row}:</span>
                        <span>{err.error}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? "Close" : "Cancel"}
          </Button>
          {previewData && !importResult && (
            <Button
              onClick={handleImport}
              disabled={isImporting || previewData.validCount === 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${previewData.validCount} ${type}`
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
