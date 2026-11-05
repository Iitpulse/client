"use client";

import { useParams } from "next/navigation";
import { TestBuilderPage } from "@/components/tests/builder/TestBuilderPage";

/** Admin-TestBuilder for an existing test (draft, scheduled, live, ended). */
export default function EditTestPage() {
  const { testId } = useParams<{ testId: string }>();
  return <TestBuilderPage key={testId} testId={testId} />;
}
