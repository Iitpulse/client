import type { Metadata } from "next";
import { fontClassName } from "@iitpulse/ui/fonts";
import { devanagari, mono, sans, serif } from "./fonts";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "IITP Admin Dashboard",
  description: "Admin dashboard for IIT Pulse educational platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontClassName(sans, mono, devanagari, serif)} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
