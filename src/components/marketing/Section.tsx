interface SectionProps {
  id?: string
  children: React.ReactNode
  className?: string
  container?: boolean
}

export function Section({ id, children, className = '', container = true }: SectionProps) {
  const Container = container ? 'div' : 'section'
  
  return (
    <section id={id} className={`section-blockbid ${className}`}>
      {container ? (
        <div className="container-blockbid">
          {children}
        </div>
      ) : (
        children
      )}
    </section>
  )
}
