"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QuestionEditor } from "@/components/question-editor";

function NewQuestion() {
  const params = useSearchParams();
  return <QuestionEditor key={params.get("from") ?? "new"} mode="create" typeParam={params.get("type")} fromId={params.get("from")} />;
}

/** /questions/new (?type=mcq|numerical|paragraph|matrix, ?from=<id> to duplicate): the shared question editor. */
export default function NewQuestionPage() {
  return (
    <Suspense>
      <NewQuestion />
    </Suspense>
  );
}
