import { cn } from '@/lib/utils/cn'

interface WordmarkProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Wordmark({ className, size = 'md' }: WordmarkProps) {
  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }[size]

  const iconSize = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Logo-ikon – placeholder SVG */}
      <div
        className={cn(
          'shrink-0 rounded-md bg-primary flex items-center justify-center',
          iconSize
        )}
        aria-hidden="true"
      >
        <svg
          width="60%"
          height="60%"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 13 L8 3 L14 13"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 9 L11 9"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Tekst-wordmark */}
      <span
        className={cn(
          'font-semibold leading-none tracking-tight text-foreground',
          textSize
        )}
      >
        Mercurry{' '}
        <span className="text-primary">Tender</span>
      </span>
    </div>
  )
}
