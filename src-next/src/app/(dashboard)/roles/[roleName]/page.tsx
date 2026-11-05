import { redirect } from "next/navigation";

/** Old link (/roles/<id>): Roles & access with that role picked. */
export default async function RoleRedirect({ params }: { params: Promise<{ roleName: string }> }) {
  const { roleName } = await params;
  redirect(`/roles?role=${encodeURIComponent(decodeURIComponent(roleName))}`);
}
