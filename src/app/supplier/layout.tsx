export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-xp-sky-blue/5">
      <main className="container-blockbid py-8">
        {children}
      </main>
    </div>
  )
}
