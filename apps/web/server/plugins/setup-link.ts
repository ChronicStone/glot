import { auth } from '../config/auth.config.ts'

export default defineNitroPlugin(async () => {
  const link = await auth.api.issueSetupLink()

  if (link) {
    console.warn(`Open this link to create the first administrator: ${link.url}`)
  }
})
