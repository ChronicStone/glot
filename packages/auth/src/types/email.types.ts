export type SendMagicLinkEmail = (input: { to: string; targetUrl: string }) => Promise<void>
