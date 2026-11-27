import { createSmtpMailer } from '@glot/auth'
import { env } from '../env.ts'

export const mailOptions =
  env.SMTP_URL && env.MAIL_FROM ? { url: env.SMTP_URL, from: env.MAIL_FROM } : undefined

export const mailer = mailOptions ? createSmtpMailer(mailOptions) : undefined
