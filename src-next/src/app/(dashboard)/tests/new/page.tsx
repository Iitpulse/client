"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TestBuilderPage } from "@/components/tests/builder/TestBuilderPage";

/** Admin-TestBuilder, new test (states new-empty and pattern-pick). `?examId=` preselects the exam. */
function NewTest() {
  const sp = useSearchParams();
  return <TestBuilderPage initialExamId={sp.get("examId") ?? undefined} />;
}

export default function NewTestPage() {
  return (
    <Suspense>
      <NewTest />
    </Suspense>
  );
}
