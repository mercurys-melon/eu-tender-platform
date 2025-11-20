'use client'

import { useState } from 'react'
import { TenderCard } from '@/components/tender-card'
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Mock data for tenders
const mockTenders = [
  {
    id: '1',
    title: 'IT-system til offentlig forvaltning',
    description: 'Udvikling og implementering af nyt IT-system til kommunal forvaltning med fokus på digitalisering og effektivisering af administrative processer.',
    deadline: '2024-02-15',
    status: 'active' as const,
    category: 'IT & Teknologi',
    budget: '2.500.000 DKK'
  },
  {
    id: '2',
    title: 'Renovation og affaldshåndtering',
    description: 'Kommunal kontrakt for renovation og affaldshåndtering i perioden 2024-2027 med mulighed for forlængelse.',
    deadline: '2024-01-30',
    status: 'active' as const,
    category: 'Miljø & Infrastruktur',
    budget: '15.000.000 DKK'
  },
  {
    id: '3',
    title: 'Byggeri af nye skoler',
    description: 'Design og byggeri af tre nye folkeskoler i kommunen med moderne faciliteter og bæredygtige løsninger.',
    deadline: '2024-03-01',
    status: 'pending' as const,
    category: 'Byggeri & Anlæg',
    budget: '45.000.000 DKK'
  },
  {
    id: '4',
    title: 'Konsulentydelser til digital transformation',
    description: 'Søger erfaren konsulent til at støtte digital transformationsprojekter i kommunen.',
    deadline: '2024-02-28',
    status: 'active' as const,
    category: 'Konsulentydelser',
    budget: '800.000 DKK'
  },
  {
    id: '5',
    title: 'Vedligeholdelse af vejnet',
    description: 'Årlig vedligeholdelse af kommunens vejnet inklusive asfaltering og reparationer.',
    deadline: '2024-01-15',
    status: 'closed' as const,
    category: 'Infrastruktur',
    budget: '8.500.000 DKK'
  },
  {
    id: '6',
    title: 'Køb af elbiler til kommunen',
    description: 'Indkøb af 15 elbiler til kommunens flåde med tilhørende ladestandere.',
    deadline: '2024-03-15',
    status: 'active' as const,
    category: 'Transport & Mobilitet',
    budget: '3.200.000 DKK'
  },
  {
    id: '7',
    title: 'IT-support og vedligeholdelse',
    description: 'Årlig IT-support og vedligeholdelse af kommunens IT-infrastruktur.',
    deadline: '2024-04-01',
    status: 'active' as const,
    category: 'IT & Teknologi',
    budget: '1.800.000 DKK'
  },
  {
    id: '8',
    title: 'Renovering af bibliotek',
    description: 'Renovering og modernisering af hovedbiblioteket med nye faciliteter.',
    deadline: '2024-04-15',
    status: 'pending' as const,
    category: 'Byggeri & Anlæg',
    budget: '12.500.000 DKK'
  },
  {
    id: '9',
    title: 'Konsulentydelser til HR',
    description: 'HR-konsulent til at støtte medarbejderudvikling og organisationsudvikling.',
    deadline: '2024-05-01',
    status: 'active' as const,
    category: 'Konsulentydelser',
    budget: '650.000 DKK'
  },
  {
    id: '10',
    title: 'Vedligeholdelse af parker',
    description: 'Årlig vedligeholdelse af kommunens parker og grønne områder.',
    deadline: '2024-05-15',
    status: 'active' as const,
    category: 'Miljø & Infrastruktur',
    budget: '4.200.000 DKK'
  },
  {
    id: '11',
    title: 'Cyklesti netværk',
    description: 'Udvidelse af cyklesti netværket med nye stier og sikkerhedsforanstaltninger.',
    deadline: '2024-06-01',
    status: 'pending' as const,
    category: 'Infrastruktur',
    budget: '6.800.000 DKK'
  },
  {
    id: '12',
    title: 'Digital kommunikation',
    description: 'Implementering af nyt digitalt kommunikationssystem til borgere.',
    deadline: '2024-06-15',
    status: 'active' as const,
    category: 'IT & Teknologi',
    budget: '3.500.000 DKK'
  }
]

const categories = [
  'Alle kategorier',
  'IT & Teknologi',
  'Miljø & Infrastruktur',
  'Byggeri & Anlæg',
  'Konsulentydelser',
  'Infrastruktur',
  'Transport & Mobilitet'
]

const statuses = [
  'Alle status',
  'Aktiv',
  'Afventer',
  'Lukket'
]

export default function TendersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Alle kategorier')
  const [selectedStatus, setSelectedStatus] = useState('Alle status')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Filter tenders based on search and filters
  const filteredTenders = mockTenders.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tender.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'Alle kategorier' || tender.category === selectedCategory
    
    const matchesStatus = selectedStatus === 'Alle status' || 
                         (selectedStatus === 'Aktiv' && tender.status === 'active') ||
                         (selectedStatus === 'Afventer' && tender.status === 'pending') ||
                         (selectedStatus === 'Lukket' && tender.status === 'closed')
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredTenders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTenders = filteredTenders.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = (newValue: string, setter: (value: string) => void) => {
    setter(newValue)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="min-h-screen bg-arctic-white">
      {/* Breadcrumb */}
      <div className="bg-silver-mist/30 border-b border-silver-mist">
        <div className="container-blockbid py-4">
          <Breadcrumb 
            items={[
              { label: 'Forside', href: '/' },
              { label: 'Udbud', href: '/tenders' }
            ]} 
          />
        </div>
      </div>

      {/* Header */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="text-center mb-12">
            <h1 className="text-h1 mb-4">Aktuelle udbud</h1>
            <p className="text-white text-lg max-w-3xl mx-auto">
              Find og deltag i offentlige udbud på BlockBid platformen. 
              Alle udbud er gennemsigtige og følger dansk og EU lovgivning.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-silver-mist p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label htmlFor="search" className="label block mb-2">Søg i udbud</label>
                <div className="relative">
                  <input
                    id="search"
                    type="text"
                    placeholder="Søg efter titel eller beskrivelse..."
                    value={searchTerm}
                    onChange={(e) => handleFilterChange(e.target.value, setSearchTerm)}
                    className="input pl-10"
                  />
                  <svg className="w-5 h-5 text-slate-grey/60 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label htmlFor="category" className="label block mb-2">Kategori</label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => handleFilterChange(e.target.value, setSelectedCategory)}
                  className="input"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status" className="label block mb-2">Status</label>
                <select
                  id="status"
                  value={selectedStatus}
                  onChange={(e) => handleFilterChange(e.target.value, setSelectedStatus)}
                  className="input"
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-h3">Resultater ({filteredTenders.length} udbud)</h2>
              <div className="text-white/80 text-small">
                Sorteret efter deadline
              </div>
            </div>

            {currentTenders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentTenders.map((tender) => (
                  <TenderCard key={tender.id} tender={tender} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                  </svg>
                </div>
                <h3 className="text-h3 mb-2">Ingen udbud fundet</h3>
                <p className="text-white/80">
                  Prøv at ændre dine søgekriterier eller filtre.
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <nav className="flex items-center space-x-2">
                {/* Previous button */}
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-md ${
                    currentPage === 1 
                      ? 'btn-ghost opacity-50 cursor-not-allowed' 
                      : 'btn-ghost hover:bg-white/10'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-md ${
                      currentPage === page 
                        ? 'btn-primary' 
                        : 'btn-ghost hover:bg-white/10'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {/* Next button */}
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-md ${
                    currentPage === totalPages 
                      ? 'btn-ghost opacity-50 cursor-not-allowed' 
                      : 'btn-ghost hover:bg-white/10'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
