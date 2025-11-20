import { ReactNode } from 'react'

interface TenderLayoutProps {
  children: ReactNode
}

export default function TenderLayout({ children }: TenderLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black">
      {children}
    </div>
  )
} 