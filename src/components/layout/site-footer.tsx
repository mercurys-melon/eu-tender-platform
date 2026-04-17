export function SiteFooter() {
  return (
    <footer className="bg-nordic-blue text-white border-t border-nordic-blue/20">
      <div className="container-blockbid py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-emerald-green rounded-xl flex items-center justify-center relative">
                <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                  <span className="text-emerald-green font-poppins font-bold text-sm">M</span>
                </div>
                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-green rounded-sm" />
              </div>
              <span className="text-white font-poppins font-semibold text-lg tracking-wide">
                MERCURRY TENDER
              </span>
            </div>
            <p className="text-silver-mist mb-4">
              Effektive digitale udbudsløsninger – gennemsigtige og enkle for alle parter
            </p>
          </div>
          <div>
            <h4 className="text-h4 mb-4">Produkter</h4>
            <ul className="space-y-2">
              <li>
                <a href="/tenders" className="text-silver-mist hover:text-white transition-colors">
                  Udbud
                </a>
              </li>
              <li>
                <a href="/documents" className="text-silver-mist hover:text-white transition-colors">
                  Dokumenter
                </a>
              </li>
              <li>
                <a href="/qa" className="text-silver-mist hover:text-white transition-colors">
                  Spørgsmål &amp; Svar
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-h4 mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="/contact" className="text-silver-mist hover:text-white transition-colors">
                  Kontakt
                </a>
              </li>
              <li>
                <a href="/about" className="text-silver-mist hover:text-white transition-colors">
                  Om Mercurry Tender
                </a>
              </li>
              <li>
                <a href="/help" className="text-silver-mist hover:text-white transition-colors">
                  Hjælp
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-nordic-blue/20 mt-8 pt-8 text-center">
          <p className="text-silver-mist text-small">
            © {new Date().getFullYear()} Mercurry Tender. Alle rettigheder forbeholdes.
          </p>
        </div>
      </div>
    </footer>
  )
}
