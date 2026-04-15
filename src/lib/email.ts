import { Resend } from 'resend'
import { env } from '@/config/env'
import {
  tenderPublishedTemplate,
  questionReceivedTemplate,
  answerPublishedTemplate,
  deadlineReminderTemplate,
  applicationReceivedTemplate,
} from './email-templates'

const isDevelopment = process.env.NODE_ENV === 'development'

// Lazy-initialise — avoids throwing at module load time when key is absent
function getResend(): Resend {
  if (!env.email.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  return new Resend(env.email.resendApiKey)
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

// ── Core send function ────────────────────────────────────────────────────────

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (isDevelopment) {
    console.log('[email] DEV — would send email:', {
      to: params.to,
      subject: params.subject,
      text: params.text ?? '(html only)',
    })
    return
  }

  try {
    const resend = getResend()
    const { error } = await resend.emails.send({
      from: env.email.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
    })

    if (error) {
      console.error('[email] Resend error:', error)
    }
  } catch (err) {
    // Silent failure — email is non-critical; never crash the caller
    console.error('[email] Failed to send email to', params.to, err)
  }
}

// ── Notification helpers ──────────────────────────────────────────────────────

export async function sendTenderPublishedNotification(
  tenderTitle: string,
  recipientEmail: string,
  tenderId?: string,
): Promise<void> {
  const tenderUrl = tenderId
    ? `${env.app.baseUrl}/tenders/${tenderId}`
    : `${env.app.baseUrl}/tenders`

  const { html, text } = tenderPublishedTemplate(tenderTitle, tenderUrl)
  await sendEmail({
    to: recipientEmail,
    subject: `Udbud publiceret: ${tenderTitle}`,
    html,
    text,
  })
}

export async function sendQuestionReceivedNotification(
  tenderTitle: string,
  buyerEmail: string,
  tenderId?: string,
): Promise<void> {
  const tenderUrl = tenderId
    ? `${env.app.baseUrl}/tenders/${tenderId}/manage`
    : `${env.app.baseUrl}/buyer`

  const { html, text } = questionReceivedTemplate(tenderTitle, tenderUrl)
  await sendEmail({
    to: buyerEmail,
    subject: `Nyt spørgsmål: ${tenderTitle}`,
    html,
    text,
  })
}

export async function sendAnswerPublishedNotification(
  tenderTitle: string,
  askerEmail: string,
  tenderId?: string,
): Promise<void> {
  const tenderUrl = tenderId
    ? `${env.app.baseUrl}/tenders/${tenderId}`
    : `${env.app.baseUrl}/tenders`

  const { html, text } = answerPublishedTemplate(tenderTitle, tenderUrl)
  await sendEmail({
    to: askerEmail,
    subject: `Svar publiceret: ${tenderTitle}`,
    html,
    text,
  })
}

export async function sendDeadlineReminderNotification(
  tenderTitle: string,
  recipientEmail: string,
  deadline: string,
  tenderId?: string,
): Promise<void> {
  const tenderUrl = tenderId
    ? `${env.app.baseUrl}/tenders/${tenderId}`
    : `${env.app.baseUrl}/tenders`

  const { html, text } = deadlineReminderTemplate(tenderTitle, tenderUrl, deadline)
  await sendEmail({
    to: recipientEmail,
    subject: `Påmindelse om frist: ${tenderTitle}`,
    html,
    text,
  })
}

export async function sendApplicationReceivedNotification(
  tenderTitle: string,
  buyerEmail: string,
  applicantName: string,
  tenderId?: string,
): Promise<void> {
  const tenderUrl = tenderId
    ? `${env.app.baseUrl}/tenders/${tenderId}/bids`
    : `${env.app.baseUrl}/buyer`

  const { html, text } = applicationReceivedTemplate(tenderTitle, tenderUrl, applicantName)
  await sendEmail({
    to: buyerEmail,
    subject: `Ny ansøgning modtaget: ${tenderTitle}`,
    html,
    text,
  })
}
