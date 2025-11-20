import { cn } from '@/lib/utils/cn'
import { InputHTMLAttributes, forwardRef } from 'react'

interface MinecraftInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const MinecraftInput = forwardRef<HTMLInputElement, MinecraftInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block font-minecraft text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'font-minecraft',
            'w-full',
            'px-4',
            'py-3',
            'border-4',
            'border-gray-600',
            'bg-gray-100',
            'text-gray-900',
            'placeholder-gray-500',
            'focus:outline-none',
            'focus:border-green-600',
            'focus:ring-2',
            'focus:ring-green-200',
            'transition-all',
            'duration-200',
            'disabled:opacity-50',
            'disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
            className
          )}
          {...props}
        />
        {error && (
          <p className="font-minecraft text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

MinecraftInput.displayName = 'MinecraftInput'

export { MinecraftInput } 