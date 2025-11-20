export default function SoegUdbudPage() {
  return (
    <>
      <h1 className="text-h2 mb-4">Søg udbud</h1>
      <div className="card p-6">
        <form className="grid md:grid-cols-3 gap-3">
          <input className="input" placeholder="Søg ord, CPV…" />
          <input className="input" placeholder="Region/land" />
          <button className="btn-primary">Søg</button>
        </form>
      </div>
    </>
  )
}
