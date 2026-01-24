"use client";

import * as React from "react";
import { Trash2, Download, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { cn } from "@/lib/utils";

export interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: string[]) => Promise<void> | void;
  variant?: "default" | "destructive";
  requiresConfirmation?: boolean;
}

interface BulkActionsToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onDelete?: (ids: string[]) => Promise<void>;
  onExport?: (ids: string[], format: "csv" | "xlsx") => Promise<void>;
  entityName?: string;
  customActions?: BulkAction[];
  className?: string;
}

export function BulkActionsToolbar({
  selectedIds,
  onClearSelection,
  onDelete,
  onExport,
  entityName = "items",
  customActions = [],
  className,
}: BulkActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(selectedIds);
      onClearSelection();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    if (!onExport) return;
    setIsExporting(true);
    try {
      await onExport(selectedIds, format);
    } finally {
      setIsExporting(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 p-2 bg-muted/50 rounded-lg border animate-in fade-in slide-in-from-top-2",
          className
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded">
            {selectedIds.length}
          </span>
          <span className="text-muted-foreground">selected</span>
        </div>

        <div className="h-4 w-px bg-border mx-2" />

        <div className="flex items-center gap-1">
          {/* Export dropdown */}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                  Export as Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Custom actions */}
          {customActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant === "destructive" ? "destructive" : "outline"}
              size="sm"
              onClick={() => action.onClick(selectedIds)}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}

          {/* Delete button */}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </Button>
          )}
        </div>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${selectedIds.length} ${entityName}`}
        description={`Are you sure you want to delete ${selectedIds.length} ${entityName}? This action cannot be undone.`}
        onConfirm={handleDelete}
        requirePassword={true}
      />
    </>
  );
}
