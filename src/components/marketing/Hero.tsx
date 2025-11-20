import Link from 'next/link'

export function Hero() {
  return (
    <div className="relative section-blockbid">
      <div className="container-blockbid">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-h1 lg:text-6xl font-poppins font-semibold mb-6 animate-fade-in-down">
            BlockBid
          </h1>
          <p className="text-2xl md:text-3xl mb-8 text-silver-mist animate-fade-in-up">
            Effektive digitale udbudsløsninger
          </p>
          <p className="text-lg mb-12 text-silver-mist max-w-3xl mx-auto animate-fade-in">
            Gennemsigtige og enkle for alle parter. BlockBid gør det nemt at deltage i og administrere offentlige udbud.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up">
            <Link href="/login">
              <button className="btn-primary" aria-label="Log ind på din BlockBid konto">
                🔑 Log Ind
              </button>
            </Link>
            <Link href="/register">
              <button className="btn-outline border-white text-white hover:bg-white hover:text-nordic-blue" aria-label="Opret en ny BlockBid konto">
                📝 Opret Konto
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
