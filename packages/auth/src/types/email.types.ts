export type SendMagicLinkEmail = (input: { to: string; targetUrl: string }) => Promise<void>

export interface SmtpMailOptions {
  url: string
  from: string
}

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

export type SendMail = (message: MailMessage) => Promise<void>
