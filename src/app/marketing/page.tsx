import { Section } from '@/components/marketing/Section'
import { SectionHeading } from '@/components/marketing/SectionHeading'
import { Hero } from '@/components/marketing/Hero'
import { Features } from '@/components/marketing/Features'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { SocialProof } from '@/components/marketing/SocialProof'
import { Integrations } from '@/components/marketing/Integrations'
import { PricingTeaser } from '@/components/marketing/PricingTeaser'
import { FAQ } from '@/components/marketing/FAQ'
import { Compliance } from '@/components/marketing/Compliance'
import { LeadForm } from '@/components/marketing/LeadForm'

export default function MarketingPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "BlockBid",
            "url": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "logo": `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/logo.png`,
            "description": "BlockBid hjælper virksomheder med at finde relevante udbud, overvåge nye muligheder og øge deres chancer for at vinde kontrakter.",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "DK"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer service",
              "email": "kontakt@blockbid.dk"
            },
            "sameAs": [
              "https://linkedin.com/company/blockbid",
              "https://twitter.com/blockbid"
            ]
          })
        }}
      />
      
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "BlockBid",
            "url": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "description": "Find og vind flere udbud hurtigere med BlockBid",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/search?q={search_term_string}`
              },
              "query-input": "required name=search_term_string"
            }
          })
        }}
      />

      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen">
        <Section id="hero" container={false}>
          <Hero />
        </Section>
        
        <Section id="funktioner">
          <SectionHeading 
            title="Alt du skal bruge til at vinde udbud"
            description="Find, evaluer og vind relevante udbud med vores komplette værktøjssæt"
          />
          <Features />
        </Section>
        
        <Section id="saadan" className="bg-gray-800/30">
          <SectionHeading 
            title="Sådan virker det"
            description="Tre simple trin til at finde og vinde udbud"
          />
          <HowItWorks />
        </Section>
        
        <Section id="kunder">
          <SectionHeading 
            title="Kunder der stoler på os"
            description="Se hvordan andre virksomheder bruger BlockBid"
          />
          <SocialProof />
        </Section>
        
        <Section id="integrationer" className="bg-gray-800/30">
          <SectionHeading 
            title="Integrationer"
            description="Forbind med dine eksisterende systemer"
          />
          <Integrations />
        </Section>
        
        <Section id="priser">
          <SectionHeading 
            title="Simple, transparente priser"
            description="Vælg den plan der passer til din virksomhed. Alle planer inkluderer 14 dages gratis prøveperiode."
          />
          <PricingTeaser />
        </Section>
        
        <Section id="faq" className="bg-gray-800/30">
          <SectionHeading 
            title="Ofte stillede spørgsmål"
            description="Find svar på de mest almindelige spørgsmål"
          />
          <FAQ />
        </Section>
        
        <Section id="compliance">
          <SectionHeading 
            title="Compliance & sikkerhed"
            description="Vi overholder alle krav til databeskyttelse og sikkerhed"
          />
          <Compliance />
        </Section>
        
        <Section id="kontakt">
          <SectionHeading 
            title="Kontakt os"
            description="Få hjælp til at komme i gang med BlockBid"
          />
          <LeadForm />
        </Section>
      </div>
    </>
  )
}
