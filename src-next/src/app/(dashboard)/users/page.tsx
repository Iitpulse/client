import { Suspense } from "react";
import { UsersPage } from "@/components/people/users/UsersPage";

export default function Page() {
  return (
    <Suspense>
      <UsersPage />
    </Suspense>
  );
}
