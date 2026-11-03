"use client";

import { cn } from "@/lib/utils";
import { MainBoard } from "./MainBoard";
import { MotionBoard } from "./MotionBoard";
import { Primitives } from "./Primitives";

export function KitchenSink({ board, fontClassName }: { board?: string; fontClassName: string }) {
  return (
    <div className={cn("kitchen-sink", fontClassName)}>
      {board === "motion" ? <MotionBoard /> : board === "primitives" ? <Primitives /> : <MainBoard />}
    </div>
  );
}
