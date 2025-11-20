import Link from 'next/link'

export default function BuyerHome() {
  return (
    <>
      <h1 className="text-h2 mb-4">Mit BlockBid (Ordregiver)</h1>
      <div className="flex gap-2 mb-6">
        <Link className="btn-outline" href="/buyer/mine-udbud">Mine udbud</Link>
        <Link className="btn-outline" href="/buyer/opret">Opret udbud</Link>
        <Link className="btn-outline" href="/buyer/afsluttede">Afsluttede udbud</Link>
        <Link className="btn-outline" href="/buyer/kontrakter">Igangværende kontrakter</Link>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-h4 mb-3">Aktive udbud</h3>
          <div className="space-y-2">
            <div className="text-sm text-granite-grey">IT-udstyr til kommunen</div>
            <div className="text-sm text-granite-grey">Rengøring af skoler</div>
            <div className="text-sm text-granite-grey">Gartnertjenester</div>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-h4 mb-3">Tildelinger</h3>
          <div className="space-y-2">
            <div className="text-sm text-granite-grey">Kantine drift - ABC Catering</div>
            <div className="text-sm text-granite-grey">IT-support - Tech Solutions</div>
            <div className="text-sm text-granite-grey">Rengøring - Clean Pro</div>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-h4 mb-3">Kontrakter - forfald</h3>
          <div className="space-y-2">
            <div className="text-sm text-granite-grey">IT-udstyr - 3 måneder</div>
            <div className="text-sm text-granite-grey">Rengøring - 6 måneder</div>
            <div className="text-sm text-granite-grey">Gartnertjenester - 12 måneder</div>
          </div>
        </div>
      </div>
    </>
  )
}
