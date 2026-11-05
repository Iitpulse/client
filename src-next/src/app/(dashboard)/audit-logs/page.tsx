"use client";
import { Suspense } from "react";
import { AuditPage } from "@/components/people/audit/AuditPage";

export default function Page() {
  return (
    <Suspense>
      <AuditPage />
    </Suspense>
  );
}
