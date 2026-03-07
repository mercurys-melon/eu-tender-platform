import { cn } from '@/lib/utils/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface BlockBidButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

const BlockBidButton = forwardRef<HTMLButtonElement, BlockBidButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center font-medium',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xp-sky-blue/50',
      'transition-all duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
    ]

    const variants = {
      primary: 'btn-primary',
      secondary: 'btn-primary', // Same as primary for now
      outline: 'btn-outline',
    }

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
        {...props}
      >
        {children}
      </button>
    )
  }
)

BlockBidButton.displayName = 'BlockBidButton'

export { BlockBidButton }

