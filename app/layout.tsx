import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { FloatingActions } from "@/components/FloatingActions";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: '--font-space-grotesk' });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: '--font-jetbrains-mono' });

const { baseUrl } = siteConfig;

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Kishore Kumar Sharma | Senior Full Stack Engineer",
    template: "%s | Kishore Kumar Sharma",
  },
  description:
    "Senior Full Stack Engineer with 6.5+ years of expertise in Java/Spring Boot, NodeJS, MEAN/MERN stack, AWS Cloud, and microservices architecture. Building scalable, production-grade software across Telecom, FinTech, GovTech, and EdTech domains.",
  keywords: [
    "Kishore Kumar Sharma",
    "Senior Full Stack Engineer",
    "Java Spring Boot",
    "NodeJS Developer",
    "React Developer",
    "Angular Developer",
    "MERN Stack",
    "MEAN Stack",
    "AWS Cloud",
    "Microservices",
    "NestJS",
    "Full Stack Portfolio",
    "Software Engineer India",
    "Noida Developer",
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
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: baseUrl,
    siteName: "Kishore Kumar Sharma — Portfolio",
    title: "Kishore Kumar Sharma | Senior Full Stack Engineer",
    description:
      "Senior Full Stack Engineer with 6.5+ years of expertise in Java/Spring Boot, NodeJS, MEAN/MERN, AWS, and microservices. Explore my work, certifications, and experience.",
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
    title: "Kishore Kumar Sharma | Senior Full Stack Engineer",
    description:
      "6.5+ years building scalable full-stack systems with Java, Node.js, React, Angular, and AWS. Browse my portfolio.",
    images: ["/profile-picture.jpg"],
    creator: "@kishoresharma",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Kishore Kumar Sharma",
    jobTitle: "Senior Full Stack Engineer",
    url: baseUrl,
    email: "kishoresharma914@gmail.com",
    image: `${baseUrl}/profile-picture.jpg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Noida",
      addressRegion: "Uttar Pradesh",
      addressCountry: "IN",
    },
    sameAs: [
      "https://www.linkedin.com/in/kishore-kumar-sharma-a8902917a/",
      "https://github.com/kishore-kumar-sharma",
    ],
    knowsAbout: [
      "Java", "Spring Boot", "NodeJS", "NestJS", "React", "Angular",
      "MERN Stack", "MEAN Stack", "AWS", "Microservices", "Docker", "Kubernetes",
    ],
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${jetbrainsMono.variable} ${spaceGrotesk.variable} font-mono bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Navigation />
          <main className="pt-20">
            {children}
          </main>
          <Footer />
          <FloatingActions />
        </ThemeProvider>
      </body>
    </html>
  );
}
