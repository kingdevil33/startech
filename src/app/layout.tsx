import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StarTech — Learn. Build. Launch.",
    template: "%s | StarTech",
  },
  description:
    "A cohort-based learning platform where students learn on a shared schedule with live sessions, async video lessons, peer reviews, and an AI study buddy.",
  keywords: [
    "learning platform",
    "cohort-based learning",
    "web development",
    "coding bootcamp",
    "online education",
    "StarTech",
  ],
  authors: [{ name: "StarTech" }],
  creator: "StarTech",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "StarTech",
    title: "StarTech — Learn. Build. Launch.",
    description:
      "A cohort-based learning platform where students learn on a shared schedule with live sessions, async video lessons, peer reviews, and an AI study buddy.",
  },
  twitter: {
    card: "summary_large_image",
    title: "StarTech — Learn. Build. Launch.",
    description:
      "A cohort-based learning platform with live sessions, video lessons, peer reviews, and an AI study buddy.",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "font-sans",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
