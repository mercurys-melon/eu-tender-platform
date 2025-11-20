export function Integrations() {
  const integrations = [
    { name: 'Excel', icon: '📊' },
    { name: 'PDF', icon: '📄' },
    { name: 'API', icon: '🔌' },
    { name: 'Email', icon: '📧' }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {integrations.map((integration) => (
        <div key={integration.name} className="text-center">
          <div className="text-4xl mb-4">{integration.icon}</div>
          <h4 className="text-h4 text-white">{integration.name}</h4>
        </div>
      ))}
    </div>
  )
}
