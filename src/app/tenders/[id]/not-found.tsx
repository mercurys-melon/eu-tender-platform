import Link from 'next/link'
import { MinecraftCard } from '@/components/ui/minecraft-card'
import { MinecraftButton } from '@/components/ui/minecraft-button'
import { NavBar } from '@/components/layout/nav-bar'

export default function NotFound() {
  return (
    <>
      <NavBar />
      
      {/* Minecraft-style background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(45deg, #000 25%, transparent 25%), 
            linear-gradient(-45deg, #000 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #000 75%), 
            linear-gradient(-45deg, transparent 75%, #000 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }} />
      </div>

      <div className="relative z-10 container mx-auto p-4 pt-8">
        <div className="max-w-md mx-auto">
          <MinecraftCard>
            <div className="text-center">
              <h1 className="font-minecraft text-4xl font-bold text-gray-800 mb-4">
                404
              </h1>
              <h2 className="font-minecraft text-2xl font-bold text-gray-800 mb-4">
                Udbud Ikke Fundet
              </h2>
              <p className="font-minecraft text-gray-600 mb-6">
                Det udbud du leder efter eksisterer ikke eller er blevet fjernet.
              </p>
              
              <div className="space-y-3">
                <Link href="/tenders">
                  <MinecraftButton className="w-full">
                    ← Tilbage til Udbud
                  </MinecraftButton>
                </Link>
                
                <Link href="/">
                  <MinecraftButton variant="secondary" className="w-full">
                    🏠 Gå til Hjem
                  </MinecraftButton>
                </Link>
              </div>
            </div>
          </MinecraftCard>
        </div>
      </div>

      {/* Decorative blocks */}
      <div className="absolute bottom-4 left-4 opacity-20">
        <div className="w-8 h-8 bg-gray-700 border-2 border-gray-800"></div>
      </div>
      <div className="absolute top-4 right-4 opacity-20">
        <div className="w-8 h-8 bg-gray-700 border-2 border-gray-800"></div>
      </div>
    </>
  )
} 