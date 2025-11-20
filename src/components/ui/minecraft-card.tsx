import { cn } from '@/lib/utils/cn'
import { HTMLAttributes, forwardRef } from 'react'

interface MinecraftCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'brown' | 'green'
}

const MinecraftCard = forwardRef<HTMLDivElement, MinecraftCardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-gray-200 border-gray-400',
      brown: 'bg-amber-200 border-amber-400',
      green: 'bg-green-200 border-green-400'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'font-minecraft',
          'border-4',
          'border-b-8',
          'shadow-lg',
          'p-6',
          'rounded-none',
          'transition-all',
          'duration-200',
          'hover:shadow-xl',
          'hover:translate-y-[-2px]',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

MinecraftCard.displayName = 'MinecraftCard'

export { MinecraftCard } 