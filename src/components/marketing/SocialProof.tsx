export function SocialProof() {
  const stats = [
    { number: '100+', label: 'Aktive Udbud' },
    { number: '50+', label: 'Tilfredse Kunder' },
    { number: '24/7', label: 'Support' },
    { number: '99%', label: 'Uptime' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 text-center gap-8">
      {stats.map((stat, index) => (
        <div 
          key={stat.label}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="text-4xl font-poppins font-semibold text-white mb-2">{stat.number}</div>
          <div className="text-silver-mist">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
