'use client'

import { useState } from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Here you would typically send the form data to your backend
    console.log('Form submitted:', formData)
    
    setSubmitStatus('success')
    setIsSubmitting(false)
    
    // Reset form after success
    setTimeout(() => {
      setFormData({ name: '', email: '', company: '', subject: '', message: '' })
      setSubmitStatus('idle')
    }, 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-arctic-white">
      {/* Breadcrumb */}
      <div className="bg-silver-mist/30 border-b border-silver-mist">
        <div className="container-blockbid py-4">
          <Breadcrumb 
            items={[
              { label: 'Forside', href: '/' },
              { label: 'Kontakt', href: '/contact' }
            ]} 
          />
        </div>
      </div>

      {/* Header */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h1 className="text-h1 mb-4">Kontakt os</h1>
            <p className="text-slate-grey text-lg max-w-3xl mx-auto">
              Har du spørgsmål til BlockBid eller har brug for hjælp? 
              Vi er her for at hjælpe dig med at komme i gang.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-lg border border-silver-mist p-8 shadow-blockbid">
              <h2 className="text-h2 mb-6">Send os en besked</h2>
              
              {submitStatus === 'success' && (
                <div className="bg-emerald-green/10 border border-emerald-green/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-emerald-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-emerald-green font-medium">Tak for din besked! Vi vender tilbage hurtigst muligt.</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="label block mb-2">
                      Navn *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="input"
                      placeholder="Dit navn"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="label block mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="input"
                      placeholder="din@email.dk"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="label block mb-2">
                    Virksomhed
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="input"
                    placeholder="Din virksomhed"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="label block mb-2">
                    Emne *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="input"
                  >
                    <option value="">Vælg emne</option>
                    <option value="general">Generelle spørgsmål</option>
                    <option value="technical">Teknisk support</option>
                    <option value="sales">Salg og priser</option>
                    <option value="partnership">Partnerskab</option>
                    <option value="other">Andet</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="label block mb-2">
                    Besked *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="input resize-none"
                    placeholder="Skriv din besked her..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sender...
                    </div>
                  ) : (
                    'Send besked'
                  )}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-h2 mb-6">Kontaktoplysninger</h2>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-emerald-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-emerald-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-h4 mb-2">Adresse</h3>
                      <p className="text-slate-grey">
                        BlockBid A/S<br />
                        Nørregade 123<br />
                        1000 København K<br />
                        Danmark
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-deep-orange/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-deep-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-h4 mb-2">Telefon</h3>
                      <p className="text-slate-grey">
                        +45 70 12 34 56<br />
                        Mandag - Fredag: 9:00 - 17:00
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-nordic-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-h4 mb-2">Email</h3>
                      <p className="text-slate-grey">
                        info@blockbid.dk<br />
                        support@blockbid.dk
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Link */}
              <div className="bg-silver-mist/30 rounded-lg p-6">
                <h3 className="text-h3 mb-3">Ofte stillede spørgsmål</h3>
                <p className="text-slate-grey mb-4">
                  Find hurtige svar på de mest almindelige spørgsmål om BlockBid.
                </p>
                <a href="/faq" className="btn-outline">
                  Se FAQ
                </a>
              </div>

              {/* Office Hours */}
              <div className="bg-white rounded-lg border border-silver-mist p-6 shadow-blockbid">
                <h3 className="text-h3 mb-4">Åbningstider</h3>
                <div className="space-y-2 text-slate-grey">
                  <div className="flex justify-between">
                    <span>Mandag - Fredag</span>
                    <span>9:00 - 17:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weekend</span>
                    <span>Lukket</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Helligdage</span>
                    <span>Lukket</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-silver-mist">
                  <p className="text-slate-grey text-small">
                    For akutte spørgsmål kan du altid sende os en email, 
                    og vi vender tilbage hurtigst muligt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
