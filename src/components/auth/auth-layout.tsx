import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-green-600 flex items-center justify-center p-4">
      {/* Minecraft-style background pattern */}
      <div className="absolute inset-0 opacity-10">
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
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
      
      {/* Decorative blocks */}
      <div className="absolute bottom-4 left-4 opacity-20">
        <div className="w-8 h-8 bg-green-700 border-2 border-green-800"></div>
      </div>
      <div className="absolute top-4 right-4 opacity-20">
        <div className="w-8 h-8 bg-green-700 border-2 border-green-800"></div>
      </div>
      <div className="absolute top-1/2 left-8 opacity-20">
        <div className="w-8 h-8 bg-green-700 border-2 border-green-800"></div>
      </div>
    </div>
  )
} 