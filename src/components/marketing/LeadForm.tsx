import Link from 'next/link'

export function LeadForm() {
  return (
    <div className="text-center">
      <div className="card max-w-2xl mx-auto animate-fade-in-up p-8">
        <h2 className="text-h2 mb-4">
          Kontakt os
        </h2>
        <p className="text-[var(--granite-grey)] mb-6">
          Få hjælp til at komme i gang med BlockBid
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/contact">
            <button className="btn-primary" aria-label="Kontakt BlockBid support">
              📞 Kontakt
            </button>
          </Link>
          <Link href="/demo">
            <button className="btn-outline" aria-label="Se BlockBid demo">
              🎯 Se Demo
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
