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
import { MobileSidebarTrigger } from './sidebar'
import { Wordmark } from '@/components/brand/wordmark'

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      {/* Mobil: hamburger + wordmark (skjult på desktop hvor sidebar viser wordmark) */}
      <MobileSidebarTrigger />
      <div className="lg:hidden">
        <Wordmark size="sm" />
      </div>

      {/* Søgefelt – skjult på mobil */}
      <div className="hidden md:block flex-1 max-w-sm">
        <input
          type="search"
          placeholder="Søg..."
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Søg"
        />
      </div>

      {/* Højre side */}
      <div className="ml-auto flex items-center gap-2">
        {/* Skift rolle – placeholder, vises kun hvis bruger har begge roller */}
        <Button variant="outline" size="sm" className="hidden md:flex h-8 text-xs">
          Skift rolle
        </Button>

        {/* Notifikationsklokke med badge */}
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

        {/* Avatar */}
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            MT
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
