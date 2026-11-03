// Fonts for the admin app, per @iitpulse/ui/fonts: next/font needs literal options here, the package fixes the
// CSS variable names that tokens.css reads. Tenants cannot change fonts. No handwriting font in admin (Kalam is
// student-only).
import { Geist, Geist_Mono, Noto_Sans_Devanagari, Source_Serif_4 } from "next/font/google";

export const sans = Geist({ subsets: ["latin"], variable: "--font-iitp-sans", display: "swap" });
export const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-iitp-mono", display: "swap" });
// Hindi: not preloaded; the unicode-range faces download only when Devanagari text appears.
export const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-iitp-devanagari",
  preload: false,
  display: "swap",
});
// Question stems on review and editor screens; not preloaded, downloads only where font-serif is used.
export const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-iitp-serif", preload: false, display: "swap" });
