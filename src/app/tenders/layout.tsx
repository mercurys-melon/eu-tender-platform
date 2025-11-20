import { ReactNode } from 'react'

export default function TendersLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>
} 