export type SendMagicLinkEmail = (input: { to: string; targetUrl: string }) => Promise<void>

export interface SmtpMailOptions {
  url: string
  from: string
}
