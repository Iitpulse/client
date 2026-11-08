"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QuestionEditor } from "@/components/question-editor";
import { isLibraryId } from "@/lib/m10-library";

function NewQuestion() {
  const params = useSearchParams();
  const router = useRouter();
  const from = params.get("from");
  // M10: a library question is copied with its licence ("Copy to my bank"), never duplicated into a plain new one
  const locked = isLibraryId(from);
  useEffect(() => {
    if (locked && from) router.replace(`/questions?source=library&q=${encodeURIComponent(from)}&locked=1`);
  }, [locked, from, router]);
  if (locked) return null;
  return <QuestionEditor key={from ?? "new"} mode="create" typeParam={params.get("type")} fromId={from} />;
}

/** /questions/new (?type=mcq|numerical|paragraph|matrix, ?from=<id> to duplicate; not a LIB- id): the shared question editor. */
export default function NewQuestionPage() {
  return (
    <Suspense>
      <NewQuestion />
    </Suspense>
  );
}
