import { createTransport } from 'nodemailer'
import { MAGIC_LINK_EXPIRES_IN_SECONDS } from '../constants/auth.constants.ts'
import type { SendMagicLinkEmail, SmtpMailOptions } from '../types/email.types.ts'

const SECONDS_PER_MINUTE = 60

export function createSmtpMagicLinkSender(options: SmtpMailOptions): SendMagicLinkEmail {
  const transport = createTransport(options.url)
  const minutes = MAGIC_LINK_EXPIRES_IN_SECONDS / SECONDS_PER_MINUTE

  return async ({ to, targetUrl }) => {
    await transport.sendMail({
      from: options.from,
      to,
      subject: 'Sign in to Glot',
      text: `Open this link to sign in to Glot:\n\n${targetUrl}\n\nIt works once and expires in ${minutes} minutes.`,
    })
  }
}
