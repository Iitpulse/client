"use client";

import { useParams } from "next/navigation";
import { TestBuilder } from "@/components/test-builder";

export default function EditTestPage() {
  const { testId } = useParams<{ testId: string }>();
  return <TestBuilder key={testId} testId={testId} />;
}
