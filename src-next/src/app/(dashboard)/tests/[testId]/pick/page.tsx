"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { QuestionPicker } from "@/components/tests/question-picker";

/** Admin-QuestionPicker: /tests/[testId]/pick?sub=<subsectionId> (opened from the TestBuilder per sub-section). */
export default function PickQuestionsPage() {
  const { testId } = useParams<{ testId: string }>();
  return (
    <Suspense>
      <QuestionPicker key={testId} testId={testId} />
    </Suspense>
  );
}
