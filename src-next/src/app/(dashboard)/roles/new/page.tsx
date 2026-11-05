import { redirect } from "next/navigation";

/** Old link: the New role dialog opens on Roles & access. */
export default function NewRoleRedirect() {
  redirect("/roles?new=1");
}
