import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Performance Hero",
    template: "%s | Performance Hero",
  },
  description:
    "Professional performance and SEO audits for agencies and freelancers. Monitor your clients' sites. Generate impressive reports with AI-powered action plans.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  applicationName: "Performance Hero",
  keywords: [
    "web performance",
    "SEO audit",
    "Core Web Vitals",
    "PageSpeed",
    "Lighthouse",
    "performance monitoring",
    "site audit",
    "freelancer tools",
    "agency tools",
  ],
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any" },
    ],
    apple: [
      { url: "/favicon.png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "Performance Hero",
    description:
      "Professional performance and SEO audits for agencies and freelancers. Monitor your clients' sites. Generate impressive reports.",
    images: [{ url: "/hero-image.png", width: 1024, height: 1024, alt: "Performance Hero — Web Performance Auditing" }],
    type: "website",
    siteName: "Performance Hero",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary",
    title: "Performance Hero",
    description:
      "Professional performance and SEO audits. Monitor your clients' sites. Generate impressive reports.",
    images: [{ url: "/hero-image.png", alt: "Performance Hero — Web Performance Auditing" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
