"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  itemName?: string;
  onConfirm: () => Promise<void>;
  requirePassword?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  onConfirm,
  requirePassword = true,
}: DeleteConfirmationDialogProps) {
  const [password, setPassword] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClose = () => {
    setPassword("");
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setError(null);

    if (requirePassword) {
      if (!password) {
        setError("Please enter your password");
        return;
      }

      // Verify password first
      setIsVerifying(true);
      try {
        const response = await api.auth.verifyPassword(password);
        if (!response.data?.success) {
          setError("Invalid password");
          setIsVerifying(false);
          return;
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
        setError(error.response?.data?.error?.message || error.response?.data?.message || "Invalid password");
        setIsVerifying(false);
        return;
      }
      setIsVerifying(false);
    }

    // Proceed with deletion
    setIsDeleting(true);
    try {
      await onConfirm();
      handleClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      setError(error.response?.data?.error?.message || error.response?.data?.message || "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const isLoading = isVerifying || isDeleting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {itemName && (
              <span className="block mt-2 font-medium text-foreground">
                &quot;{itemName}&quot;
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {requirePassword && (
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                Enter your password to confirm
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDelete();
                  }
                }}
              />
            </div>
          </div>
        )}

        {!requirePassword && error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || (requirePassword && !password)}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isVerifying ? "Verifying..." : "Deleting..."}
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
