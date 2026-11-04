"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/** TanStack Query for the admin app (migrated pages read through it; the legacy pages still fetch in effects). */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
