"use client";
import { Suspense } from "react";
import { MessagesPage } from "@/components/sms/MessagesPage";

export default function Page() {
  return (
    <Suspense>
      <MessagesPage />
    </Suspense>
  );
}
