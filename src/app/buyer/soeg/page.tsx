import TenderSearch from '@/components/search/TenderSearch'

export default function BuyerSearchPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Søg udbud</h1>
        <p className="text-muted-foreground mt-2">
          Find relevante udbud fra udbud.dk og TED som ordregiver
        </p>
      </div>
      <TenderSearch />
    </div>
  )
}
