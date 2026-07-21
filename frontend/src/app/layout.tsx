import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Space_Mono, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import { AuthProvider } from '@/context/AuthContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
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
    default: "BloodRelay | Emergency Blood Coordination Platform",
    template: "%s | BloodRelay"
  },
  description: "BloodRelay connects blood donors with families in urgent need within seconds. No delays, no middlemen—just direct, life-saving coordination.",
  keywords: ["blood donation", "emergency blood", "find blood donor", "blood bank", "emergency coordination", "donate blood"],
  authors: [{ name: "BloodRelay Team" }],
  metadataBase: new URL("https://bloodrelay.netlify.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "BloodRelay | Emergency Blood Coordination",
    description: "Bridging the gap between donors and those in need. Fast, trusted, and free.",
    url: "https://bloodrelay.netlify.app",
    siteName: "BloodRelay",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BloodRelay - Emergency Blood Coordination",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BloodRelay | Find Blood Donors Near You",
    description: "Connect with matching blood donors in seconds during emergencies.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EmergencyService",
  "name": "BloodRelay",
  "url": "https://bloodrelay.netlify.app",
  "logo": "https://bloodrelay.netlify.app/logo.png",
  "description": "Connecting blood donors with recipients in real-time emergency situations.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Bangalore",
    "addressCountry": "IN"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Emergency Blood Support",
    "url": "https://bloodrelay.netlify.app/emergency"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#0055FF',
          colorBackground: '#FCFCFB',
          colorText: '#18181B',
          colorDanger: '#DC2626',
          fontFamily: 'var(--font-inter), sans-serif',
          borderRadius: '6px'
        },
        elements: {
          card: 'shadow-none border border-[#E4E4E7]',
          formButtonPrimary: 'hover:scale-[1.01] transition-all',
          formFieldInput: 'border-[#E4E4E7] focus:border-[#0055FF] focus:ring-[#0055FF]'
        }
      }}
    >
      <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            suppressHydrationWarning
          />
        </head>
        <body className="antialiased">
          <AuthProvider>
            {children}
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
