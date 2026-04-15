// ── Shared layout ─────────────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1e3a5f;padding:24px 40px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">
                Mercurry Tender
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Denne email er sendt automatisk fra Mercurry Tender.<br />
                Svar ikke på denne email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#1e3a5f;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;font-weight:600;">${label}</a>`
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">${text}</h1>`
}

function body(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">${text}</p>`
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function tenderPublishedTemplate(tenderTitle: string, tenderUrl: string): { html: string; text: string } {
  const html = layout(`
    ${heading('Nyt udbud publiceret')}
    ${body(`Udbuddet <strong>${tenderTitle}</strong> er nu publiceret og synligt for leverandører.`)}
    ${body('Leverandører kan nu se udbuddet og indsende tilbud inden fristen.')}
    ${ctaButton('Se udbuddet', tenderUrl)}
  `)
  const text = `Nyt udbud publiceret\n\nUdbuddet "${tenderTitle}" er nu publiceret.\n\nSe udbuddet: ${tenderUrl}`
  return { html, text }
}

export function questionReceivedTemplate(tenderTitle: string, tenderUrl: string): { html: string; text: string } {
  const html = layout(`
    ${heading('Nyt spørgsmål til dit udbud')}
    ${body(`En leverandør har stillet et spørgsmål til udbuddet <strong>${tenderTitle}</strong>.`)}
    ${body('Log ind for at se spørgsmålet og afgive et svar. Publicerede svar er synlige for alle leverandører.')}
    ${ctaButton('Se spørgsmål', tenderUrl)}
  `)
  const text = `Nyt spørgsmål til udbuddet "${tenderTitle}".\n\nSe og besvar spørgsmålet: ${tenderUrl}`
  return { html, text }
}

export function answerPublishedTemplate(tenderTitle: string, tenderUrl: string): { html: string; text: string } {
  const html = layout(`
    ${heading('Svar på dit spørgsmål')}
    ${body(`Der er publiceret et svar på dit spørgsmål om udbuddet <strong>${tenderTitle}</strong>.`)}
    ${body('Du kan se svaret ved at klikke på knappen nedenfor.')}
    ${ctaButton('Se svaret', tenderUrl)}
  `)
  const text = `Svar publiceret for udbuddet "${tenderTitle}".\n\nSe svaret: ${tenderUrl}`
  return { html, text }
}

export function deadlineReminderTemplate(
  tenderTitle: string,
  tenderUrl: string,
  deadline: string,
): { html: string; text: string } {
  const html = layout(`
    ${heading('Påmindelse: Tilbudsfrist nærmer sig')}
    ${body(`Fristen for udbuddet <strong>${tenderTitle}</strong> udløber <strong>${deadline}</strong>.`)}
    ${body('Sørg for at dit tilbud er indsendt inden fristen. Tilbud modtaget efter fristen vil ikke blive behandlet.')}
    ${ctaButton('Se udbuddet', tenderUrl)}
  `)
  const text = `Påmindelse: Fristen for "${tenderTitle}" udløber ${deadline}.\n\nSe udbuddet: ${tenderUrl}`
  return { html, text }
}

export function applicationReceivedTemplate(
  tenderTitle: string,
  tenderUrl: string,
  applicantName: string,
): { html: string; text: string } {
  const html = layout(`
    ${heading('Ny ansøgning modtaget')}
    ${body(`<strong>${applicantName}</strong> har indsendt en ansøgning til udbuddet <strong>${tenderTitle}</strong>.`)}
    ${body('Log ind på portalen for at se og evaluere ansøgningen.')}
    ${ctaButton('Se ansøgninger', tenderUrl)}
  `)
  const text = `Ny ansøgning fra "${applicantName}" til udbuddet "${tenderTitle}".\n\nSe ansøgninger: ${tenderUrl}`
  return { html, text }
}
