export default function SupplierCompleted() {
  const mockCompletedTenders = [
    { id: '1', title: 'Kantine drift', deadline: '2024-01-15', result: 'Ikke tildelt' },
    { id: '2', title: 'IT-support', deadline: '2024-01-10', result: 'Tildelt' },
    { id: '3', title: 'Rengøring kontor', deadline: '2024-01-05', result: 'Ikke tildelt' },
  ]

  return (
    <>
      <h1 className="text-h2 mb-4">Afsluttede udbud</h1>
      
      <div className="space-y-4">
        {mockCompletedTenders.map((tender) => (
          <div key={tender.id} className="card p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-h4 mb-2">{tender.title}</h3>
                <div className="flex gap-4 text-sm text-granite-grey">
                  <span>Frist: {tender.deadline}</span>
                  <span className={`badge ${tender.result === 'Tildelt' ? 'badge-primary' : 'badge-neutral'}`}>
                    {tender.result}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
