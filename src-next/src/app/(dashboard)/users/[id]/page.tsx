import { redirect } from "next/navigation";

/** Old user page: the Users detail drawer replaces it. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/users?id=${encodeURIComponent(id)}`);
}
