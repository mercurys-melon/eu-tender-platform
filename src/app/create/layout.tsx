import { ReactNode } from 'react'

interface CreateLayoutProps {
  children: ReactNode
}

export default function CreateLayout({ children }: CreateLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black">
      {children}
    </div>
  )
} 