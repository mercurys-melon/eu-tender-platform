export function FAQ() {
  const faqs = [
    {
      question: 'Hvordan fungerer BlockBid?',
      answer: 'BlockBid er en platform der gør det nemt at finde, analysere og byde på offentlige udbud.'
    },
    {
      question: 'Er det gratis at bruge?',
      answer: 'Vi tilbyder en gratis prøveperiode på 14 dage, derefter kan du vælge mellem vores forskellige abonnementsplaner.'
    },
    {
      question: 'Hvilke typer udbud finder I?',
      answer: 'Vi dækker alle typer offentlige udbud, herunder EU-udbud, nationale udbud og kommunale udbud.'
    }
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {faqs.map((faq, index) => (
        <div key={index} className="card p-6">
          <h3 className="text-h3 mb-3">{faq.question}</h3>
                      <p className="text-[var(--granite-grey)]">{faq.answer}</p>
        </div>
      ))}
    </div>
  )
}
