import { redirect } from "next/navigation";

/** Old "Add user" page: the Users drawer replaces it. */
export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  redirect(`/users?add=${type === "teacher" ? "teacher" : type && type !== "student" ? "staff" : "student"}`);
}
