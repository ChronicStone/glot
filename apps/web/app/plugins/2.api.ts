import { createGlotClient } from '@glot/sdk'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

export default defineNuxtPlugin(() => {
  const client = createGlotClient({ url: useRequestURL().origin })

  return { provide: { api: createTanstackQueryUtils(client) } }
})
