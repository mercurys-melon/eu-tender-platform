export function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Find relevante udbud',
      description: 'Søg og filtrer udbud baseret på dine kriterier'
    },
    {
      number: '2',
      title: 'Analyser muligheder',
      description: 'Gennemse detaljer og vurder dine chancer'
    },
    {
      number: '3',
      title: 'Indsend bud',
      description: 'Brug vores platform til at indsende professionelle bud'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {steps.map((step, index) => (
        <div 
          key={step.number}
          className="text-center animate-fade-in-up"
          style={{ animationDelay: `${index * 0.2}s` }}
        >
          <div className="w-16 h-16 bg-emerald-green text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            {step.number}
          </div>
          <h3 className="text-h3 mb-4 text-white">{step.title}</h3>
          <p className="text-silver-mist">{step.description}</p>
        </div>
      ))}
    </div>
  )
}
