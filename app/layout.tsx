import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { safeJsonLd } from "@/lib/json-ld";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FloatingActions } from "@/components/FloatingActions";
import { CommandPalette } from "@/components/CommandPalette";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const { baseUrl } = siteConfig;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
    { media: "(prefers-color-scheme: light)", color: "#FAF8F4" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Kishore Kumar Sharma — Senior Full Stack Engineer",
    template: "%s · Kishore Kumar Sharma",
  },
  description:
    "I ship end-to-end. Six and a half years across telecom, fintech, govtech and edtech — designing schemas, writing services, and building the UIs that consume them. Backend-deep by training, full-stack by delivery.",
  keywords: [
    "Kishore Kumar Sharma",
    "Senior Full Stack Engineer",
    "Full Stack Engineer for hire",
    "End-to-end full stack developer",
    "MERN Stack engineer",
    "MEAN Stack engineer",
    "React Node.js engineer",
    "Angular Spring Boot developer",
    "Java Spring Boot engineer",
    "NodeJS NestJS engineer",
    "Microservices engineer",
    "Distributed systems engineer",
    "AWS Cloud engineer",
    "Scalable backend developer India",
    "Software Engineer Noida",
    "Tech Lead India",
    "AI-augmented developer",
    "Full stack architect",
  ],
  authors: [{ name: "Kishore Kumar Sharma", url: baseUrl }],
  creator: "Kishore Kumar Sharma",
  publisher: "Kishore Kumar Sharma",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
    types: {
      "application/rss+xml": [
        { url: `${baseUrl}/writing/rss.xml`, title: "Writing — Kishore Kumar Sharma" },
      ],
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: baseUrl,
    siteName: "Kishore Kumar Sharma",
    title: "Kishore Kumar Sharma — Senior Full Stack Engineer",
    description:
      "End to end. No handoffs. Six and a half years shipping across telecom, fintech, govtech and edtech — schema to surface, with measurable lift.",
    images: [
      {
        url: "/profile-picture.jpg",
        width: 1200,
        height: 630,
        alt: "Kishore Kumar Sharma — Senior Full Stack Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kishore Kumar Sharma — Senior Full Stack Engineer",
    description:
      "End to end. No handoffs. Enterprise integrations across four verticals — every system shipped with measurable lift.",
    images: ["/profile-picture.jpg"],
    creator: "@kishoresharma",
  },
  category: "technology",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const gaId = siteConfig.gaMeasurementId;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${baseUrl}/#person`,
    name: "Kishore Kumar Sharma",
    givenName: "Kishore",
    familyName: "Sharma",
    jobTitle: "Senior Full Stack Engineer",
    url: baseUrl,
    image: `${baseUrl}/profile-picture.jpg`,
    email: "mailto:kishoresharma914@gmail.com",
    nationality: { "@type": "Country", name: "India" },
    knowsLanguage: ["English", "Hindi"],
    description:
      "Senior full-stack engineer who ships end-to-end across telecom, fintech, govtech and edtech. Backend-deep by training; full-stack by delivery.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Noida",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
    worksFor: {
      "@type": "Organization",
      name: "Tata Consultancy Services",
      url: "https://www.tcs.com",
    },
    alumniOf: [
      {
        "@type": "CollegeOrUniversity",
        name: "Manipal University Jaipur",
        url: "https://jaipur.manipal.edu",
      },
      {
        "@type": "CollegeOrUniversity",
        name: "Gauhati University",
        url: "https://gauhati.ac.in",
      },
    ],
    sameAs: [
      "https://www.linkedin.com/in/kishore-kumar-sharma/",
    ],
    knowsAbout: [
      "Full Stack Development",
      "End-to-end Feature Delivery",
      "Java",
      "Spring Boot",
      "Node.js",
      "NestJS",
      "React",
      "Angular",
      "React Native",
      "Microservices",
      "Distributed Systems",
      "AWS",
      "System Design",
      "API Architecture",
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        {process.env.NODE_ENV === "production" && gaId && (
          <>
            <script
              async
              nonce={nonce}
              suppressHydrationWarning
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <script
              nonce={nonce}
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)},{page_path:window.location.pathname});`,
              }}
            />
          </>
        )}
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem nonce={nonce}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-md focus:bg-foreground focus:text-background"
          >
            Skip to content
          </a>
          <Navigation />
          <main id="main">{children}</main>
          <Footer />
          <FloatingActions />
          <CommandPalette />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
