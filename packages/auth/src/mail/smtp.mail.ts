import { createTransport } from 'nodemailer'
import { MAGIC_LINK_EXPIRES_IN_SECONDS } from '../constants/auth.constants.ts'
import type { SendMagicLinkEmail, SendMail, SmtpMailOptions } from '../types/email.types.ts'

const SECONDS_PER_MINUTE = 60

export function createSmtpMailer(options: SmtpMailOptions): SendMail {
  const transport = createTransport(options.url)

  return async (message) => {
    await transport.sendMail({ from: options.from, ...message })
  }
}

export function createSmtpMagicLinkSender(options: SmtpMailOptions): SendMagicLinkEmail {
  const send = createSmtpMailer(options)
  const minutes = MAGIC_LINK_EXPIRES_IN_SECONDS / SECONDS_PER_MINUTE

  return ({ to, targetUrl }) =>
    send({
      to,
      subject: 'Sign in to Glot',
      text: `Open this link to sign in to Glot:\n\n${targetUrl}\n\nIt works once and expires in ${minutes} minutes.`,
    })
}
