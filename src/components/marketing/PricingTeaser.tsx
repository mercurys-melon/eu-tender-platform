import Link from 'next/link'

export function PricingTeaser() {
  return (
    <div className="text-center">
      <div className="card max-w-2xl mx-auto animate-fade-in-up p-8">
        <h2 className="text-h2 mb-4">
          Klar til at starte?
        </h2>
        <p className="text-[var(--granite-grey)] mb-6">
          Opret din konto i dag og begynd at bruge BlockBid til dine udbud
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <button className="btn-primary" aria-label="Kom i gang med BlockBid - opret konto">
              🚀 Kom i Gang
            </button>
          </Link>
          <Link href="/tenders">
            <button className="btn-outline" aria-label="Se alle aktive udbud">
              🔍 Se Udbud
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
