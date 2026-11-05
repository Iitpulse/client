import { Suspense } from "react";
import { ImportWizard } from "@/components/people/users/ImportWizard";

export default function Page() {
  return (
    <Suspense>
      <ImportWizard />
    </Suspense>
  );
}
