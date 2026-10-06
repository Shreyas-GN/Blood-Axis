import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { LandingShell } from "@/components/landing/LandingShell";
import { Compatibility, Faq, FinalCta, HowItWorks, Problem, SiteFooter, WhoItsFor, Why } from "@/components/landing/Sections";
import { FAQS } from "@/components/landing/content";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description: SITE_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function Home() {
  return (
    <LandingShell footer={<SiteFooter />}>
      <JsonLd data={structuredData} />
      <Hero />
      <Problem />
      <HowItWorks />
      <Why />
      <WhoItsFor />
      <Compatibility />
      <Faq />
      <FinalCta />
    </LandingShell>
  );
}
