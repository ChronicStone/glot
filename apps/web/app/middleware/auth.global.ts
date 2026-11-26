export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/sign-in') {
    return
  }

  const { data } = await useNuxtApp().$auth.getSession()

  if (!data) {
    return navigateTo('/sign-in')
  }
})
