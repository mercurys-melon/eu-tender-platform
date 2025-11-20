interface SectionHeadingProps {
  title: string
  description?: string
  className?: string
}

export function SectionHeading({ title, description, className = '' }: SectionHeadingProps) {
  return (
    <div className={`text-center mb-16 ${className}`}>
      <h2 className="text-h2 mb-4 text-white">
        {title}
      </h2>
      {description && (
        <p className="text-xl text-silver-mist max-w-3xl mx-auto">
          {description}
        </p>
      )}
    </div>
  )
}
