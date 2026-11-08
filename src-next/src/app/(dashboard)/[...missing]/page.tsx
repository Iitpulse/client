import { notFound } from "next/navigation";

/*
  Kit-States "Not found · 404" inside the admin frame: an address no admin route matches lands here and renders
  (dashboard)/not-found.tsx, so the sidebar stays and people can leave (more specific routes always win).
*/
export default function MissingPage() {
  notFound();
}
