import { createGlotAuthClient } from '@glot/auth/client'

export default defineNuxtPlugin(() => ({
  provide: { auth: createGlotAuthClient({ baseURL: useRequestURL().origin }) },
}))
