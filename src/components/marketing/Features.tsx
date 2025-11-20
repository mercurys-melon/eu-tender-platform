export function Features() {
  const features = [
    {
      icon: '⚒️',
      title: 'Opret Udbud',
      description: 'Opret nye udbud med vores professionelle formularer og intuitive interface'
    },
    {
      icon: '🔍',
      title: 'Se Aktive Udbud',
      description: 'Gennemse alle aktive udbud med detaljerede informationer og filtreringsmuligheder'
    },
    {
      icon: '💰',
      title: 'Indsend Bud',
      description: 'Budgiv på udbud med vores sikre platform og professionel håndtering'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {features.map((feature, index) => (
        <div 
          key={feature.title}
          className="card-hover p-6 text-center animate-fade-in-up"
          style={{ animationDelay: `${index * 0.2}s` }}
        >
          <div className="text-center">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-h3 mb-4">{feature.title}</h3>
            <p className="text-[var(--granite-grey)]">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
