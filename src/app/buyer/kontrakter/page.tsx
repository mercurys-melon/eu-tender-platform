export default function BuyerContracts() {
  const mockContracts = [
    { id: '1', title: 'IT-udstyr til kommunen', supplier: 'Tech Solutions', startDate: '2024-01-01', endDate: '2024-04-01', value: '500.000 kr' },
    { id: '2', title: 'Rengøring af skoler', supplier: 'Clean Pro', startDate: '2024-01-15', endDate: '2024-07-15', value: '200.000 kr' },
    { id: '3', title: 'Gartnertjenester', supplier: 'Green Thumb', startDate: '2024-02-01', endDate: '2025-02-01', value: '150.000 kr' },
  ]

  return (
    <>
      <h1 className="text-h2 mb-4">Igangværende kontrakter</h1>
      
      <div className="space-y-4">
        {mockContracts.map((contract) => (
          <div key={contract.id} className="card p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-h4 mb-2">{contract.title}</h3>
                <div className="flex gap-4 text-sm text-granite-grey">
                  <span>Leverandør: {contract.supplier}</span>
                  <span>Start: {contract.startDate}</span>
                  <span>Slut: {contract.endDate}</span>
                  <span>Værdi: {contract.value}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
