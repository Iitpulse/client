"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { QuestionEditor } from "@/components/question-editor";
import { isLibraryId } from "@/lib/m10-library";

function EditQuestion() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  // M10: library questions are read-only; the bank opens its preview with the edit-locked tip
  const locked = isLibraryId(decodeURIComponent(id));
  useEffect(() => {
    if (locked) router.replace(`/questions?source=library&q=${encodeURIComponent(decodeURIComponent(id))}&locked=1`);
  }, [locked, id, router]);
  if (locked) return null;
  return <QuestionEditor key={id} mode="edit" id={id} typeParam={params.get("type")} assist={params.get("assist")} />;
}

/** /questions/[id]/edit (?type optional: the kind is found from the ID): the shared question editor. LIB- ids go back to the bank. */
export default function EditQuestionPage() {
  return (
    <Suspense>
      <EditQuestion />
    </Suspense>
  );
}
