"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { TestBuilderPage } from "@/components/tests/builder/TestBuilderPage";

/**
 * Admin-TestBuilder for an existing test (draft, scheduled, live, ended). `?preview=student` (Tests row menu
 * "Preview as student") opens the student preview page: the boards have no builder preview view yet.
 */
function Edit() {
  const { testId } = useParams<{ testId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const preview = sp.get("preview") === "student";
  useEffect(() => {
    if (preview) router.replace(`/tests/${encodeURIComponent(testId)}/preview`);
  }, [preview, router, testId]);
  if (preview) return null;
  return <TestBuilderPage key={testId} testId={testId} />;
}

export default function EditTestPage() {
  return (
    <Suspense>
      <Edit />
    </Suspense>
  );
}
