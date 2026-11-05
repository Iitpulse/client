"use client";

import { useParams } from "next/navigation";
import { PatternEditor } from "@/components/m6/patterns/PatternEditor";

/** Read-only view of a pattern (row menu "Preview"; replaces the legacy preview route). */
export default function PatternViewPage() {
  const { patternId } = useParams<{ patternId: string }>();
  return <PatternEditor key={patternId} mode="view" patternId={patternId} />;
}
