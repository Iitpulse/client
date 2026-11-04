"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { QuestionEditor } from "@/components/question-editor";

function EditQuestion() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  return <QuestionEditor key={id} mode="edit" id={id} typeParam={params.get("type")} />;
}

/** /questions/[id]/edit (?type optional: the kind is found from the ID): the shared question editor. */
export default function EditQuestionPage() {
  return (
    <Suspense>
      <EditQuestion />
    </Suspense>
  );
}
