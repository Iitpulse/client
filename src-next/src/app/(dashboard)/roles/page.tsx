"use client";
import { Suspense } from "react";
import { RolesPage } from "@/components/people/roles/RolesPage";

export default function Page() {
  return (
    <Suspense>
      <RolesPage />
    </Suspense>
  );
}
