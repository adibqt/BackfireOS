import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Syne } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LanguageProvider } from "@/components/language-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Backfire OS — Adversarial Brand Simulation",
  description:
    "Penetration testing for marketing campaigns in emerging markets.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-foreground">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <LanguageProvider>{children}</LanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
