// /_kitchen-sink/kit: every admin kit component in its states, for screenshots against the Kit-* boards. Development only
// (".dev.tsx" is a page extension only under `next dev`; production builds have no such route).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KitSpecimen } from "./KitSpecimen";

export const metadata: Metadata = { title: "Kit · IITP Admin", robots: { index: false, follow: false } };

export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <KitSpecimen />
    </Suspense>
  );
}
