"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface UseUnsavedChangesOptions {
  isDirty: boolean;
  message?: string;
}

/**
 * Hook to warn users about unsaved changes before leaving a page.
 * Handles:
 * - Browser refresh/close (beforeunload)
 * - Browser back/forward navigation
 * - Next.js link navigation (via router events)
 */
export function useUnsavedChanges({
  isDirty,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UseUnsavedChangesOptions) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, message]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isDirty) {
        // Push state back to prevent navigation
        window.history.pushState(null, "", window.location.href);
        setShowDialog(true);
        setPendingNavigation("back");
      }
    };

    // Push initial state so we can detect back navigation
    if (isDirty) {
      window.history.pushState(null, "", window.location.href);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  // Confirm navigation
  const confirmNavigation = useCallback(() => {
    setShowDialog(false);
    if (pendingNavigation === "back") {
      // Actually go back now
      window.history.go(-2);
    } else if (pendingNavigation) {
      router.push(pendingNavigation);
    }
    setPendingNavigation(null);
  }, [pendingNavigation, router]);

  // Cancel navigation
  const cancelNavigation = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  // Programmatic navigation check
  const navigateWithCheck = useCallback(
    (href: string) => {
      if (isDirty) {
        setShowDialog(true);
        setPendingNavigation(href);
        return false;
      }
      router.push(href);
      return true;
    },
    [isDirty, router]
  );

  return {
    showDialog,
    confirmNavigation,
    cancelNavigation,
    navigateWithCheck,
    message,
  };
}
