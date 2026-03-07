import { Breadcrumb } from '@/components/ui/breadcrumb'
import { FAQ } from '@/components/marketing/FAQ'
import { useTranslations } from '@/lib/i18n'

export const metadata = {
  title: 'Ofte stillede spørgsmål - BlockBid',
  description: 'Find svar på de mest almindelige spørgsmål om BlockBid platformen, udbudsprocessen og vores tjenester.',
}

export default function FAQPage() {
  const t = useTranslations('da')
  
  return (
    <div className="min-h-screen bg-arctic-white">
      {/* Breadcrumb */}
      <div className="bg-silver-mist/30 border-b border-silver-mist">
        <div className="container-blockbid py-4">
          <Breadcrumb 
            items={[
              { label: 'Forside', href: '/' },
              { label: 'FAQ', href: '/faq' }
            ]} 
          />
        </div>
      </div>

      {/* Header */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h1 className="text-h1 mb-4">{t.faq.title}</h1>
            <p className="text-slate-grey text-lg max-w-3xl mx-auto">
              {t.faq.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6">
              {/* Data Sources */}
              <div className="card p-6">
                <h3 className="text-h3 mb-3">{t.faq.items.dataSources.question}</h3>
                <p className="text-slate-grey">{t.faq.items.dataSources.answer}</p>
              </div>

              {/* Updates */}
              <div className="card p-6">
                <h3 className="text-h3 mb-3">{t.faq.items.updates.question}</h3>
                <p className="text-slate-grey">{t.faq.items.updates.answer}</p>
              </div>

              {/* Coverage */}
              <div className="card p-6">
                <h3 className="text-h3 mb-3">{t.faq.items.coverage.question}</h3>
                <p className="text-slate-grey">{t.faq.items.coverage.answer}</p>
              </div>

              {/* CPV Codes */}
              <div className="card p-6">
                <h3 className="text-h3 mb-3">{t.faq.items.cpvCodes.question}</h3>
                <p className="text-slate-grey">{t.faq.items.cpvCodes.answer}</p>
              </div>

              {/* Export */}
              <div className="card p-6">
                <h3 className="text-h3 mb-3">{t.faq.items.export.question}</h3>
                <p className="text-slate-grey">{t.faq.items.export.answer}</p>
              </div>

              {/* Monitoring */}
              <div className="card p-6">
                <h3 className="text-h3 mb-3">{t.faq.items.monitoring.question}</h3>
                <p className="text-slate-grey">{t.faq.items.monitoring.answer}</p>
              </div>

              {/* GDPR */}
              <div className="card p-6">
                <h3 className="text-h3 mb-3">{t.faq.items.gdpr.question}</h3>
                <p className="text-slate-grey">{t.faq.items.gdpr.answer}</p>
              </div>

              {/* Pricing */}
              <div className="card p-6">
                <h3 className="text-h3 mb-3">{t.faq.items.pricing.question}</h3>
                <p className="text-slate-grey">{t.faq.items.pricing.answer}</p>
              </div>
            </div>

            {/* CTA Section */}
            <div className="mt-16 text-center">
              <div className="bg-nordic-blue rounded-lg p-8 text-white">
                <h2 className="text-h2 mb-4">{t.faq.cta.title}</h2>
                <p className="text-silver-mist mb-6 max-w-2xl mx-auto">
                  {t.faq.cta.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="/contact" className="btn-primary bg-white text-nordic-blue hover:bg-silver-mist">
                    {t.faq.cta.primary}
                  </a>
                  <a href="/demo" className="btn-outline border-white text-white hover:bg-white hover:text-nordic-blue">
                    {t.faq.cta.secondary}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

