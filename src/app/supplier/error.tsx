'use client'

export default function SupplierError({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }
  reset: () => void 
}) {
  return (
    <div className="min-h-screen bg-silver-mist/30">
      <div className="container-blockbid py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-red-200 p-8 shadow-blockbid">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-h2 text-red-600 mb-4">Der opstod en fejl</h1>
              <p className="text-slate-grey mb-6">
                Der opstod en uventet fejl i leverandør-området. Prøv at genindlæse siden.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-sm text-red-700">
                  <strong>Fejl:</strong> {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-600 mt-2">
                    Fejl-ID: {error.digest}
                  </p>
                )}
              </div>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={reset}
                  className="btn-primary"
                >
                  Prøv igen
                </button>
                <a 
                  href="/supplier" 
                  className="btn-outline"
                >
                  Tilbage til oversigt
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
