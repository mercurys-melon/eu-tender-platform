import { Breadcrumb } from '@/components/ui/breadcrumb'

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-arctic-white">
      {/* Breadcrumb */}
      <div className="bg-silver-mist/30 border-b border-silver-mist">
        <div className="container-blockbid py-4">
          <Breadcrumb 
            items={[
              { label: 'Forside', href: '/' },
              { label: 'Dokumenter', href: '/documents' }
            ]} 
          />
        </div>
      </div>

      {/* Header */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="text-center mb-16">
            <h1 className="text-h1 mb-4">Dokumenter</h1>
            <p className="text-slate-grey text-lg max-w-3xl mx-auto">
              Upload, download og administrer dokumenter relateret til udbud og projekter. 
              Alle dokumenter er sikret og tilgængelige for relevante parter.
            </p>
          </div>
        </div>
      </section>

      {/* Documents Content */}
      <section className="section-blockbid">
        <div className="container-blockbid">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-silver-mist p-8 shadow-blockbid">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-h2">Mine dokumenter</h2>
                  <button className="btn-primary">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload dokument
                  </button>
                </div>

                {/* Document List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-silver-mist rounded-lg hover:bg-silver-mist/30 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-emerald-green/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-h4 font-medium">Udbudsspecifikation.pdf</h3>
                        <p className="text-slate-grey text-small">IT-system til offentlig forvaltning</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-grey text-small">2.3 MB</span>
                      <button className="btn-ghost p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-silver-mist rounded-lg hover:bg-silver-mist/30 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-deep-orange/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-deep-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-h4 font-medium">Budskema.xlsx</h3>
                        <p className="text-slate-grey text-small">Renovation og affaldshåndtering</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-grey text-small">1.8 MB</span>
                      <button className="btn-ghost p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-silver-mist rounded-lg hover:bg-silver-mist/30 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-nordic-blue/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-h4 font-medium">Teknisk_dokumentation.docx</h3>
                        <p className="text-slate-grey text-small">Byggeri af nye skoler</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-grey text-small">4.1 MB</span>
                      <button className="btn-ghost p-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload Area */}
                <div className="mt-8 p-8 border-2 border-dashed border-slate-grey rounded-lg text-center">
                  <svg className="w-12 h-12 text-slate-grey mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <h3 className="text-h4 mb-2">Træk og slip filer her</h3>
                  <p className="text-slate-grey mb-4">
                    eller klik for at vælge filer fra din computer
                  </p>
                  <button className="btn-outline">
                    Vælg filer
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-lg border border-silver-mist p-6 shadow-blockbid">
                <h3 className="text-h4 mb-4">Dokumentstatistik</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-grey">Totale dokumenter</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-grey">Samlet størrelse</span>
                    <span className="font-medium">156 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-grey">Seneste upload</span>
                    <span className="font-medium">I dag</span>
                  </div>
                </div>
              </div>

              {/* File Types */}
              <div className="bg-white rounded-lg border border-silver-mist p-6 shadow-blockbid">
                <h3 className="text-h4 mb-4">Filtyper</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-grey">PDF</span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-grey">Excel</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-grey">Word</span>
                    <span className="font-medium">4</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg border border-silver-mist p-6 shadow-blockbid">
                <h3 className="text-h4 mb-4">Seneste aktivitet</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-emerald-green rounded-full"></div>
                    <div>
                      <p className="text-small font-medium">Upload: Udbudsspecifikation.pdf</p>
                      <p className="text-slate-grey text-xs">I dag 14:30</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-deep-orange rounded-full"></div>
                    <div>
                      <p className="text-small font-medium">Download: Budskema.xlsx</p>
                      <p className="text-slate-grey text-xs">I går 16:45</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-nordic-blue rounded-full"></div>
                    <div>
                      <p className="text-small font-medium">Del: Teknisk_dokumentation.docx</p>
                      <p className="text-slate-grey text-xs">2 dage siden</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
