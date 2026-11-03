// /_kitchen-sink: the Main and Motion boards rebuilt from @iitpulse/ui, plus the admin's restyled shadcn primitives.
// Development only. The ".dev.tsx" extension is a page extension only under `next dev` (next.config.js), so a
// production build has no such route (404); the NODE_ENV check below is a second guard.
//   /_kitchen-sink                  Main board (1440 wide, as on the canvas)
//   /_kitchen-sink?board=motion     Motion board (playable)
//   /_kitchen-sink?board=primitives the admin primitives on the admin surface
import type { Metadata } from "next";
import { Kalam } from "next/font/google";
import { notFound } from "next/navigation";
import { KitchenSink } from "./KitchenSink";
import "./kitchen-sink.css";

// The boards' handwriting; the admin app itself never loads Kalam (student only).
const hand = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-iitp-hand", display: "swap" });

export const metadata: Metadata = { title: "Kitchen sink · IITP Admin", robots: { index: false, follow: false } };

export default async function KitchenSinkPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { board } = await searchParams;
  return <KitchenSink board={board} fontClassName={hand.variable} />;
}
