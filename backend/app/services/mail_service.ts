import { Resend } from 'resend'
import env from '#start/env'

const resend = new Resend(env.get('RESEND_API_KEY'))

export interface SendMailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  text?: string
}

export async function sendMail(options: SendMailOptions) {
  const from = options.from ?? env.get('MAIL_FROM', 'Tracify <noreply@tracify.app>')

  const { data, error } = await resend.emails.send({
    from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
  })

  if (error) {
    throw new Error(`Mail send failed: ${error.message}`)
  }

  return data
}
