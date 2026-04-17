'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { buyerNavItems, supplierNavItems, type NavItem } from './nav-items'
import { Wordmark } from '@/components/brand/wordmark'
import { cn } from '@/lib/utils/cn'

// ---------------------------------------------------------------------------
// NavLink
// ---------------------------------------------------------------------------

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// SidebarNav – delt indhold brugt i desktop-sidebar og mobil-Sheet
// ---------------------------------------------------------------------------

function SidebarNav() {
  const pathname = usePathname()
  const isOrdregiver = pathname.startsWith('/ordregiver')
  const items = isOrdregiver ? buyerNavItems : supplierNavItems

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center border-b px-4">
        <Wordmark size="sm" />
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5"
        aria-label="Primær navigation"
      >
        {items.map((item) => {
          // Aktiv: eksakt match for root-ruter, prefix-match for underruter
          const isDashboardItem =
            item.href === '/ordregiver' || item.href === '/tilbudsgiver'
          const active = isDashboardItem
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return <NavLink key={item.href} item={item} active={active} />
        })}
      </nav>

      {/* Bundafsnit: avatar + bruger-dropdown */}
      <div className="shrink-0 border-t p-3">
        <Separator className="mb-3" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  MT
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-left">Bruger</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/profil" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/login"
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Log ud
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar – fast desktop-sidebar (lg+)
// ---------------------------------------------------------------------------

export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r bg-background">
      <SidebarNav />
    </aside>
  )
}

// ---------------------------------------------------------------------------
// MobileSidebarTrigger – bruges i Topbar til mobil-navigation
// ---------------------------------------------------------------------------

export function MobileSidebarTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Åbn navigationsmenu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SidebarNav />
      </SheetContent>
    </Sheet>
  )
}
