import { cn } from '@/lib/utils/cn'
import { HTMLAttributes, forwardRef } from 'react'

interface BlockBidCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover'
}

const BlockBidCard = forwardRef<HTMLDivElement, BlockBidCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseClasses = 'rounded-[20px] bg-white shadow-sm border border-soft-sand/50 p-6'
    const hoverClasses = variant === 'hover' 
      ? 'hover:shadow-md hover:border-xp-sky-blue/30 transition-all duration-300' 
      : ''

    return (
      <div
        ref={ref}
        className={cn(baseClasses, hoverClasses, className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

BlockBidCard.displayName = 'BlockBidCard'

export { BlockBidCard }

