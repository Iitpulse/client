"use client";

import { useParams } from "next/navigation";
import { PatternEditor } from "@/components/m6/patterns/PatternEditor";

export default function EditPatternPage() {
  const { patternId } = useParams<{ patternId: string }>();
  return <PatternEditor key={patternId} mode="edit" patternId={patternId} />;
}
