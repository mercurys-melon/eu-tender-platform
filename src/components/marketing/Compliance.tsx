export function Compliance() {
  const complianceItems = [
    { title: 'GDPR Compliant', icon: '🔒' },
    { title: 'ISO 27001', icon: '🛡️' },
    { title: 'EU Standards', icon: '🇪🇺' },
    { title: '24/7 Monitoring', icon: '📊' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {complianceItems.map((item) => (
        <div key={item.title} className="text-center">
          <div className="text-4xl mb-4">{item.icon}</div>
          <h4 className="text-h4 text-white">{item.title}</h4>
        </div>
      ))}
    </div>
  )
}
