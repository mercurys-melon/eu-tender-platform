import { cn } from '@/lib/utils/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface MinecraftButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const MinecraftButton = forwardRef<HTMLButtonElement, MinecraftButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseClasses = [
      'font-minecraft',
      'border-4',
      'border-b-8',
      'transition-all',
      'duration-100',
      'active:border-b-4',
      'active:translate-y-1',
      'hover:brightness-110',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'disabled:active:translate-y-0',
      'disabled:active:border-b-8'
    ]

    const variants = {
      primary: 'bg-green-600 border-green-700 text-white shadow-lg',
      secondary: 'bg-gray-600 border-gray-700 text-white shadow-lg',
      danger: 'bg-red-600 border-red-700 text-white shadow-lg'
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg'
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
        {...props}
      >
        {children}
      </button>
    )
  }
)

MinecraftButton.displayName = 'MinecraftButton'

export { MinecraftButton } 