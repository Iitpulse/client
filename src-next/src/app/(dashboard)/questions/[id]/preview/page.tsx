import { redirect } from "next/navigation";

/*
  G08: the legacy question preview is folded into the question bank's preview pane (board Admin-Questions), which
  renders every type (paragraph passages, matrix lists and key, KaTeX), holds the Proofread switch, and deletes with
  Undo instead of a password. Old links land on the bank searched by this question's id, so the pane opens on it.
*/
export default async function QuestionPreviewRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/questions?q=${encodeURIComponent(id)}`);
}
