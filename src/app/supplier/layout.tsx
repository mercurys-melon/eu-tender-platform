export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-silver-mist/30">
      <main className="container-blockbid py-8">
        {children}
      </main>
    </div>
  )
}
