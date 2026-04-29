'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { MobileSidebarTrigger, type SidebarProps } from './sidebar'
import { Wordmark } from '@/components/brand/wordmark'
import { switchActiveRole } from '@/app/(auth)/actions'

// Topbar receives the same user data as Sidebar so MobileSidebarTrigger gets
// correct props without an extra fetch.
type TopbarProps = SidebarProps

function getInitials(fullName: string | null, email: string | undefined): string {
  if (fullName) {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return (email?.[0] ?? 'U').toUpperCase()
}

export function Topbar({ activeRole, fullName, email }: TopbarProps) {
  const initials = getInitials(fullName, email)
  const currentRoleLabel = activeRole === 'buyer' ? 'Ordregiver' : 'Tilbudsgiver'
  const switchToLabel = activeRole === 'buyer' ? 'Tilbudsgiver' : 'Ordregiver'

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <MobileSidebarTrigger activeRole={activeRole} fullName={fullName} email={email} />
      <div className="lg:hidden">
        <Wordmark size="sm" />
      </div>

      <div className="hidden md:block flex-1 max-w-sm">
        <input
          type="search"
          placeholder="Søg..."
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Søg"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{currentRoleLabel}</span>
          <form action={switchActiveRole}>
            <Button variant="outline" size="sm" className="h-8 text-xs" type="submit">
              Skift til {switchToLabel}
            </Button>
          </form>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -right-0.5 -top-0.5 flex h-4 w-4 min-w-0 items-center justify-center rounded-full p-0 text-[10px]">
                  3
                </Badge>
                <span className="sr-only">Notifikationer</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifikationer</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
