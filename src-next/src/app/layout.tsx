import type { Metadata } from "next";
import { fontClassName } from "@iitpulse/ui/fonts";
import { devanagari, mono, sans, serif } from "./fonts";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { KitToaster } from "@/components/kit/Toast";
import { brandBootScript } from "@/lib/brand-shared";
import { BrandEffects } from "@/components/brand/brand-logo";

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
      <head>
        {/* M7b tenant theming before the first paint (lib/brand-shared.ts); nothing for IIT-PULSE's own hosts */}
        <script dangerouslySetInnerHTML={{ __html: brandBootScript() }} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
        <KitToaster />
        <BrandEffects />
      </body>
    </html>
  );
}
