import {
  LayoutDashboard,
  FileText,
  FileSearch,
  MessageSquare,
  Star,
  Settings,
  Search,
  Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

/** Ordregiver (buyer) navigation */
export const buyerNavItems: NavItem[] = [
  { label: 'Dashboard',          href: '/ordregiver',                    icon: LayoutDashboard },
  { label: 'Mine udbud',         href: '/ordregiver/mine-udbud',         icon: FileText        },
  { label: 'Skabeloner',         href: '/ordregiver/skabeloner',         icon: FileSearch      },
  { label: 'Spørgsmål & svar',   href: '/ordregiver/spoergsmaal-svar',   icon: MessageSquare   },
  { label: 'Evaluering',         href: '/ordregiver/evaluering',         icon: Star            },
  { label: 'Indstillinger',      href: '/ordregiver/indstillinger',      icon: Settings        },
]

/** Tilbudsgiver (supplier) navigation */
export const supplierNavItems: NavItem[] = [
  { label: 'Dashboard',          href: '/tilbudsgiver',                  icon: LayoutDashboard },
  { label: 'Søg udbud',          href: '/tilbudsgiver/soeg-udbud',       icon: Search          },
  { label: 'Mine tilbud',        href: '/tilbudsgiver/mine-tilbud',      icon: Send            },
  { label: 'Spørgsmål & svar',   href: '/tilbudsgiver/spoergsmaal-svar', icon: MessageSquare   },
  { label: 'Indstillinger',      href: '/tilbudsgiver/indstillinger',    icon: Settings        },
]
