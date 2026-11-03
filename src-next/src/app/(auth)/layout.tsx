import Link from "next/link";
import { Paper } from "@iitpulse/ui";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Admin surface (paper ground); data-legacy keeps the v3 look until Admin-Auth is redesigned (M6).
    <Paper surface="admin" data-legacy="" className="min-h-screen flex flex-col">
      {/* Header with logo */}
      <header className="flex items-center justify-center py-6 bg-white border-b">
        <Link href="/login">
          <img src="/logo.svg" alt="IIT Pulse" className="h-14 w-auto" />
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </Paper>
  );
}
