import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/50">
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
    </div>
  );
}
