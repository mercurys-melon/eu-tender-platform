import { cn } from '@/lib/utils/cn'
import { InputHTMLAttributes, forwardRef } from 'react'

interface BlockBidInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const BlockBidInput = forwardRef<HTMLInputElement, BlockBidInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label 
            className="block text-sm font-medium text-granite-grey"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-full border border-soft-sand px-4 py-2',
            'bg-white text-digital-navy placeholder-granite-grey',
            'focus:outline-none focus:ring-2 focus:ring-xp-sky-blue/50 focus:border-xp-sky-blue',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-sunset-orange focus:border-sunset-orange focus:ring-sunset-orange/20',
            className
          )}
          style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          {...props}
        />
        {error && (
          <p 
            className="text-sm text-sunset-orange"
            style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

BlockBidInput.displayName = 'BlockBidInput'

export { BlockBidInput }

