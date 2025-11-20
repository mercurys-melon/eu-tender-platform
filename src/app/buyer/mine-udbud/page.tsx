export default function BuyerMyTenders() {
  const mockMyTenders = [
    { id: '1', title: 'IT-udstyr til kommunen', deadline: '2024-02-15', bidders: 5, status: 'Aktiv' },
    { id: '2', title: 'Rengøring af skoler', deadline: '2024-02-20', bidders: 3, status: 'Aktiv' },
    { id: '3', title: 'Gartnertjenester', deadline: '2024-02-25', bidders: 7, status: 'Aktiv' },
  ]

  return (
    <>
      <h1 className="text-h2 mb-4">Mine udbud</h1>
      
      <div className="space-y-4">
        {mockMyTenders.map((tender) => (
          <div key={tender.id} className="card p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-h4 mb-2">{tender.title}</h3>
                <div className="flex gap-4 text-sm text-granite-grey">
                  <span>Frist: {tender.deadline}</span>
                  <span>Budgivere: {tender.bidders}</span>
                  <span className="badge badge-primary">{tender.status}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
